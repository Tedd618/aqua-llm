/**
 * Background Service Worker
 *
 * Receives water-usage messages from content scripts, updates storage,
 * and checks milestone/fish unlocks.
 */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "WATER_USAGE") {
    handleWaterUsage(msg.payload).then(sendResponse);
    return true; // async response
  }
  if (msg.type === "GET_STATE") {
    getState().then(sendResponse);
    return true;
  }
});

async function getState() {
  return chrome.storage.local.get(null);
}

async function handleWaterUsage({ ml, source, model, isThinking }) {
  const now = new Date();
  const todayStr = now.toDateString();
  const hour = now.getHours();

  const state = await chrome.storage.local.get({
    totalMl: 0,
    todayMl: 0,
    todayDate: todayStr,
    queryCount: 0,
    streak: 0,
    lastActiveDate: null,
    unlockedFishIds: ["guppy"],
    recentActivity: [],
    platformsUsed: [],
    reasoningCount: 0,
    nightQueries: 0,
    todayQueries: 0,
  });

  // Reset daily counters if new day
  if (state.todayDate !== todayStr) {
    // Update streak
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (state.lastActiveDate === yesterday.toDateString()) {
      state.streak += 1;
    } else if (state.lastActiveDate !== todayStr) {
      state.streak = 1;
    }

    state.todayMl = 0;
    state.todayDate = todayStr;
    state.todayQueries = 0;
    state.nightQueries = 0;
  }

  // Update counters
  state.totalMl += ml;
  state.todayMl += ml;
  state.queryCount += 1;
  state.todayQueries += 1;
  state.lastActiveDate = todayStr;

  if (isThinking) {
    state.reasoningCount = (state.reasoningCount || 0) + 1;
  }

  // Night owl tracking (midnight - 5am)
  if (hour >= 0 && hour < 5) {
    state.nightQueries += 1;
  }

  // Platform tracking
  if (source && !state.platformsUsed.includes(source)) {
    state.platformsUsed = [...state.platformsUsed, source];
  }

  // Recent activity (keep last 10)
  state.recentActivity = [
    { source, ml: Math.round(ml * 100) / 100, time: now.toISOString(), model },
    ...(state.recentActivity || []).slice(0, 9),
  ];

  // ── Check fish unlocks ──────────────────────────────────────
  const unlocked = new Set(state.unlockedFishIds);
  const checks = {
    default: true,
    tier2: state.totalMl >= 500,
    tier3: state.totalMl >= 2000,
    tier4: state.totalMl >= 5000,
    tier6: state.totalMl >= 18000,
    tier8: state.totalMl >= 45000,
    tier10: state.totalMl >= 90000,
    streak3: state.streak >= 3,
    streak14: state.streak >= 14,
    streak30: state.streak >= 30,
    queries50day: state.todayQueries >= 50,
    multiplatform: state.platformsUsed.length >= 3,
    water1L: state.totalMl >= 1000,
    water50L: state.totalMl >= 50000,
    nightowl: state.nightQueries >= 10,
    reasoning10: state.reasoningCount >= 10,
  };

  // Find all fish from TankConfig whose unlock condition is met
  // (We import TankConfig via importScripts since service workers can't use ES modules easily)
  const allFish = [
    { id: "guppy", unlock: "default" },
    { id: "tetra", unlock: "tier2" },
    { id: "clownfish", unlock: "streak3" },
    { id: "betta", unlock: "tier3" },
    { id: "angelfish", unlock: "queries50day" },
    { id: "tang", unlock: "tier4" },
    { id: "seahorse", unlock: "multiplatform" },
    { id: "pufferfish", unlock: "water1L" },
    { id: "lionfish", unlock: "tier6" },
    { id: "moorishidol", unlock: "streak14" },
    { id: "mantaray", unlock: "tier8" },
    { id: "jellyfish", unlock: "nightowl" },
    { id: "octopus", unlock: "reasoning10" },
    { id: "whale", unlock: "tier10" },
    { id: "anglerfish", unlock: "water50L" },
    { id: "turtle", unlock: "streak30" },
  ];

  let newUnlock = null;
  for (const fish of allFish) {
    if (!unlocked.has(fish.id) && checks[fish.unlock]) {
      unlocked.add(fish.id);
      newUnlock = fish.id;
    }
  }

  state.unlockedFishIds = Array.from(unlocked);

  // Save
  await chrome.storage.local.set(state);

  return { success: true, newUnlock, totalMl: state.totalMl };
}
