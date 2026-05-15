/**
 * Content Script — ChatGPT (chat.openai.com / chatgpt.com)
 *
 * Detects when ChatGPT produces a response by observing DOM mutations,
 * estimates token usage, and reports water consumption to the background worker.
 */

(() => {
  const SOURCE = "ChatGPT";
  let lastResponseText = "";
  let debounceTimer = null;
  let currentModel = "gpt-4o"; // default assumption

  // ── Model detection ─────────────────────────────────────────
  // ChatGPT shows the current model in various UI elements
  function detectModel() {
    // Model selector button often contains model name
    const modelBtn = document.querySelector(
      '[data-testid="model-switcher-dropdown-button"],' +
      'button[aria-label*="Model"],' +
      'span[data-testid="model-name"]'
    );
    if (modelBtn) {
      const text = modelBtn.textContent.toLowerCase();
      if (text.includes("4o-mini")) return "gpt-4o-mini";
      if (text.includes("4o")) return "gpt-4o";
      if (text.includes("4.1")) return "gpt-4.1";
      if (text.includes("o3")) return "o3";
      if (text.includes("o4")) return "o4-mini";
      if (text.includes("o1")) return "o1";
    }
    return currentModel;
  }

  // ── Thinking mode detection ─────────────────────────────────
  function isThinkingMode() {
    // ChatGPT shows "Thinking..." or a thinking indicator
    const thinkingEl = document.querySelector(
      '[data-testid="thinking-indicator"],' +
      '.thinking-indicator,' +
      'div[class*="thinking"]'
    );
    if (thinkingEl) return true;

    // o1/o3 models are always reasoning
    const model = detectModel();
    return /^o[1-4]/.test(model);
  }

  // ── Response observer ───────────────────────────────────────
  // Watch for new assistant messages appearing in the DOM
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      checkForNewResponse();
    }, 2000); // Wait 2s after last DOM change (response likely complete)
  });

  function checkForNewResponse() {
    // ChatGPT renders assistant messages in article elements or divs with specific attributes
    const messages = document.querySelectorAll(
      '[data-message-author-role="assistant"],' +
      'div[class*="agent-turn"],' +
      '.markdown.prose'
    );

    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    const text = lastMsg.textContent || "";

    // Only fire if this is a new/different response
    if (text.length > 10 && text !== lastResponseText) {
      lastResponseText = text;

      currentModel = detectModel();
      const thinking = isThinkingMode();

      // Get the user's last message for input estimation
      const userMessages = document.querySelectorAll(
        '[data-message-author-role="user"]'
      );
      const lastUserMsg = userMessages.length > 0
        ? userMessages[userMessages.length - 1].textContent
        : "";

      const ml = WaterCalc.calculate({
        model: currentModel,
        inputText: lastUserMsg,
        outputText: text,
        isThinking: thinking,
      });

      // Report to background
      chrome.runtime.sendMessage({
        type: "WATER_USAGE",
        payload: {
          ml,
          source: SOURCE,
          model: currentModel,
          isThinking: thinking,
        },
      });
    }
  }

  // Start observing
  function startObserving() {
    const target = document.querySelector("main") || document.body;
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  // Wait for page to be ready
  if (document.readyState === "complete") {
    startObserving();
  } else {
    window.addEventListener("load", startObserving);
  }
})();
