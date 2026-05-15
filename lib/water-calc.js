/**
 * Water Calculation Engine
 *
 * Estimates water consumption (in mL) for LLM inference based on:
 *   - Model tier (size / compute intensity)
 *   - Estimated token count (input + output)
 *   - Reasoning / thinking mode multiplier
 *
 * Methodology:
 *   Based on Li et al. 2023 (UC Riverside) and Pengfei Li's follow-up work.
 *   A mid-range GPT-4 query uses roughly 3-10 mL of water for cooling.
 *   We use conservative mid-point estimates and scale by model tier.
 *
 * These numbers are NOT precise — they are educational estimates
 * designed to give users a tangible sense of scale.
 */

const WaterCalc = (() => {
  // ── Base water cost per query (mL) by model tier ──────────────────
  // "small"    = GPT-4o-mini, Claude Haiku, Gemini Flash — lightweight
  // "medium"   = GPT-4o, Claude Sonnet, Gemini Pro — standard
  // "large"    = GPT-4, Claude Opus, Gemini Ultra — heavyweight
  // "reasoning"= o1, o3, deep-thinking modes — extended compute
  const BASE_ML = {
    small: 1.5,
    medium: 5,
    large: 10,
    reasoning: 18,
  };

  // ── Token scaling ─────────────────────────────────────────────────
  // Base cost assumes ~500 tokens (short exchange).
  // Scale linearly beyond that. Each additional 500 tokens adds ~40%
  // of the base cost (cooling scales roughly with compute time).
  const BASE_TOKENS = 500;
  const TOKEN_SCALE_FACTOR = 0.4;

  // ── Model classification ──────────────────────────────────────────
  // Maps known model strings to tiers.
  const MODEL_TIERS = {
    // OpenAI
    "gpt-4o-mini": "small",
    "gpt-4o": "medium",
    "gpt-4": "large",
    "gpt-4-turbo": "large",
    "gpt-4.1": "large",
    "gpt-4.1-mini": "medium",
    "gpt-4.1-nano": "small",
    "o1-mini": "medium",
    "o1": "reasoning",
    "o1-pro": "reasoning",
    "o3": "reasoning",
    "o3-mini": "medium",
    "o4-mini": "medium",
    "o4-mini-high": "reasoning",

    // Anthropic
    "claude-3-haiku": "small",
    "claude-3.5-haiku": "small",
    "claude-3-sonnet": "medium",
    "claude-3.5-sonnet": "medium",
    "claude-3.7-sonnet": "medium",
    "claude-4-sonnet": "medium",
    "claude-3-opus": "large",
    "claude-4-opus": "large",

    // Google
    "gemini-flash": "small",
    "gemini-pro": "medium",
    "gemini-ultra": "large",
    "gemini-2.0-flash": "small",
    "gemini-2.5-pro": "medium",
    "gemini-2.5-flash": "small",

    // Microsoft Copilot (underlying model varies, estimate medium)
    copilot: "medium",
  };

  /**
   * Classify a model string into a tier.
   * Falls back to heuristic matching, then defaults to "medium".
   */
  function classifyModel(modelStr) {
    if (!modelStr) return "medium";

    const lower = modelStr.toLowerCase().trim();

    // Direct match
    if (MODEL_TIERS[lower]) return MODEL_TIERS[lower];

    // Heuristic: check for keywords
    if (/reasoning|think|o1|o3|o4|deep/i.test(lower)) return "reasoning";
    if (/opus|ultra|large/i.test(lower)) return "large";
    if (/haiku|flash|mini|nano|small|lite/i.test(lower)) return "small";
    if (/sonnet|pro|medium|turbo/i.test(lower)) return "medium";

    return "medium";
  }

  /**
   * Estimate token count from text length.
   * Rough rule: 1 token ~ 4 characters for English.
   */
  function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate estimated water usage in mL.
   *
   * @param {Object} params
   * @param {string} [params.model]       - Model name/identifier
   * @param {string} [params.tier]        - Direct tier override ("small"|"medium"|"large"|"reasoning")
   * @param {number} [params.tokens]      - Total token count (input + output)
   * @param {string} [params.inputText]   - Raw input text (used if tokens not provided)
   * @param {string} [params.outputText]  - Raw output text (used if tokens not provided)
   * @param {boolean}[params.isThinking]  - Whether thinking/reasoning mode was used
   * @returns {number} Estimated water in mL, rounded to 2 decimal places
   */
  function calculate({
    model,
    tier,
    tokens,
    inputText,
    outputText,
    isThinking = false,
  } = {}) {
    // Determine tier
    let resolvedTier = tier || classifyModel(model);

    // If thinking mode detected but tier isn't already reasoning, bump it
    if (isThinking && resolvedTier !== "reasoning") {
      resolvedTier = "reasoning";
    }

    const baseMl = BASE_ML[resolvedTier] || BASE_ML.medium;

    // Determine token count
    let totalTokens = tokens;
    if (!totalTokens) {
      const inTokens = estimateTokens(inputText);
      const outTokens = estimateTokens(outputText);
      totalTokens = inTokens + outTokens;
    }
    totalTokens = Math.max(totalTokens, BASE_TOKENS); // minimum baseline

    // Scale by token count
    const tokenMultiplier =
      1 + ((totalTokens - BASE_TOKENS) / BASE_TOKENS) * TOKEN_SCALE_FACTOR;

    const waterMl = baseMl * Math.max(tokenMultiplier, 1);

    return Math.round(waterMl * 100) / 100;
  }

  /**
   * Format water amount into a human-readable string.
   */
  function format(ml) {
    if (ml < 1000) return `${ml.toFixed(1)} mL`;
    return `${(ml / 1000).toFixed(2)} L`;
  }

  return { calculate, classify: classifyModel, estimateTokens, format, BASE_ML, MODEL_TIERS };
})();

// Make available to both content scripts and modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = WaterCalc;
}
