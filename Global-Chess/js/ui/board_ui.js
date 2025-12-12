// js/ui/board_ui.js

window.GC = window.GC || {};
GC.lastMove = GC.lastMove || null;      // oxirgi yurish (from/to)
GC.promotionOpen = false;               // promotion panel ochiqmi?

// Figuralar rasmlari
GC.PIECE_IMAGES = {
  "P": "assets/pieces/wp.png",
  "N": "assets/pieces/wn.png",
  "B": "assets/pieces/wb.png",
  "R": "assets/pieces/wr.png",
  "Q": "assets/pieces/wq.png",
  "K": "assets/pieces/wk.png",

  "p": "assets/pieces/bp.png",
  "n": "assets/pieces/bn.png",
  "b": "assets/pieces/bb.png",
  "r": "assets/pieces/br.png",
  "q": "assets/pieces/bq.png",
  "k": "assets/pieces/bk.png",
};

// UI state
GC.highlightedSquares = [];
GC.selectedSquare = null;

// Shoh check/mate
GC.checkInfo = null;   // { row, col, type: "check" | "mate" }
GC.checkedKing = null; // { row, col }

/* =========================
   YORDAMCHI FUNKSIYALAR
   ========================= */

GC.squareToNotation = function (row, col) {
  const file = "abcdefgh"[col];
  const rank = 8 - row;
  return file + rank;
};

GC.notationToSquare = function (notation) {
  if (!notation || notation.length !== 2) return null;
  const file = notation[0];
  const rank = parseInt(notation[1], 10);
  const col = "abcdefgh".indexOf(file);
  const row = 8 - rank;
  if (col < 0 || row < 0 || col > 7 || row > 7) return null;
  return { row, col };
};

// Piyoda promotion yurishmi?
GC.isPromotionMove = function (state, fromRow, fromCol, toRow, toCol) {
  const board = state.board;
  const piece = board[fromRow][fromCol];
  if (!piece || piece === ".") return false;

  const isPawn = piece.toUpperCase() === "P";
  if (!isPawn) return false;

  const isWhite = piece === piece.toUpperCase();
  if (isWhite && toRow === 0) return true;
  if (!isWhite && toRow === 7) return true;
  return false;
};


/* =========================
   PROMOTION MODAL UI
   ========================= */

GC.showPromotionModal = function (color) {
  const modal = document.getElementById("promotion-modal");
  if (!modal) return;

  GC.promotionOpen = true;

  // Rangga qarab ikonalarni almashtiramiz
  const imgs = modal.querySelectorAll(".gc-promo-img");
  imgs.forEach(img => {
    const type = img.dataset.promoPiece; // q, r, b, n
    if (!type) return;

    if (color === "w") {
      img.src = "assets/pieces/w" + type + ".png";
    } else {
      img.src = "assets/pieces/b" + type + ".png";
    }
  });

  modal.classList.remove("hidden");
};

GC.hidePromotionModal = function () {
  const modal = document.getElementById("promotion-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
  GC.promotionOpen = false;
};

// Tanlangan figuraga aylantirish
GC.finishPromotion = function (pieceType) {
  console.log("finishPromotion:", pieceType);

  const state = GC.gameState;
  if (!state) {
    console.warn("finishPromotion: gameState yo'q");
    return;
  }

  if (!GC.lastMove || !GC.lastMove.to) {
    console.warn("finishPromotion: lastMove yo'q");
    return;
  }

  const toRow = GC.lastMove.to.row;
  const toCol = GC.lastMove.to.col;
  const board = state.board;

  const currentPiece = board[toRow][toCol];
  if (!currentPiece || currentPiece === ".") {
    console.warn("finishPromotion: promo katakda figura yo'q");
    return;
  }

  const isWhite = currentPiece === currentPiece.toUpperCase();
  const newChar = isWhite
    ? pieceType.toUpperCase()   // Q,R,B,N
    : pieceType.toLowerCase();  // q,r,b,n

  board[toRow][toCol] = newChar;

  GC.hidePromotionModal();

  if (typeof GC.updateGameStatus === "function") {
    GC.updateGameStatus();
  }
  if (typeof GC.renderBoard === "function") {
    GC.renderBoard(state);
  }

  if (GC.aiEnabled && typeof GC.requestAIMove === "function") {
    GC.requestAIMove();
  }
};


/* =========================
   TAXTANI RENDER QILISH
   ========================= */

GC.renderBoard = function (state) {
  const boardDiv = document.getElementById("board");
  if (!boardDiv) return;

  const board = state.board;
  boardDiv.innerHTML = "";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const squareDiv = document.createElement("div");
      squareDiv.classList.add("square");

      const isLight = (r + c) % 2 === 0;
      squareDiv.classList.add(isLight ? "light" : "dark");

      squareDiv.dataset.row = r;
      squareDiv.dataset.col = c;

      // Tanlangan katak
      if (
        GC.selectedSquare &&
        GC.selectedSquare.row === r &&
        GC.selectedSquare.col === c
      ) {
        squareDiv.classList.add("selected");
      }

      // Legal yurishlar
      const isHighlight = GC.highlightedSquares.some(
        sq => sq.row === r && sq.col === c
      );
      if (isHighlight) {
        squareDiv.classList.add("move-target");
      }

      // Check / mate highlight
      if (
        GC.checkInfo &&
        GC.checkInfo.row === r &&
        GC.checkInfo.col === c
      ) {
        squareDiv.classList.add(
          GC.checkInfo.type === "mate"
            ? "king-mate-square"
            : "king-check-square"
        );
      }

      const pieceChar = board[r][c];
      if (pieceChar && pieceChar !== ".") {
        const img = document.createElement("img");
        img.src = GC.PIECE_IMAGES[pieceChar];
        img.classList.add("piece-img");
        img.draggable = false;

        if (
          GC.checkedKing &&
          GC.checkedKing.row === r &&
          GC.checkedKing.col === c
        ) {
          img.classList.add("king-shake");
          squareDiv.classList.add("king-glow");
        }

        squareDiv.appendChild(img);
      }

      squareDiv.addEventListener("click", GC.onSquareClick);
      boardDiv.appendChild(squareDiv);
    }
  }
};


/* =========================
   CAPTURE ANIMATSIYASI
   ========================= */

GC.playSimpleCaptureEffect = function (row, col, pieceChar) {
  const boardEl = document.getElementById("board");
  if (!boardEl) return;

  const square = [...boardEl.children].find(
    (s) => s.dataset.row == row && s.dataset.col == col
  );
  if (!square) return;

  const effect = document.createElement("div");
  effect.className = "capture-pop";
  effect.style.backgroundImage = `url(${GC.PIECE_IMAGES[pieceChar]})`;

  square.appendChild(effect);

  setTimeout(() => {
    effect.remove();
  }, 400);
};


/* =========================
   KATAKKA BOSILGANDA
   ========================= */

GC.onSquareClick = function (e) {
  // Promotion paneli ochiq bo'lsa – taxtaga bosilmaydi
  if (GC.promotionOpen) return;

  const row = parseInt(e.currentTarget.dataset.row, 10);
  const col = parseInt(e.currentTarget.dataset.col, 10);

  const state = GC.gameState;
  if (!state || GC.gameOver) return;

  // AI navbatida bo'lsa – foydalanuvchi yurmasin
  if (GC.aiEnabled && GC.ai && state.turn === GC.ai.color) {
    return;
  }

  const board = state.board;
  const clickedPiece = board[row][col];

  let wasCapture = false;
  let capturedPiece = null;

  // 1) Hali figura tanlanmagan
  if (!GC.selectedSquare) {
    if (!clickedPiece || clickedPiece === ".") return;

    const isWhitePiece = clickedPiece === clickedPiece.toUpperCase();
    const pieceColor = isWhitePiece ? "w" : "b";
    if (pieceColor !== state.turn) return;

    GC.selectedSquare = { row, col };

    const color = state.turn;
    const legalTargets = [];

    for (let tr = 0; tr < 8; tr++) {
      for (let tc = 0; tc < 8; tc++) {
        if (!GC.isLegalMove(state, row, col, tr, tc)) continue;

        const testState = GC.cloneState(state);
        GC.applyMove(testState, row, col, tr, tc);

        if (GC.isKingInCheck && GC.isKingInCheck(testState, color)) {
          continue;
        }

        legalTargets.push({ row: tr, col: tc });
      }
    }

    GC.highlightedSquares = legalTargets;
    GC.renderBoard(state);
    return;
  }

  // 2) Tanlangan figura bor – endi target katak tanlanadi
  const from = GC.selectedSquare;

  // O'sha katakka qayta bosish – bekor qilish
  if (from.row === row && from.col === col) {
    GC.selectedSquare = null;
    GC.highlightedSquares = [];
    GC.renderBoard(state);
    return;
  }

  const isLegalTarget = GC.highlightedSquares.some(
    sq => sq.row === row && sq.col === col
  );
  if (!isLegalTarget) {
    GC.selectedSquare = null;
    GC.highlightedSquares = [];
    GC.renderBoard(state);
    return;
  }

  const fromRow = from.row;
  const fromCol = from.col;
  const toRow   = row;
  const toCol   = col;

  const movingPiece = board[fromRow][fromCol];
  const targetPiece = board[toRow][toCol];

  if (targetPiece && targetPiece !== ".") {
    wasCapture = true;
    capturedPiece = targetPiece;
  }

  const newState = GC.cloneState(state);
  GC.applyMove(newState, fromRow, fromCol, toRow, toCol);

  // Global state
  GC.gameState = newState;
  GC.lastMove = {
    from: { row: fromRow, col: fromCol },
    to:   { row: toRow,   col: toCol }
  };

  GC.selectedSquare = null;
  GC.highlightedSquares = [];

  // Promotion yurishmi?
  if (GC.isPromotionMove(state, fromRow, fromCol, toRow, toCol)) {
    GC.renderBoard(newState);
    if (wasCapture && capturedPiece) {
      GC.playSimpleCaptureEffect(toRow, toCol, capturedPiece);
    }

    const isWhite = movingPiece === movingPiece.toUpperCase();
    const color   = isWhite ? "w" : "b";

    GC.showPromotionModal(color);
    return; // AI faqat promotion tugagach yuradi
  }

  // Oddiy yurish
  if (typeof GC.updateGameStatus === "function") {
    GC.updateGameStatus();
  }
  GC.renderBoard(newState);

  if (wasCapture && capturedPiece) {
    GC.playSimpleCaptureEffect(toRow, toCol, capturedPiece);
  }

  if (GC.aiEnabled && typeof GC.requestAIMove === "function") {
    GC.requestAIMove();
  }
};


/* =========================
   GLOBAL CLICK – PROMOTION IKONALARI
   ========================= */

document.addEventListener("click", function (e) {
  const img = e.target.closest(".gc-promo-img");
  if (!img) return;

  const type = img.dataset.promoPiece; // q, r, b, n
  if (!type) return;

  console.log("PROMO ICON CLICKED:", type);
  GC.finishPromotion(type);
});
