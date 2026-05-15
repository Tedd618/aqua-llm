/**
 * Popup Controller
 *
 * - Tank scene + bowl rendering
 * - Alto-style full-screen blur achievements
 * - Collection overlay with fish/tank grids
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
    // Dev mode — Tier 1 Glass Bowl demo
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

  const unlockedSet = new Set(state.unlockedFishIds);
  const unlockedFish = state.unlockedFishIds
    .map((id) => TankConfig.fish.find((f) => f.id === id))
    .filter(Boolean);

  const tier = TankConfig.getTier(state.totalMl);
  const nextTier = TankConfig.getNextTier(state.totalMl);

  // ── Water label ─────────────────────────────────────────────
  document.getElementById("waterCurrent").textContent = fmtWater(state.totalMl);
  document.getElementById("waterTarget").textContent = nextTier ? fmtWater(nextTier.thresholdMl) : "MAX";

  // ── Container image + water clip (both change per tier) ────
  document.getElementById("containerImg").src = `../assets/tanks/${tier.sprite}`;
  document.getElementById("bowlSvg").style.clipPath = tier.waterClip;

  // ── Render tank ─────────────────────────────────────────────
  TankRenderer.render({ totalMl: state.totalMl, unlockedFish });

  // ── Achievements (Alto style) ───────────────────────────────
  buildAchievements();

  // ── Collection ──────────────────────────────────────────────
  buildCollection("fish");

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

  // Click overlay backdrop to close (but not inner content)
  achOverlay.addEventListener("click", (e) => {
    if (e.target === achOverlay) achOverlay.classList.remove("active");
  });
  colOverlay.addEventListener("click", (e) => {
    if (e.target === colOverlay) colOverlay.classList.remove("active");
  });

  // Prevent inner content clicks from closing
  document.querySelectorAll(".overlay-content, .overlay-collection-inner").forEach((el) => {
    el.addEventListener("click", (e) => e.stopPropagation());
  });

  // Tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      buildCollection(tab.dataset.tab);
    });
  });

  // ── Build achievements ──────────────────────────────────────

  function buildAchievements() {
    // Alto-style: specific, descriptive goals — show 3 at a time
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

    // Find the current window of 3: show from the first incomplete goal
    const firstLocked = goals.findIndex((g) => !g.done);
    let windowStart;
    if (firstLocked === -1) {
      // All done — show last 3
      windowStart = goals.length - 3;
    } else if (firstLocked === 0) {
      windowStart = 0;
    } else {
      // Show 1 done + 2 upcoming (so you see your last win + next challenges)
      windowStart = Math.max(0, firstLocked - 1);
    }
    const visible = goals.slice(windowStart, windowStart + 3);

    const doneCount = goals.filter((g) => g.done).length;
    const starCount = Math.min(3, Math.floor((doneCount / goals.length) * 3.99));

    let html = '<div class="ach-goals">';
    for (const g of visible) {
      html += `<div class="ach-goal ${g.done ? "done" : "locked"}">
        <div class="ach-goal-text">${g.text}</div>
      </div>`;
    }
    html += "</div>";

    // Footer: stars + level + medal
    html += '<div class="ach-footer">';
    html += '<div class="ach-stars">';
    for (let i = 0; i < 3; i++) {
      html += `<span class="ach-star ${i < starCount ? "filled" : ""}">★</span>`;
    }
    html += "</div>";
    html += `<div class="ach-level">Level ${tier.level}</div>`;
    html += "</div>";

    document.getElementById("achievementContent").innerHTML = html;
  }

  // ── Build collection ────────────────────────────────────────

  function buildCollection(tab) {
    const grid = document.getElementById("collectionGrid");
    grid.classList.toggle("grid-fish", tab === "fish");

    if (tab === "fish") {
      grid.innerHTML = TankConfig.fish
        .map((f) => {
          const unlocked = unlockedSet.has(f.id);
          return `
          <div class="collection-item ${unlocked ? "unlocked" : "locked"}">
            <div class="collection-icon">${fishSVG(f, unlocked)}</div>
            <div class="collection-name">${unlocked ? f.name : "???"}</div>
          </div>`;
        })
        .join("");
    } else {
      grid.innerHTML = TankConfig.tiers
        .map((t) => {
          const unlocked = state.totalMl >= t.thresholdMl;
          return `
          <div class="collection-item ${unlocked ? "unlocked" : "locked"}">
            <div class="collection-icon">${tankSVG(t, unlocked)}</div>
            <div class="collection-name">${unlocked ? t.name : "???"}</div>
          </div>`;
        })
        .join("");
    }
  }

  function fishSVG(fish, unlocked) {
    return `<img src="../assets/fish/${fish.sprite}"
      class="sprite-icon${unlocked ? "" : " sprite-locked"}"
      draggable="false" alt="${fish.name}">`;
  }

  function tankSVG(tier, unlocked) {
    return `<img src="../assets/tanks/${tier.sprite}"
      class="sprite-icon${unlocked ? "" : " sprite-locked"}"
      draggable="false" alt="${tier.name}">`;
  }

  function fmtWater(ml) {
    if (ml < 1000) return `${Math.round(ml)} mL`;
    return `${(ml / 1000).toFixed(1)} L`;
  }
})();
