// JS/menu.js

document.addEventListener("DOMContentLoaded", () => {
  const mainMenu = document.getElementById("main-menu");
  const aiMenu   = document.getElementById("ai-menu");

  const btnVsAi   = document.getElementById("btn-vs-ai");
  const btnAiBack = document.getElementById("btn-ai-back");

  // "Играть против ИИ" bosilganda: bosh menyu yopiladi, AI menyu ochiladi
  if (btnVsAi && mainMenu && aiMenu) {
    btnVsAi.addEventListener("click", () => {
      mainMenu.classList.remove("active");
      aiMenu.classList.add("active");
    });
  }

  // "Назад" bosilganda: AI menyu yopiladi, bosh menyu qaytadi
  if (btnAiBack && mainMenu && aiMenu) {
    btnAiBack.addEventListener("click", () => {
      aiMenu.classList.remove("active");
      mainMenu.classList.add("active");
    });
  }

  // Level tugmalari (Easy / Medium / Hard / Expert / Impossible)
  document.querySelectorAll(".level-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const level = button.dataset.level;   // "easy", "medium", ...

      if (typeof window.startAIGame === "function") {
        window.startAIGame(level);          // AI controller’ga yuboramiz
      } else {
        console.error("startAIGame() aniqlanmagan (JS/ai/ai.js ni tekshir).");
      }
    });
  });
});
