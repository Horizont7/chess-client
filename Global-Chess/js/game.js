// js/game.js
window.GC = window.GC || {};

GC.gameState = null;
GC.gameOver = false;

// Pawn promotion uchun vaqtinchalik holat
GC.pendingPromotion = null;

// ==== AI MENYUDAN RANG VA LEVELNI O'QIB, TAQSIMLASH ==== //
GC.applyAiSettings = function () {
  let playerColor = "w"; // default: foydalanuvchi oq
  let aiColor = "b";     // default: AI qora

  try {
    const raw = localStorage.getItem("GC_AI_SETTINGS_V1");
    if (raw) {
      const cfg = JSON.parse(raw);
      let choice = (cfg.color || "white").toLowerCase();

      if (choice === "random") {
        choice = Math.random() < 0.5 ? "white" : "black";
      }

      if (choice === "black") {
        playerColor = "b";
        aiColor = "w";
      } else {
        // white yoki boshqa holatlar – default
        playerColor = "w";
        aiColor = "b";
      }

      // AI darajasini ham qo‘llab qo'yamiz (agar bor bo‘lsa)
      if (cfg.level && GC.AI && typeof GC.AI.setLevel === "function") {
        GC.AI.setLevel(cfg.level);
        if (typeof GC.updateAISkillFromLevel === "function") {
          GC.updateAISkillFromLevel();
        }
      }
    }
  } catch (e) {
    console.warn("GC_AI_SETTINGS_V1 ni o'qishda xatolik:", e);
  }

  // Ranglarni globalga saqlaymiz
  GC.playerColor = playerColor;
  GC.ai = GC.ai || {};
  GC.ai.color = aiColor;

  // Taxta orientatsiyasi (kim pastda turadi)
  const boardOuter = document.getElementById("board-outer");
  if (boardOuter) {
    if (GC.playerColor === "b") {
      boardOuter.classList.add("board-flipped");
    } else {
      boardOuter.classList.remove("board-flipped");
    }
  }
};


// AI menyudan tanlangan rangni o'qish (White / Black / Random)
GC.getPlayerPerspective = function () {
  try {
    const raw = localStorage.getItem("GC_AI_SETTINGS_V1");
    if (!raw) return "w"; // default: white

    const cfg = JSON.parse(raw);
    let color = (cfg && cfg.color) ? cfg.color.toLowerCase() : "white";

    if (color === "random") {
      // Random bo'lsa – bu yerda 50/50 tanlaymiz
      color = Math.random() < 0.5 ? "white" : "black";
    }

    return color === "black" ? "b" : "w";
  } catch (e) {
    console.warn("AI color o'qishda xatolik:", e);
    return "w";
  }
};

// ===== KING POSITION HELPER =====
GC.findKingPosition = function (state, color) {
  const board = state.board;
  const kingChar = color === "w" ? "K" : "k";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === kingChar) {
        return { row: r, col: c };
      }
    }
  }
  return null;
};

// ===== SQUARE ATTACK HELPER =====
GC.isSquareAttacked = function (state, row, col, byColor) {
  const board = state.board;

  function isInside(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  // Barcha kataklarni tekshiramiz
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece === ".") continue;

      const isWhite = piece === piece.toUpperCase();
      const color = isWhite ? "w" : "b";
      if (color !== byColor) continue;

      const p = piece.toLowerCase();
      const dr = row - r;
      const dc = col - c;
      const absDr = Math.abs(dr);
      const absDc = Math.abs(dc);

      // Pawn
      if (p === "p") {
        const dir = (color === "w") ? -1 : 1;
        if (dr === dir && absDc === 1) {
          return true;
        }
        continue;
      }

      // Knight
      if (p === "n") {
        if (
          (absDr === 2 && absDc === 1) ||
          (absDr === 1 && absDc === 2)
        ) {
          return true;
        }
        continue;
      }

      // Bishop / Rook / Queen – sliding
      if (p === "b" || p === "r" || p === "q") {
        let dRow = 0, dCol = 0;

        if (p === "b" || p === "q") {
          if (absDr === absDc && absDr !== 0) {
            dRow = dr > 0 ? 1 : -1;
            dCol = dc > 0 ? 1 : -1;
          }
        }

        if (p === "r" || p === "q") {
          if (dr === 0 && dc !== 0) {
            dRow = 0;
            dCol = dc > 0 ? 1 : -1;
          } else if (dc === 0 && dr !== 0) {
            dRow = dr > 0 ? 1 : -1;
            dCol = 0;
          }
        }

        if (dRow === 0 && dCol === 0) {
          // Bu piece bilan to'g'ridan-to'g'ri urib bo'lmaydi
        } else {
          let rr = r + dRow;
          let cc = c + dCol;
          while (isInside(rr, cc)) {
            if (rr === row && cc === col) {
              return true;
            }
            if (board[rr][cc] !== ".") break;
            rr += dRow;
            cc += dCol;
          }
        }
        continue;
      }

      // King (1 katak atrof)
      if (p === "k") {
        if (absDr <= 1 && absDc <= 1 && (absDr + absDc > 0)) {
          return true;
        }
        continue;
      }
    }
  }

  return false;
};

// Qirol checkdami?
GC.isKingInCheck = function (state, color) {
  const kingPos = GC.findKingPosition(state, color);
  if (!kingPos) return false;
  const enemy = color === "w" ? "b" : "w";
  return GC.isSquareAttacked(state, kingPos.row, kingPos.col, enemy);
};

// Hech bo'lmasa bitta LEGAL yurish bormi?
GC.hasAnyLegalMove = function (state, color) {
  const originalTurn = state.turn;
  const board = state.board;

  // Agar kerakli funksiyalar yo'q bo'lsa – xavfsiz fallback
  if (typeof GC.isLegalMove !== "function" ||
    typeof GC.cloneState !== "function" ||
    typeof GC.applyMove !== "function") {
    // Hozircha "yurish bor" deb hisoblaymiz, xato bermasin
    return true;
  }

  state.turn = color;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece === ".") continue;

      // Bu figura qaysi rangga tegishli?
      const isWhitePiece = piece === piece.toUpperCase();
      const pieceColor = isWhitePiece ? "w" : "b";
      if (pieceColor !== color) continue;

      for (let tr = 0; tr < 8; tr++) {
        for (let tc = 0; tc < 8; tc++) {

          // Qoidaga to'g'ri kelmaydigan yurishlarni o'tkazib yuboramiz
          if (!GC.isLegalMove(state, r, c, tr, tc)) continue;

          // Test holat: yurishni qo'llaymiz
          const testState = GC.cloneState(state);
          GC.applyMove(testState, r, c, tr, tc);

          // Agar qirol checkda qolmasa – LEGAL yurish bor
          if (!GC.isKingInCheck(testState, color)) {
            state.turn = originalTurn;
            return true;
          }
        }
      }
    }
  }

  state.turn = originalTurn;
  return false;
};

// ---- NAVBATDAGI AI YURISHINI TEKSHIRISH ----
GC.maybeRequestAIMove = function () {
  if (GC.gameOver) return;
  if (!GC.ai) return;
  if (typeof GC.requestAIMove !== "function") return;

  // Kimning navbati bo'lsa, shunga qaraymiz
  const turn = GC.gameState && GC.gameState.turn; // "w" yoki "b"
  if (turn && turn === GC.ai.color) {
    GC.requestAIMove(); // 🔥 bu yerda AI juda tez yuradi (0.15s)
  }
};


// O'yin holatini UI'ga chiqarish
GC.updateGameStatus = function () {
  const state = GC.gameState;
  if (!state) return;

  const turnEl = document.getElementById("turn-indicator");
  const checkEl = document.getElementById("check-indicator");
  const gameEl = document.getElementById("game-indicator");

  const sideToMove = state.turn;
  const inCheck = GC.isKingInCheck(state, sideToMove);
  const hasMove = GC.hasAnyLegalMove(state, sideToMove);

  // Check highlight uchun (qirol katagini qizartirish / animatsiya)
  if (typeof GC.updateCheckHighlight === "function") {
    GC.updateCheckHighlight(state);
  }

  if (turnEl) {
    turnEl.textContent =
      GC.gameOver
        ? "Game over"
        : (sideToMove === "w" ? "White to move" : "Black to move");
  }

  if (!hasMove) {
    // Yurish yo'q
    if (inCheck) {
      // CHECKMATE
      GC.gameOver = true;
      if (checkEl) checkEl.textContent = "CHECKMATE!";
      if (gameEl) {
        const winner = sideToMove === "w" ? "Black wins" : "White wins";
        gameEl.textContent = winner;
      }
    } else {
      // PAT (stalemate)
      GC.gameOver = true;
      if (checkEl) checkEl.textContent = "Stalemate";
      if (gameEl) gameEl.textContent = "Draw";
    }
  } else {
    // O'yin davomida
    GC.gameOver = false;
    if (inCheck) {
      if (checkEl) {
        checkEl.textContent =
          sideToMove === "w" ? "White in check" : "Black in check";
      }
      if (gameEl) gameEl.textContent = "";
    } else {
      if (checkEl) checkEl.textContent = "";
      if (gameEl) gameEl.textContent = "";
    }
  }

    // --- Chess clock uchun navbatni yuboramiz ---
  if (typeof GC.updateClockAfterMove === "function" && GC.gameState) {
    GC.updateClockAfterMove(GC.gameState.turn); // "w" yoki "b"
  }

    // ---- Har status yangilanganda, AI navbatini tekshiramiz ----
  if (typeof GC.maybeRequestAIMove === "function") {
    GC.maybeRequestAIMove();
  }

};

// Bitta yurishni FULL qoidalar bilan tekshirish va bajarish:
//  - figura qoidalari (moves.js)
//  - o'z qirolini checkda qoldirmaslik
//  - rokirovka, en-passant, promotion applyMove ichida
GC.tryMove = function (fromRow, fromCol, toRow, toCol) {
  if (GC.gameOver) return false;

  const currentState = GC.gameState;
  const color = currentState.turn;

  if (!GC.isLegalMove(currentState, fromRow, fromCol, toRow, toCol)) {
    return false;
  }

  const testState = GC.cloneState(currentState);
  GC.applyMove(testState, fromRow, fromCol, toRow, toCol);

  // O'z qirolini checkda qoldirmaslik
  if (GC.isKingInCheck(testState, color)) {
    return false;
  }

  // Yurish qonuniy – endi state'ni yangilaymiz
  GC.gameState = testState;

  // 🔥 Oxirgi yurilgan kataklar (from/to) ni eslab qolamiz
  GC.lastMove = {
    fromRow,
    fromCol,
    toRow,
    toCol,
  };

  // Pawn promotion ni tekshiramiz
  GC.checkPawnPromotion(fromRow, fromCol, toRow, toCol);
  return true;
};

// ===== PAWN PROMOTION LOGIC =====
GC.checkPawnPromotion = function (fromRow, fromCol, toRow, toCol) {
  const state = GC.gameState;
  if (!state) return;

  const board = state.board;
  const piece = board[toRow][toCol];
  if (!piece || piece === ".") return;

  const isWhite = piece === piece.toUpperCase();
  const color = isWhite ? "w" : "b";
  const p = piece.toLowerCase();

  // Peshka bo'lmasa – kerak emas
  if (p !== "p") return;

  // White – yuqoriga (0-qatorga), Black – pastga (7-qatorga) yetganda
  if (color === "w" && toRow !== 0) return;
  if (color === "b" && toRow !== 7) return;

  // Promotion kerak – modalni ochamiz
  GC.pendingPromotion = {
    color,
    row: toRow,
    col: toCol,
  };

  GC.showPromotionModal(color);
};

GC.showPromotionModal = function (color) {
  const modal = document.getElementById("promotion-modal");
  modal.classList.remove("hidden");

  // Rasm tugmalarini yangilaymiz
  const imgs = modal.querySelectorAll(".gc-promo-img");

  imgs.forEach(img => {
    let type = img.dataset.promoPiece; // q, r, b, n
    let pieceName = "";

    switch (type) {
      case "q": pieceName = "q"; break;
      case "r": pieceName = "r"; break;
      case "b": pieceName = "b"; break;
      case "n": pieceName = "n"; break;
    }

    // oq bo'lsa — katta harf, qora bo'lsa — kichik
    let file = color === "w"
      ? `assets/pieces/w${pieceName}.png`
      : `assets/pieces/b${pieceName}.png`;

    img.src = file;
  });
};


GC.hidePromotionModal = function () {
  const modal = document.getElementById("promotion-modal");
  if (!modal) return;
  modal.classList.add("hidden");
};

// O'yinchi tanlagan figuraning tipi: q, r, b, n
GC.handlePromotionChoice = function (pieceType) {
  const info = GC.pendingPromotion;
  if (!info || !GC.gameState) return;

  const state = GC.gameState;
  const board = state.board;

  const isWhite = (info.color === "w");
  let newChar = "Q";

  switch (pieceType) {
    case "q": newChar = isWhite ? "Q" : "q"; break;
    case "r": newChar = isWhite ? "R" : "r"; break;
    case "b": newChar = isWhite ? "B" : "b"; break;
    case "n": newChar = isWhite ? "N" : "n"; break;
    default: newChar = isWhite ? "Q" : "q"; // default – malika
  }

  // Peshkani tanlangan figuraga almashtiramiz
  board[info.row][info.col] = newChar;

  // Promotion tugadi
  GC.pendingPromotion = null;
  GC.hidePromotionModal();

  // Status va taxtani yangilaymiz
  GC.updateGameStatus();
  GC.renderBoard(state);
};


// ==== BOSHLANG'ICH INIT ==== //
document.addEventListener("DOMContentLoaded", function () {
  // 1) Holat
  GC.gameState = GC.createInitialState();
  GC.initHistoryUI();
  GC.renderBoard(GC.gameState);

  // 2) AI menyudan kelgan rang / board-flipni qo'llash
  if (typeof GC.applyAiSettings === "function") {
    GC.applyAiSettings();
  }

  // 3) Clock'ni AI settings asosida init qilish
  if (typeof GC.initGameClockFromSettings === "function") {
    GC.initGameClockFromSettings("GC_AI_SETTINGS_V1");
  }

  // 4) Status
  GC.updateGameStatus();

  // 5) AI ishga tushirish
  if (typeof GC.initAI === "function") {
    GC.initAI();
  }

  // 6) UI – chat va boshqalar
  initChatUI();
  initRightPanelStickers();

    // Sahifa yuklanganda ham, agar navbat AI tomonda bo'lsa – darhol boshlab yuboramiz
  if (typeof GC.maybeRequestAIMove === "function") {
    GC.maybeRequestAIMove();
  }

    // ===== TIMER HAR DOIM PASTDA – PLAYER TOMONIDA =====

  const whitePanel = document.getElementById("gc-white-panel");
  const blackPanel = document.getElementById("gc-black-panel");
  const whiteTimer = document.getElementById("white-timer");
  const blackTimer = document.getElementById("black-timer");

  if (whitePanel && blackPanel && whiteTimer && blackTimer) {
    // Avval ism yozuvlarini topamiz
    const whiteNameSpan = whitePanel.querySelector(".gc-player-name-bar span");
    const blackNameSpan = blackPanel.querySelector(".gc-player-name-bar span");

    // Odam va AI rangini aniqlaymiz
    // Agar GC.playerColor yo'q bo'lsa, AI rangidan kelib chiqamiz
    let humanColor = "w";
    if (GC.playerColor === "w" || GC.playerColor === "b") {
      humanColor = GC.playerColor;
    } else if (GC.ai && (GC.ai.color === "w" || GC.ai.color === "b")) {
      humanColor = GC.ai.color === "w" ? "b" : "w";
    }

    // Har ikki paneldagi header qatorini olamiz (flag + name + timer)
    const whiteHeaderRow = whitePanel.querySelector(".gc-player-name-row");
    const blackHeaderRow = blackPanel.querySelector(".gc-player-name-row");

    if (whiteHeaderRow && blackHeaderRow) {
      if (humanColor === "w") {
        // 🔹 Sen – OQ bo'lsang:
        // Pastdagi panel (black-panel) SEN tomoning bo'ladi,
        // oq timer pastga tushadi, qora timer tepaga chiqadi.

        // Timerlarni DOM ichida joyini almashtiramiz
        blackHeaderRow.appendChild(whiteTimer); // oq timer pastga
        whiteHeaderRow.appendChild(blackTimer); // qora timer tepaga

        if (whiteNameSpan) whiteNameSpan.textContent = "AI";
        if (blackNameSpan) blackNameSpan.textContent = "YOU";
      } else {
        // 🔹 Sen – QORA bo'lsang:
        // Strukturani o'zgartirmaymiz, faqat nomlarni almashtiramiz.
        // Pastdagi panel – baribir qora panel (sen tomoning).
        if (whiteNameSpan) whiteNameSpan.textContent = "AI";
        if (blackNameSpan) blackNameSpan.textContent = "YOU";
      }
    }
  }
 const nameBars = document.querySelectorAll(".gc-player-name-bar span");
  if (nameBars.length >= 2) {
    const topName = nameBars[0];
    const bottomName = nameBars[1];

    const humanColor = getHumanColor ? getHumanColor() : "w";

    if (humanColor === "w") {
      // Sen oq – lekin sening timer pastda, demak pastki panel SEN
      topName.textContent    = "AI";
      bottomName.textContent = "YOU";
    } else {
      // Sen qora – baribir pastki panel SEN
      topName.textContent    = "AI";
      bottomName.textContent = "YOU";
    }
  }
});



// AI menyudan kelgan sozlamalarni o'qish
GC.loadAiSettings = function () {
  try {
    const raw = localStorage.getItem("GC_AI_SETTINGS_V1");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("AI settingsni o'qib bo'lmadi:", e);
    return null;
  }
};


// ==== CHAT + EMOJI UI ==== //
function initChatUI() {
  const emojiBtn      = document.getElementById("emoji-btn");
  const emojiExpanded = document.getElementById("emoji-expanded");
  const emojiGrid     = emojiExpanded
    ? emojiExpanded.querySelector(".emoji-expanded-grid")
    : null;

  const chatInput = document.getElementById("chat-input");
  const chatSend  = document.getElementById("chat-send");
  const chatBox   = document.getElementById("chat-messages");

  // Agar chat elementlari topilmasa – hech narsa qilmaymiz
  if (!chatInput || !chatSend || !chatBox) {
    return;
  }

  // --- Xabar yuborish ---
  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    const line = document.createElement("div");
    line.className = "chat-line";
    line.textContent = text;
    chatBox.appendChild(line);

    chatBox.scrollTop = chatBox.scrollHeight;
    chatInput.value = "";
  }

  chatSend.addEventListener("click", sendMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // --- EMOJI PANEL --- //
  if (!emojiBtn || !emojiExpanded || !emojiGrid) {
    // HTMLda hali qo‘yilmagan bo‘lsa – jim turamiz
    return;
  }

  // Katta panelga qo‘yiladigan emoji ro'yxati
  const allEmojis =
    "😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚🙂🤗🤭🤫🤔🤨😐😑😶🙄😏";
  let filled = false;

  // 🙂 tugmasi – panelni ochish/yopish
  emojiBtn.addEventListener("click", () => {
    emojiExpanded.classList.toggle("hidden");

    // Birinchi marta ochilganda – emojilarni gridga joylaymiz
    if (!filled) {
      for (const ch of allEmojis) {
        const item = document.createElement("div");
        item.className = "emoji-expanded-item";
        item.textContent = ch;

        item.addEventListener("click", () => {
          chatInput.value += ch;
          chatInput.focus();
        });

        emojiGrid.appendChild(item);
      }
      filled = true;
    }
  });
}

// === Promotion tugmalariga event qo'shamiz ===
const promoImages = document.querySelectorAll(".gc-promo-img");
promoImages.forEach(img => {
  img.addEventListener("click", () => {
    const type = img.getAttribute("data-promo-piece");
    GC.handlePromotionChoice(type);
  });
});

// ==== RIGHT PLAYER STICKERS (BOTTOM PANEL) ==== //
function initRightPanelStickers() {
  const btn   = document.getElementById("black-sticker-btn");
  const panel = document.getElementById("black-sticker-panel");
  if (!btn || !panel) return;

  const grid = panel.querySelector(".gc-sticker-grid");
  if (!grid) return;

  // Stikerlar ro'yxati — assets/animations papkang bo'yicha
  const stickers = [
    { key: "ANGRY",    file: "ANGRY.webp" },
    { key: "GOOD",     file: "GOOD.webp" },
    { key: "HEADBANG", file: "HEADBANG.webp" },
    { key: "NONO",     file: "NONO.webp" },
    { key: "SAD",      file: "SAD.webp" },
  ];

  let filled = false;

  function fillOnce() {
    if (filled) return;

    stickers.forEach((st) => {
      const item = document.createElement("div");
      item.className = "gc-sticker-item";

      const img = document.createElement("img");
      img.src = "assets/animations/" + st.file;
      img.alt = st.key;

      item.appendChild(img);
      grid.appendChild(item);
    });

    filled = true;
  }

  function togglePanel() {
    panel.classList.toggle("hidden");

    if (!panel.classList.contains("hidden")) {
      fillOnce(); // Bir marta to‘ldiramiz
    }
  }

  btn.addEventListener("click", togglePanel);
}
