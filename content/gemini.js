/**
 * Content Script — Gemini (gemini.google.com)
 *
 * Detects Gemini responses by observing DOM mutations.
 */

(() => {
  const SOURCE = "Gemini";
  let lastResponseText = "";
  let debounceTimer = null;

  function detectModel() {
    // Gemini shows model in header or selector
    const modelEl = document.querySelector(
      'mat-select,' +
      '[data-model-selector],' +
      '.model-selector'
    );
    if (modelEl) {
      const text = modelEl.textContent.toLowerCase();
      if (text.includes("flash")) return "gemini-2.5-flash";
      if (text.includes("pro")) return "gemini-2.5-pro";
      if (text.includes("ultra")) return "gemini-ultra";
    }
    return "gemini-2.5-flash";
  }

  function isThinkingMode() {
    const thinkingEl = document.querySelector(
      '[class*="thinking"],' +
      '.thinking-indicator'
    );
    return !!thinkingEl;
  }

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkForNewResponse, 2000);
  });

  function checkForNewResponse() {
    // Gemini uses message-content or model-response classes
    const messages = document.querySelectorAll(
      'message-content,' +
      'model-response,' +
      '.model-response-text,' +
      '.response-content'
    );

    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    const text = lastMsg.textContent || "";

    if (text.length > 10 && text !== lastResponseText) {
      lastResponseText = text;

      const model = detectModel();
      const thinking = isThinkingMode();

      const userMessages = document.querySelectorAll(
        'user-query,' +
        '.user-message,' +
        '.query-content'
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
