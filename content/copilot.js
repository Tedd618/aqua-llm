/**
 * Content Script — Microsoft Copilot (copilot.microsoft.com)
 *
 * Detects Copilot responses by observing DOM mutations.
 */

(() => {
  const SOURCE = "Copilot";
  let lastResponseText = "";
  let debounceTimer = null;

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkForNewResponse, 2000);
  });

  function checkForNewResponse() {
    const messages = document.querySelectorAll(
      '[data-content="ai-message"],' +
      'cib-message-group[source="bot"],' +
      '.response-message,' +
      '.ai-response'
    );

    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    const text = lastMsg.textContent || "";

    if (text.length > 10 && text !== lastResponseText) {
      lastResponseText = text;

      const userMessages = document.querySelectorAll(
        '[data-content="user-message"],' +
        'cib-message-group[source="user"],' +
        '.user-message'
      );
      const lastUserMsg = userMessages.length > 0
        ? userMessages[userMessages.length - 1].textContent
        : "";

      const ml = WaterCalc.calculate({
        model: "copilot",
        inputText: lastUserMsg,
        outputText: text,
      });

      chrome.runtime.sendMessage({
        type: "WATER_USAGE",
        payload: { ml, source: SOURCE, model: "copilot", isThinking: false },
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
