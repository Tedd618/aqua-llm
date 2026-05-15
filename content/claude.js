/**
 * Content Script — Claude (claude.ai)
 *
 * Detects Claude responses by observing DOM mutations.
 */

(() => {
  const SOURCE = "Claude";
  let lastResponseText = "";
  let debounceTimer = null;

  // ── Model detection ─────────────────────────────────────────
  function detectModel() {
    // Claude shows model name in the model selector
    const modelEl = document.querySelector(
      'button[data-testid="model-selector"],' +
      '[class*="model-selector"],' +
      'button[aria-haspopup="listbox"]'
    );
    if (modelEl) {
      const text = modelEl.textContent.toLowerCase();
      if (text.includes("haiku")) return "claude-3.5-haiku";
      if (text.includes("opus")) return "claude-4-opus";
      if (text.includes("sonnet")) return "claude-4-sonnet";
    }
    return "claude-4-sonnet"; // default
  }

  // ── Thinking detection ──────────────────────────────────────
  function isThinkingMode() {
    // Claude shows "Thinking..." block when extended thinking is on
    const thinkingEl = document.querySelector(
      '[class*="thinking"],' +
      'details summary'
    );
    return !!thinkingEl;
  }

  // ── Response observer ───────────────────────────────────────
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkForNewResponse, 2000);
  });

  function checkForNewResponse() {
    // Claude renders responses in specific containers
    const messages = document.querySelectorAll(
      '[data-is-streaming],' +
      '.font-claude-message,' +
      '[class*="assistant-message"],' +
      '.prose'
    );

    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    const text = lastMsg.textContent || "";

    if (text.length > 10 && text !== lastResponseText) {
      lastResponseText = text;

      const model = detectModel();
      const thinking = isThinkingMode();

      const userMessages = document.querySelectorAll(
        '[class*="human-message"],' +
        '.font-user-message,' +
        '[data-is-human-message]'
      );
      const lastUserMsg = userMessages.length > 0
        ? userMessages[userMessages.length - 1].textContent
        : "";

      const ml = WaterCalc.calculate({
        model,
        inputText: lastUserMsg,
        outputText: text,
        isThinking: thinking,
      });

      chrome.runtime.sendMessage({
        type: "WATER_USAGE",
        payload: { ml, source: SOURCE, model, isThinking: thinking },
      });
    }
  }

  function startObserving() {
    const target = document.querySelector("main") || document.body;
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  if (document.readyState === "complete") {
    startObserving();
  } else {
    window.addEventListener("load", startObserving);
  }
})();
