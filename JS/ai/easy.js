// JS/ai/ai.js

// AI konfiguratsiya: har bir level uchun chuqurlik va tezlik
window.AI_CONFIG = {
  easy:       { depth: 1, moveDelay: 800 },
  medium:     { depth: 2, moveDelay: 600 },
  hard:       { depth: 3, moveDelay: 400 },
  expert:     { depth: 4, moveDelay: 250 },
  impossible: { depth: 5, moveDelay: 120 },
};

window.currentAIDifficulty = null;
window.aiSearchDepth = 1;
window.aiMoveDelay   = 800;
window.isAIGame      = false;

// Menyu.js shu funksiyani chaqiradi
window.startAIGame = function (level) {
  const cfg = window.AI_CONFIG[level] || window.AI_CONFIG.easy;

  window.currentAIDifficulty = level;
  window.aiSearchDepth = cfg.depth;
  window.aiMoveDelay   = cfg.moveDelay;
  window.isAIGame      = true;

  console.log("AI o'yini boshlandi. Level:", level, cfg);

  // --- Bu yerda board / o'yinni ishga tushiramiz ---

  // Agar sendagi o'yinni boshlash funksiyasi boshqacha bo'lsa,
  // initGame() o'rniga o'shani yozasan.
  if (typeof window.initGame === "function") {
    window.initGame();   // yangi o'yin
  }

  // Taxta va yurishlar panelini ko'rsatish
  const boardOuter = document.getElementById("board-outer");
  const movesBox   = document.getElementById("move-history-container");

  if (boardOuter) boardOuter.style.display = "block";
  if (movesBox)   movesBox.style.display   = "block";

  // Menyularni yopamiz
  const mainMenu = document.getElementById("main-menu");
  const aiMenu   = document.getElementById("ai-menu");

  if (mainMenu) mainMenu.classList.remove("active");
  if (aiMenu)   aiMenu.classList.remove("active");
};
