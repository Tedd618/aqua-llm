/**
 * Tank Progression Configuration
 *
 * Container-based progression: humble thimble → stadium.
 * Based on an average user doing ~30 queries/day at ~5 mL each = ~150 mL/day.
 *
 * Tier timing (average user):
 *   Tier 1  → 2:  ~1 prompt    (instant hook)
 *   Tier 2  → 3:  ~30 min
 *   Tier 3  → 4:  ~half day
 *   Tier 4  → 5:  ~2 days
 *   Tier 5  → 6:  ~4 days
 *   Tier 6  → 7:  ~1 week
 *   Tier 7  → 8:  ~3 weeks
 *   Tier 8  → 9:  ~6 weeks
 *   Tier 9  → 10: ~2 months
 *   Tier 10 → 11: ~5 months
 *   Tier 11 → 12: ~1 year
 */

const TankConfig = {
  tiers: [
    {
      level: 1,
      name: "Spoon",
      sprite: "spoon.png",
      // small oval bowl at the left end of the spoon
      waterClip: "ellipse(13% 9% at 20% 50%)",
      thresholdMl: 0,
      maxFish: 1,
      decorations: ["sand"],
      description: "It starts with a spoon. One small fish, one small ripple.",
    },
    {
      level: 2,
      name: "Shot Glass",
      sprite: "shot_glass.png",
      // trapezoid: wide at top, slightly narrower at bottom
      waterClip: "polygon(26% 14%, 74% 14%, 69% 80%, 31% 80%)",
      thresholdMl: 8,
      maxFish: 2,
      decorations: ["sand", "pebbles"],
      description: "Already more than nothing. Room for a friend.",
    },
    {
      level: 3,
      name: "Wine Glass",
      sprite: "wine_glass.png",
      // oval cup portion only (ignore stem + base)
      waterClip: "ellipse(31% 24% at 50% 35%)",
      thresholdMl: 50,
      maxFish: 3,
      decorations: ["sand", "pebbles", "plant-small"],
      description: "Elegant and surprising. A stem worth raising.",
    },
    {
      level: 4,
      name: "Fish Bowl",
      sprite: "round_fish_tank.png",
      // near-circle bowl interior
      waterClip: "ellipse(32% 38% at 50% 47%)",
      thresholdMl: 250,
      maxFish: 5,
      decorations: ["sand", "pebbles", "plant-small", "rock"],
      description: "The classic. Round, clear, alive.",
    },
    {
      level: 5,
      name: "Rectangular Tank",
      sprite: "rectangle_fish_tank.png",
      // flat rectangle interior (lid at top, slight inset)
      waterClip: "inset(22% 7% 14% 7%)",
      thresholdMl: 1200,
      maxFish: 7,
      decorations: ["sand", "pebbles", "plant-small", "coral-small", "rock"],
      description: "A proper aquarium now. Light rays dance through the glass.",
    },
    {
      level: 6,
      name: "Bathtub",
      sprite: "bathtub.png",
      // wide low tub interior (tub sits in upper-middle portion of image)
      waterClip: "polygon(8% 22%, 92% 22%, 90% 54%, 10% 54%)",
      thresholdMl: 5000,
      maxFish: 10,
      decorations: ["sand", "pebbles", "plant-small", "plant-tall", "coral-small", "coral-fan", "rock", "anemone"],
      description: "Unconventional. But there's something freeing about it.",
    },
    {
      level: 7,
      name: "Water Tank",
      sprite: "watertank.png",
      // round tank body (legs below are not fillable)
      waterClip: "ellipse(34% 27% at 50% 36%)",
      thresholdMl: 15000,
      maxFish: 13,
      decorations: ["sand", "pebbles", "plant-small", "plant-tall", "coral-small", "coral-fan", "coral-branch", "rock", "anemone", "shell"],
      description: "Elevated. The whole neighborhood can see your tank now.",
    },
    {
      level: 8,
      name: "Pool",
      sprite: "pool.png",
      // rectangular pool interior (ladder on left is decorative)
      waterClip: "polygon(14% 30%, 93% 30%, 93% 70%, 14% 70%)",
      thresholdMl: 32000,
      maxFish: 16,
      decorations: ["sand", "pebbles", "plant-small", "plant-tall", "coral-small", "coral-fan", "coral-branch", "rock", "anemone", "shell"],
      description: "Summer vibes. The neighbors are jealous.",
    },
    {
      level: 9,
      name: "Submarine",
      sprite: "submarine.png",
      // horizontal pill-shaped hull interior
      waterClip: "ellipse(42% 18% at 50% 53%)",
      thresholdMl: 65000,
      maxFish: 19,
      decorations: ["sand", "pebbles", "plant-small", "plant-tall", "coral-small", "coral-fan", "coral-branch", "rock", "anemone", "shell", "vent"],
      description: "Dive deeper. Bioluminescence flickers in the dark.",
    },
    {
      level: 10,
      name: "Olympic Pool",
      sprite: "poolWithdiving.png",
      // wide rectangle, diving board is outside the water area
      waterClip: "polygon(5% 42%, 84% 42%, 84% 72%, 5% 72%)",
      thresholdMl: 140000,
      maxFish: 23,
      decorations: ["sand", "pebbles", "plant-small", "plant-tall", "coral-small", "coral-fan", "coral-branch", "rock", "anemone", "shell", "vent", "crystal"],
      description: "Olympic-grade. You could race in here.",
    },
    {
      level: 11,
      name: "Tower of Pisa",
      sprite: "pisa.png",
      // tower interior, slightly leaning (left edge offset)
      waterClip: "polygon(24% 11%, 71% 11%, 73% 87%, 22% 87%)",
      thresholdMl: 300000,
      maxFish: 29,
      decorations: ["sand", "pebbles", "plant-small", "plant-tall", "coral-small", "coral-fan", "coral-branch", "rock", "anemone", "shell", "vent", "crystal", "whale-bg"],
      description: "It leans. But it holds. You built this, one prompt at a time.",
    },
  ],

  /**
   * Fish species unlockable via milestones.
   * Each has a condition described in plain English + a check function key.
   */
  fish: [
    // ── Tier unlocks ─────────────────────────────────────────
    { id: "guppy",         name: "Guppy",          sprite: "guppy.png",         size: "small",  unlock: "default",       description: "Your first companion." },
    { id: "sardine",       name: "Sardine",         sprite: "sardine.png",       size: "small",  unlock: "tier2",         description: "Unlocked at Shot Glass." },
    { id: "butterflyfish", name: "Butterflyfish",   sprite: "butterflyfish.png", size: "small",  unlock: "tier3",         description: "Unlocked at Wine Glass." },
    { id: "spotted_fish",  name: "Spotted Fish",    sprite: "spotted_fish.png",  size: "small",  unlock: "tier4",         description: "Unlocked at Fish Bowl." },
    { id: "betta",         name: "Betta",           sprite: "betta_fish.png",    size: "medium", unlock: "tier5",         description: "Unlocked at Rectangular Tank." },
    { id: "grouper",       name: "Grouper",         sprite: "grouper.png",       size: "medium", unlock: "tier6",         description: "Unlocked at Bathtub." },
    { id: "tang",          name: "Blue Tang",       sprite: "tang_blue.png",     size: "medium", unlock: "tier7",         description: "Unlocked at Water Tank." },
    { id: "shark",         name: "Shark",           sprite: "shark.png",         size: "large",  unlock: "tier8",         description: "Unlocked at Pool." },
    { id: "anglerfish",    name: "Anglerfish",      sprite: "anglerfish.png",    size: "large",  unlock: "tier9",         description: "Unlocked at Submarine." },
    { id: "narwhal",       name: "Narwhal",         sprite: "narwhal.png",       size: "large",  unlock: "tier10",        description: "Unlocked at Olympic Pool." },
    { id: "whale",         name: "Whale",           sprite: "whale.png",         size: "huge",   unlock: "tier11",        description: "Unlocked at Tower of Pisa." },
    // ── Streak unlocks ───────────────────────────────────────
    { id: "clownfish",     name: "Clownfish",       sprite: "clownfish.png",     size: "small",  unlock: "streak3",       description: "Use AI 3 days in a row." },
    { id: "dolphin",       name: "Dolphin",         sprite: "dolphin.png",       size: "large",  unlock: "streak7",       description: "Use AI 7 days in a row." },
    { id: "turtle",        name: "Sea Turtle",      sprite: "turtle.png",        size: "large",  unlock: "streak14",      description: "Use AI 14 days in a row." },
    { id: "seahorse",      name: "Seahorse",        sprite: "seahorse.png",      size: "small",  unlock: "streak30",      description: "Use AI 30 days in a row." },
    { id: "seal",          name: "Seal",            sprite: "seal.png",          size: "large",  unlock: "streak60",      description: "Use AI 60 days in a row." },
    // ── Water milestones ─────────────────────────────────────
    { id: "pufferfish",    name: "Pufferfish",      sprite: "pufferfish.png",    size: "medium", unlock: "water1L",       description: "Accumulate 1L of water." },
    { id: "lionfish",      name: "Lionfish",        sprite: "lionfish.png",      size: "medium", unlock: "water5L",       description: "Accumulate 5L of water." },
    { id: "stingray",      name: "Stingray",        sprite: "stingray.png",      size: "large",  unlock: "water10L",      description: "Accumulate 10L of water." },
    { id: "electric_ray",  name: "Electric Ray",    sprite: "electric_ray.png",  size: "large",  unlock: "water25L",      description: "Accumulate 25L of water." },
    { id: "hammerhead",    name: "Hammerhead",      sprite: "hammerhead_shark.png", size: "large", unlock: "water100L",   description: "Accumulate 100L of water." },
    // ── Query milestones ─────────────────────────────────────
    { id: "angelfish",     name: "Angelfish",       sprite: "angelfish.png",     size: "medium", unlock: "queries50day",  description: "Send 50+ prompts in one day." },
    { id: "lobster",       name: "Lobster",         sprite: "lobster.png",       size: "medium", unlock: "queries100day", description: "Send 100+ prompts in one day." },
    { id: "crab",          name: "Crab",            sprite: "crab.png",          size: "medium", unlock: "queries1000",   description: "Send 1,000 prompts total." },
    // ── Night / dark behavior ────────────────────────────────
    { id: "jellyfish",     name: "Jellyfish",       sprite: "jellyfish.png",     size: "medium", unlock: "nightowl10",    description: "Query AI 10× between midnight–5am." },
    { id: "octopus",       name: "Octopus",         sprite: "octopus.png",       size: "large",  unlock: "nightowl30",    description: "Query AI 30× between midnight–5am." },
    // ── Reasoning unlocks ────────────────────────────────────
    { id: "starfish",      name: "Starfish",        sprite: "starfish.png",      size: "medium", unlock: "reasoning10",   description: "Use reasoning models 10 times." },
    { id: "nautilus",      name: "Nautilus",        sprite: "nautilus.png",      size: "medium", unlock: "reasoning30",   description: "Use reasoning models 30 times." },
    // ── Multi-platform ───────────────────────────────────────
    { id: "squid",         name: "Squid",           sprite: "squid.png",         size: "medium", unlock: "multiplatform4",description: "Use all 4 AI platforms." },
  ],

  /**
   * Get the current tier based on total water in mL.
   */
  getTier(totalMl) {
    let current = this.tiers[0];
    for (const tier of this.tiers) {
      if (totalMl >= tier.thresholdMl) {
        current = tier;
      } else {
        break;
      }
    }
    return current;
  },

  /**
   * Get next tier (or null if maxed).
   */
  getNextTier(totalMl) {
    const current = this.getTier(totalMl);
    const idx = this.tiers.indexOf(current);
    return idx < this.tiers.length - 1 ? this.tiers[idx + 1] : null;
  },

  /**
   * Progress percentage toward next tier (0-100).
   */
  getProgress(totalMl) {
    const current = this.getTier(totalMl);
    const next = this.getNextTier(totalMl);
    if (!next) return 100;
    const range = next.thresholdMl - current.thresholdMl;
    const progress = totalMl - current.thresholdMl;
    return Math.min(100, Math.round((progress / range) * 100));
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = TankConfig;
}
