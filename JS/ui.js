/* ================================
   UI FUNKSIYALARI (ui.js)
   ================================ */

/* ---- Turn / Check / Game indikatsiyalar ---- */

// Navbat kimda ekanini yozish (+ soatni yangilash)
function updateTurnIndicator() {
  const el = document.getElementById("turn-indicator");
  if (!el) return;

  el.textContent = currentTurn === "white"
    ? "Navbat: OQ"
    : "Navbat: QORA";

  // soat qaysi tomonda aktiv bo‘lishi kerak
  if (typeof updateActiveClock === "function") {
    updateActiveClock();
  }
}

// Shax bor-yo‘qligini ko‘rsatish
function updateCheckIndicator() {
  const el = document.getElementById("check-indicator");
  if (!el) return;

  if (!checkedKing || gameOver) {
    el.textContent = "";
    return;
  }

  el.textContent =
    checkedKing.color === "white"
      ? "Shax: OQ shoh ostida!"
      : "Shax: QORA shoh ostida!";
}

// O‘yin holati: mat / pat / vaqt bilan yutish
function updateGameIndicator() {
  const el = document.getElementById("game-indicator");
  if (!el) return;

  if (!gameResult) {
    el.textContent = "";
    return;
  }

  if (gameResult.type === "checkmate") {
    el.textContent =
      gameResult.winner === "white"
        ? "Mat: OQ yutdi"
        : "Mat: QORA yutdi";
  } else if (gameResult.type === "stalemate") {
    el.textContent = "Durrang (pat)";
  } else if (gameResult.type === "flag") {
    el.textContent =
      gameResult.winner === "white"
        ? "OQ vaqt bilan yutdi"
        : "QORA vaqt bilan yutdi";
  }
}

/* ================================
   PGN / MOVE HISTORY
   ================================ */

// Figuralar uchun unicode ikonlar
const pieceToSymbol = {
  "K": "♔", "Q": "♕", "R": "♖", "B": "♗", "N": "♘", "P": "♙",
  "k": "♚", "q": "♛", "r": "♜", "b": "♝", "n": "♞", "p": "♟"
};

/**
 * Har bir yurishdan keyin SAN va figura tipini moveHistory ichiga qo‘shish
 * color: "white" | "black"
 * san:   "e4", "Nf3", "O-O" ...
 * pieceCharForIcon: "p","N","k"... (ikonka uchun)
 */
function addMoveToHistory(color, san, pieceCharForIcon) {
  if (color === "white") {
    // yangi raqamli qator
    moveHistory.push({
      white: san,
      whitePiece: pieceCharForIcon || null,
      black: "",
      blackPiece: null
    });
  } else {
    // qora yurishi – oxirgi qatordan joy oladi
    if (moveHistory.length === 0) {
      moveHistory.push({
        white: "...",
        whitePiece: null,
        black: san,
        blackPiece: pieceCharForIcon || null
      });
    } else {
      const last = moveHistory[moveHistory.length - 1];
      last.black = san;
      last.blackPiece = pieceCharForIcon || null;
    }
  }

  renderMoveHistory();
}

/**
 * moveHistory massivini matnga aylantirib, ekranga chiqarish
 */
function renderMoveHistory() {
  const container = document.getElementById("move-history");
  if (!container) return;

  let html = "";

  for (let i = 0; i < moveHistory.length; i++) {
    const m = moveHistory[i];

    const whiteSymbol =
      m.whitePiece && pieceToSymbol[m.whitePiece]
        ? pieceToSymbol[m.whitePiece]
        : "";

    const blackSymbol =
      m.blackPiece && pieceToSymbol[m.blackPiece]
        ? pieceToSymbol[m.blackPiece]
        : "";

    html += `${i + 1}. `;

    if (m.white) {
      html += `${whiteSymbol ? whiteSymbol + "&nbsp;" : ""}${m.white} `;
    }

    if (m.black) {
      html += `${blackSymbol ? blackSymbol + "&nbsp;" : ""}${m.black} `;
    }
  }

  container.innerHTML = html.trim();
}
