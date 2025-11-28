/* =========================================
   MENU + AI GLOBAL HOLAT
   ========================================= */

// AI holatlari
let isAIGame = false;
let aiLevel  = null;       // "easy", "medium", "hard", "expert", "impossible"
let aiSide   = "black";    // AI qora tomonda

// DOM elementlar (menu va indikatorlar)
const mainMenu             = document.getElementById("main-menu");
const boardOuter           = document.getElementById("board-outer");
const turnIndicator        = document.getElementById("turn-indicator");
const checkIndicator       = document.getElementById("check-indicator");
const gameIndicator        = document.getElementById("game-indicator");
const moveHistoryContainer = document.getElementById("move-history-container");

// Menyu tugmalari (faqat kerak bo‘lganlari)
const btnOnline  = document.getElementById("btn-online");
const btnFriend  = document.getElementById("btn-friend");
const btnLessons = document.getElementById("btn-lessons");

// Online / Friend / Lessons hozircha stub
if (btnOnline) {
  btnOnline.addEventListener("click", () => {
    alert("Online rejim keyin qo'shiladi 🙂");
  });
}

if (btnFriend) {
  btnFriend.addEventListener("click", () => {
    alert("Local (2-player) rejim keyin qo'shiladi 🙂");
  });
}

if (btnLessons) {
  btnLessons.addEventListener("click", () => {
    alert("Уроки шахмат скоро будут добавлены!");
  });
}

/** Menyuni yopib, board va indikatorlarni ko'rsatish */
function hideMenu() {
  if (mainMenu) mainMenu.style.display = "none";
  if (boardOuter) boardOuter.style.display = "block";

  if (turnIndicator)        turnIndicator.style.display = "block";
  if (checkIndicator)       checkIndicator.style.display = "block";
  if (gameIndicator)        gameIndicator.style.display = "block";
  if (moveHistoryContainer) moveHistoryContainer.style.display = "block";
}


/* =========================================
   GLOBAL HOLAT (board, turn, game)
   ========================================= */

let position = [
  ["r","n","b","q","k","b","n","r"],
  ["p","p","p","p","p","p","p","p"],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["P","P","P","P","P","P","P","P"],
  ["R","N","B","Q","K","B","N","R"]
];

let currentTurn       = "white";
let selected          = null;
let legalMoves        = [];
let checkedKing       = null;
let lastMove          = null;
let enPassantTarget   = null;
let moveHistory       = [];
let gameOver          = false;
let gameResult        = null;
let pendingPromotion  = null;

const files = "abcdefgh";
function squareToCoord(square) {
  const file = square[0];                 // "a".."h"
  const rank = parseInt(square[1], 10);   // "1".."8"
  const col = files.indexOf(file);        // 0..7
  const row = 8 - rank;                   // rank 1 → row 7, rank 8 → row 0
  return { row, col };
}

const promotionModal   = document.getElementById("promotion-modal");
const promotionButtons = document.querySelectorAll(".promotion-choice");

/** O'yinni noldan boshlash */
function resetGameState() {
  position = [
    ["r","n","b","q","k","b","n","r"],
    ["p","p","p","p","p","p","p","p"],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["P","P","P","P","P","P","P","P"],
    ["R","N","B","Q","K","B","N","R"]
  ];

  currentTurn      = "white";
  selected         = null;
  legalMoves       = [];
  checkedKing      = null;
  lastMove         = null;
  enPassantTarget  = null;
  moveHistory      = [];
  gameOver         = false;
  gameResult       = null;
  pendingPromotion = null;

  if (typeof resetClock === "function") {
    resetClock();
  }
}

/* =========================================
   NAVBATNI ALMASHTIRISH
   ========================================= */

function toggleTurn() {
  currentTurn = currentTurn === "white" ? "black" : "white";
  updateTurnIndicator();
  if (typeof startClockForCurrentTurn === "function") {
    startClockForCurrentTurn();
  }

  if (isAIGame && !gameOver && currentTurn === aiSide) {
    setTimeout(() => {
      makeAIMove();
    }, 300);
  }
}

/* =========================================
   PROMOTION OYNASI
   ========================================= */

function openPromotionDialog() {
  if (promotionModal) promotionModal.style.display = "flex";
}

function closePromotionDialog() {
  if (promotionModal) promotionModal.style.display = "none";
}

/* =========================================
   FIGURANI ICHKI POZITSIYADA KO‘CHIRISH
   ========================================= */

function movePieceLocally(from, to, promotionPiece) {
  const piece      = position[from.row][from.col];
  const color      = pieceColor(piece);
  const pieceLower = piece.toLowerCase();
  const targetBefore = position[to.row][to.col];

  const prevEnPassant = enPassantTarget;
  enPassantTarget = null;

  // EN PASSANT
  if (
    pieceLower === "p" &&
    !targetBefore &&
    prevEnPassant &&
    prevEnPassant.row === to.row &&
    prevEnPassant.col === to.col &&
    Math.abs(to.col - from.col) === 1
  ) {
    position[from.row][to.col] = "";
  }

  // ROKIROVKA – rookni ham ko‘chiramiz
  if (
    pieceLower === "k" &&
    from.row === to.row &&
    Math.abs(to.col - from.col) === 2
  ) {
    const side       = to.col > from.col ? "kingSide" : "queenSide";
    const row        = from.row;
    const rookFromCol= side === "kingSide" ? 7 : 0;
    const rookToCol  = side === "kingSide" ? 5 : 3;

    position[row][rookToCol] = position[row][rookFromCol];
    position[row][rookFromCol] = "";
  }

  position[from.row][from.col] = "";
  position[to.row][to.col]     = piece;

  // EN PASSANT yangi huquqi
  if (pieceLower === "p" && Math.abs(to.row - from.row) === 2) {
    const midRow = (from.row + to.row) / 2;
    enPassantTarget = { row: midRow, col: from.col };
  }

  // ROKIROVKA HUQUQINI YANGILASH
  if (typeof castlingRights !== "undefined") {
    if (pieceLower === "k") {
      castlingRights[color].kingSide  = false;
      castlingRights[color].queenSide = false;
    }

    if (pieceLower === "r") {
      if (color === "white") {
        if (from.row === 7 && from.col === 0) castlingRights.white.queenSide = false;
        if (from.row === 7 && from.col === 7) castlingRights.white.kingSide  = false;
      } else {
        if (from.row === 0 && from.col === 0) castlingRights.black.queenSide = false;
        if (from.row === 0 && from.col === 7) castlingRights.black.kingSide  = false;
      }
    }

    if (targetBefore) {
      const tLower = targetBefore.toLowerCase();
      const tColor = pieceColor(targetBefore);
      if (tLower === "r") {
        if (tColor === "white") {
          if (to.row === 7 && to.col === 0) castlingRights.white.queenSide = false;
          if (to.row === 7 && to.col === 7) castlingRights.white.kingSide  = false;
        } else {
          if (to.row === 0 && to.col === 0) castlingRights.black.queenSide = false;
          if (to.row === 0 && to.col === 7) castlingRights.black.kingSide  = false;
        }
      }
    }
  }

  // PROMOTION
  if (pieceLower === "p") {
    if ((color === "white" && to.row === 0) ||
        (color === "black" && to.row === 7)) {
      if (promotionPiece) {
        position[to.row][to.col] = promotionPiece;
      } else {
        position[to.row][to.col] = color === "white" ? "Q" : "q";
      }
    }
  }
}

/* SOCKETGA YURISH JO‘NATISH */
function sendMoveToServer(payload) {
  if (typeof socket !== "undefined" && socket && socket.connected) {
    socket.emit("move", payload);
  }
}

/* =========================================
   TAHTADAGI KATAK BOSILGANDA
   ========================================= */

function onSquareClick(e) {
  if (gameOver) return;
  if (isAIGame && currentTurn === aiSide) return;

  const row = parseInt(e.currentTarget.dataset.row, 10);
  const col = parseInt(e.currentTarget.dataset.col, 10);
  const clickedPiece = position[row][col];

  if (!selected) {
    if (!clickedPiece) return;
    if (pieceColor(clickedPiece) !== currentTurn) return;

    selected   = { row, col };
    legalMoves = getLegalMoves(selected);
    renderBoard();
    return;
  }

  if (clickedPiece && pieceColor(clickedPiece) === currentTurn) {
    selected   = { row, col };
    legalMoves = getLegalMoves(selected);
    renderBoard();
    return;
  }

  const from        = { ...selected };
  const to          = { row, col };
  const movingPiece = position[from.row][from.col];

  if (from.row === to.row && from.col === to.col) {
    selected   = null;
    legalMoves = [];
    renderBoard();
    return;
  }

  if (!isMoveLegalWithKingSafety(movingPiece, from, to, position)) return;

  const color       = pieceColor(movingPiece);
  const pieceLower  = movingPiece.toLowerCase();
  const willPromote =
    pieceLower === "p" &&
    ((color === "white" && to.row === 0) ||
     (color === "black" && to.row === 7));

  const prevPosition = clonePosition(position);

  if (willPromote) {
    pendingPromotion = { from, to, color, prevPosition, movingPiece };
    openPromotionDialog();
    return;
  }

  movePieceLocally(from, to, null);
  lastMove = { from, to };

  const san = generateSAN(
    movingPiece,
    from,
    to,
    null,
    prevPosition,
    position
  );

  addMoveToHistory(color, san, movingPiece);

  toggleTurn();
  sendMoveToServer({ from, to, promotion: null });

  selected   = null;
  legalMoves = [];
  updateGameState();
  renderBoard();
}

/* =========================================
   PROMOTION TANLASH
   ========================================= */

function handlePromotionChoice(e) {
  const base = e.target.dataset.piece;
  if (!base || !pendingPromotion) return;

  const { from, to, color, prevPosition } = pendingPromotion;
  const promoChar = color === "white" ? base.toUpperCase() : base;
  const pawnPiece = color === "white" ? "P" : "p";

  movePieceLocally(from, to, promoChar);
  lastMove = { from, to };

  const san = generateSAN(
    pawnPiece,
    from,
    to,
    promoChar,
    prevPosition,
    position
  );

  addMoveToHistory(color, san, promoChar);

  toggleTurn();
  sendMoveToServer({ from, to, promotion: promoChar });

  pendingPromotion = null;
  selected   = null;
  legalMoves = [];
  closePromotionDialog();
  updateGameState();
  renderBoard();
}

promotionButtons.forEach(btn => {
  btn.addEventListener("click", handlePromotionChoice);
});

/* =========================================
   AI YURISHI
   ========================================= */

function makeAIMove() {
  // Stockfish asosidagi AI'ni chaqiramiz (ai.js ichidagi requestAIMove)
  requestAIMove(aiLevel, aiSide, function (move) {
    if (!move) {
      console.error("AI move topa olmadi");
      return;
    }

    // "e2" → { row, col }
    const from = squareToCoord(move.from);
    const to   = squareToCoord(move.to);

    // Promotion bo'lsa, white uchun katta, black uchun kichik harf
    let promotion = null;
    if (move.promotion) {
      const base = move.promotion; // "q", "r", "b", "n"
      promotion = (aiSide === "white")
        ? base.toUpperCase()
        : base.toLowerCase();
    }

    const movingPiece  = position[from.row][from.col];
    const color        = pieceColor(movingPiece);
    const prevPosition = clonePosition(position);

    movePieceLocally(from, to, promotion);
    lastMove = { from, to };

    const san = generateSAN(
      movingPiece,
      from,
      to,
      promotion,
      prevPosition,
      position
    );

    addMoveToHistory(color, san, movingPiece);

    updateGameState();
    renderBoard();
    toggleTurn();
  });
}

/* =========================================
   BOSHLANG‘ICH INIT
   ========================================= */

function initChess() {
  renderBoard();
  updateTurnIndicator();
  updateGameState();
  updateClockUI();
  if (typeof startClockForCurrentTurn === "function") {
    startClockForCurrentTurn();
  }
  renderMoveHistory();
}
// =============================
//  MENYU EKRANLARINI ULASH
// =============================

// Asosiy menyu va AI menyu
const mainMenuEl = document.getElementById("main-menu");
const aiMenuEl   = document.getElementById("ai-menu");

// Tugmalar
const btnVsAi   = document.getElementById("btn-vs-ai");
const btnAiBack = document.getElementById("btn-ai-back");

// "Играть против ИИ" bosilganda:
// 1-ekran yopiladi, 2-ekran ochiladi
if (btnVsAi && mainMenuEl && aiMenuEl) {
  btnVsAi.addEventListener("click", () => {
    mainMenuEl.classList.remove("active");
    aiMenuEl.classList.add("active");
  });
}

// "Назад" bosilganda:
// AI menyu yopiladi, asosiy menyu qayta ochiladi
if (btnAiBack && mainMenuEl && aiMenuEl) {
  btnAiBack.addEventListener("click", () => {
    aiMenuEl.classList.remove("active");
    mainMenuEl.classList.add("active");
  });
}

// Level tugmalari – AI o‘yinini boshlash
document.querySelectorAll(".level-btn").forEach(button => {
  button.addEventListener("click", () => {
    const level = button.dataset.level; // "easy" / "medium" / ...

    // Global holat
    isAIGame = true;
    aiLevel  = level;
    aiSide   = "black";

    // AI config (chuqurlik va tezlikni o‘rnatish)
    if (typeof startAIGame === "function") {
      startAIGame(level);
    }

    // Menyuni yopib, board + indikatorlarni ko‘rsatamiz
    hideMenu();

    // O‘yinni noldan boshlash (figuralarni qo‘yish va taxtani chizish)
    resetGameState();
    initChess();

    // AI menyuni ham yopamiz
    if (aiMenuEl) aiMenuEl.classList.remove("active");
  });
});
