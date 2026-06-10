/**
 * Popup Controller
 *
 * - 3D Liquid Glass bowl (Bowl3D)
 * - Alto-style achievements overlay
 * - Fish collection overlay
 */

(async function () {
  // ── State ───────────────────────────────────────────────────
  const defaults = {
    totalMl: 0, todayMl: 0, todayDate: new Date().toDateString(),
    queryCount: 0, streak: 0, lastActiveDate: null,
    unlockedFishIds: ["guppy"], recentActivity: [],
    platformsUsed: [], reasoningCount: 0, nightQueries: 0, todayQueries: 0,
  };

  let state;
  try {
    const stored = await chrome.storage.local.get(Object.keys(defaults));
    state = { ...defaults, ...stored };
  } catch (_e) {
    // Dev mode
    state = {
      ...defaults,
      totalMl: 300,
      todayMl: 80,
      queryCount: 12,
      streak: 2,
      unlockedFishIds: ["guppy", "sardine", "clownfish"],
    };
  }

  if (state.todayDate !== new Date().toDateString()) {
    state.todayMl = 0;
    state.todayDate = new Date().toDateString();
  }

  const unlockedSet  = new Set(state.unlockedFishIds);
  const unlockedFish = state.unlockedFishIds
    .map((id) => TankConfig.fish.find((f) => f.id === id))
    .filter(Boolean);

  const tier     = TankConfig.getTier(state.totalMl);
  const nextTier = TankConfig.getNextTier(state.totalMl);

  // ── Water label ─────────────────────────────────────────────
  document.getElementById("waterCurrent").textContent = fmtWater(state.totalMl);
  document.getElementById("waterTarget").textContent  = nextTier ? fmtWater(nextTier.thresholdMl) : "MAX";

  // ── 3D Bowl ─────────────────────────────────────────────────
  // Wait for the module script to expose THREE, then init the bowl
  function initBowl() {
    const THREE = window.__THREE__;
    if (!THREE) { setTimeout(initBowl, 50); return; }
    const canvas = document.getElementById("bowlCanvas");
    Bowl3D.init(canvas, THREE, { totalMl: state.totalMl, unlockedFish });
  }
  initBowl();

  // ── Achievements ────────────────────────────────────────────
  buildAchievements();

  // ── Collection ──────────────────────────────────────────────
  buildCollection();

  // ── Events ──────────────────────────────────────────────────
  const achOverlay = document.getElementById("overlayAchievements");
  const colOverlay = document.getElementById("overlayCollection");

  document.getElementById("btnMenu").addEventListener("click", (e) => {
    e.stopPropagation();
    achOverlay.classList.toggle("active");
    colOverlay.classList.remove("active");
  });

  document.getElementById("btnFish").addEventListener("click", (e) => {
    e.stopPropagation();
    colOverlay.classList.toggle("active");
    achOverlay.classList.remove("active");
  });

  achOverlay.addEventListener("click", (e) => {
    if (e.target === achOverlay) achOverlay.classList.remove("active");
  });
  colOverlay.addEventListener("click", (e) => {
    if (e.target === colOverlay) colOverlay.classList.remove("active");
  });

  document.querySelectorAll(".overlay-content, .overlay-collection-inner").forEach((el) => {
    el.addEventListener("click", (e) => e.stopPropagation());
  });

  // ── Build achievements ──────────────────────────────────────
  function buildAchievements() {
    const goals = [
      { text: "Send your first prompt to any AI",    done: state.queryCount > 0 },
      { text: "Fill a shot glass of cooling water",  done: state.totalMl >= 8 },
      { text: "Pour a full wine glass",              done: state.totalMl >= 50 },
      { text: "Fill the fish bowl",                  done: state.totalMl >= 250 },
      { text: "Use AI for 3 days in a row",          done: state.streak >= 3 },
      { text: "Accumulate 1 liter in your tank",     done: state.totalMl >= 1000 },
      { text: "Fill a mason jar",                    done: state.totalMl >= 2800 },
      { text: "Send 50 prompts in a single day",     done: (state.todayQueries || 0) >= 50 },
      { text: "Fill the bathtub",                    done: state.totalMl >= 6000 },
      { text: "Chat across 3 different platforms",   done: state.platformsUsed.length >= 3 },
      { text: "Use a reasoning model 10 times",      done: (state.reasoningCount || 0) >= 10 },
      { text: "Fill the water tower",                done: state.totalMl >= 16000 },
      { text: "Keep a 14-day streak alive",          done: state.streak >= 14 },
      { text: "Fill the backyard pool",              done: state.totalMl >= 32000 },
      { text: "Query AI between midnight and 5 AM",  done: (state.nightQueries || 0) >= 10 },
      { text: "Dive into the submarine tier",        done: state.totalMl >= 65000 },
      { text: "Maintain a 30-day streak",            done: state.streak >= 30 },
      { text: "Fill an Olympic pool",                done: state.totalMl >= 140000 },
      { text: "Fill the Stadium",                    done: state.totalMl >= 300000 },
    ];

    const firstLocked = goals.findIndex((g) => !g.done);
    let windowStart = firstLocked === -1 ? goals.length - 3
                    : firstLocked === 0  ? 0
                    : Math.max(0, firstLocked - 1);
    const visible   = goals.slice(windowStart, windowStart + 3);
    const doneCount = goals.filter((g) => g.done).length;
    const starCount = Math.min(3, Math.floor((doneCount / goals.length) * 3.99));

    let html = '<div class="ach-goals">';
    for (const g of visible) {
      html += `<div class="ach-goal ${g.done ? "done" : "locked"}">
        <div class="ach-goal-text">${g.text}</div>
      </div>`;
    }
    html += '</div><div class="ach-footer"><div class="ach-stars">';
    for (let i = 0; i < 3; i++)
      html += `<span class="ach-star ${i < starCount ? "filled" : ""}">★</span>`;
    html += `</div><div class="ach-level">Level ${tier.level}</div></div>`;
    document.getElementById("achievementContent").innerHTML = html;
  }

  // ── Build fish collection (no tanks tab) ────────────────────
  function buildCollection() {
    const grid = document.getElementById("collectionGrid");
    grid.innerHTML = TankConfig.fish
      .map((f) => {
        const unlocked = unlockedSet.has(f.id);
        return `<div class="collection-item ${unlocked ? "unlocked" : "locked"}">
          <div class="collection-icon"><img src="../assets/fish/${f.sprite}"
            class="sprite-icon${unlocked ? "" : " sprite-locked"}"
            draggable="false" alt="${f.name}"></div>
          <div class="collection-name">${unlocked ? f.name : "???"}</div>
        </div>`;
      })
      .join("");
  }

  function fmtWater(ml) {
    if (ml < 1000) return `${Math.round(ml)} mL`;
    return `${(ml / 1000).toFixed(1)} L`;
  }
})();
