// Injects the WebSocket hook script into the page
const script = document.createElement('script');
script.src = chrome.runtime.getURL('scripts/injected.js');
script.onload = () => console.log("[Kahoot AutoClick] Script injected");
(document.head || document.documentElement).appendChild(script);

// Listens for messages from popup and handles highlighting + auto-clicking
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "highlightAnswer") {
        const {answer, options} = request;
        console.log("[Kahoot AutoClick] Answer received:", answer, "Options:", options);
        highlightAndAutoClickAnswer(answer, options);
    }
});

// Listen for the event from injected.js
window.addEventListener("kahootQuestionParsed", (event) => {
    const question = event.detail;
    chrome.storage.local.set({ lastKahootQuestion: question }, () => {
        console.log("[Kahoot AutoClick] Question saved:", question);

        // Automatisch auslösen
        chrome.storage.local.get(['selectedModel', 'highlightOption', 'autoClickOption'], (settings) => {
            const { title, choices } = question;
            const fullQuestion = `${title}\n\nOptions:\n${choices.map((c, i) => `${i + 1}. ${c}`).join("\n")}`;

            chrome.runtime.sendMessage({
                action: "getOpenAIAnswer",
                payload: {
                    question: fullQuestion,
                    model: settings.selectedModel || "gpt-4o",
                    highlight: settings.highlightOption !== false,
                    autoClick: settings.autoClickOption !== false
                }
            });
        });
    });
});



// Finds the correct button and optionally highlights and/or auto-clicks it
function highlightAndAutoClickAnswer(answerText, options = {highlight: true, autoClick: true}) {
    const buttons = document.querySelectorAll("button");
    let index = 0;

    for (let button of buttons) {
        const cleanedButtonText = button.innerText.trim().toLowerCase();
        const cleanedAnswerText = answerText.trim().toLowerCase();

        if (cleanedButtonText === cleanedAnswerText) {
            if (options.highlight) {
                button.style.border = '5px solid black'; // visual feedback
            }

            console.log("[Kahoot AutoClick] Match found:", cleanedButtonText, "(Index:", index, ")");

            if (options.autoClick) {
                const event = new CustomEvent("autoClickAnswer", {detail: index});
                window.dispatchEvent(event);
            }

            break;
        }
        index++;
    }
}
