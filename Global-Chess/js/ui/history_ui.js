// js/ui/history_ui.js
// Move history UI – har bir yurish 1,2,3,4 raqam bilan ketadi

window.GC = window.GC || {};

// Barcha yurishlar bu yerda saqlanadi
GC.moveHistoryList = GC.moveHistoryList || [];

// Unicode figuralar (white/black)
const GC_PIECE_UNICODE = {
  "P": "♙",
  "N": "♘",
  "B": "♗",
  "R": "♖",
  "Q": "♕",
  "K": "♔",

  "p": "♟",
  "n": "♞",
  "b": "♝",
  "r": "♜",
  "q": "♛",
  "k": "♚"
};

/**
 * move: {
 *   turn: "w" | "b",
 *   from: "e2",
 *   to:   "e4",
 *   piece: "P" / "p" / "N" ...
 *   isAI?: bool
 * }
 */
GC.addMoveToHistory = function (move) {
  if (!move) return;
  if (!GC.moveHistoryList) GC.moveHistoryList = [];
  GC.moveHistoryList.push(move);
  GC.renderMoveHistory();
};

GC.resetMoveHistory = function () {
  GC.moveHistoryList = [];
  GC.renderMoveHistory();
};

GC.renderMoveHistory = function () {
  const ul = document.getElementById("moves-list");
  if (!ul) return;

  ul.innerHTML = "";

  const list = GC.moveHistoryList || [];
  for (let i = 0; i < list.length; i++) {
    const move = list[i];
    if (!move) continue;

    const num = i + 1; // 1, 2, 3, 4, ...

    const li = document.createElement("li");
    li.className = "move-row";

    const pieceChar = move.piece || "";
    const symbol = GC_PIECE_UNICODE[pieceChar] || "";
    const from = move.from || "";
    const to   = move.to   || "";

    // Misol:  3. ♙ e2-e4
    li.innerHTML = `${num}. ${symbol}&nbsp;${from}-${to}`;

    ul.appendChild(li);
  }

  // Scrollni pastga tushiramiz (agar konteyner bo'lsa)
  const container = document.querySelector(".gc-moves-body");
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
};

// UI init – game.js shuni chaqiradi
GC.initMoveHistoryUI = function () {
  GC.renderMoveHistory();
};

// game.js dagi nom bilan moslashtiramiz
GC.initHistoryUI = GC.initMoveHistoryUI;
