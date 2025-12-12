// js/engine/state.js

window.GC = window.GC || {};

// Boshlang'ich holat
GC.createInitialState = function () {
  const board = [
    ["r","n","b","q","k","b","n","r"],
    ["p","p","p","p","p","p","p","p"],
    [".",".",".",".",".",".",".","."],
    [".",".",".",".",".",".",".","."],
    [".",".",".",".",".",".",".","."],
    [".",".",".",".",".",".",".","."],
    ["P","P","P","P","P","P","P","P"],
    ["R","N","B","Q","K","B","N","R"],
  ];

  return {
    board,
    turn: "w",   // "w" – oq, "b" – qora
    moveNumber: 1,

    // En-passant ma'lumoti: {row, col} yoki null
    enPassant: null,

    // 50 yurish qoidasi uchun (hozircha faqat kelajak uchun)
    halfmoveClock: 0,

    // Rokirowka huquqlari
    castling: {
      w: { kingSide: true, queenSide: true },
      b: { kingSide: true, queenSide: true },
    },
  };
};

// Holatni FEN formatiga o'girish – Stockfish uchun
GC.stateToFEN = function (state) {
  const board = state.board;
  const rows = [];

  for (let r = 0; r < 8; r++) {
    let empty = 0;
    let fenRow = "";

    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];

      if (!piece || piece === "." || piece === "") {
        empty++;
      } else {
        if (empty > 0) {
          fenRow += empty;
          empty = 0;
        }
        fenRow += piece; // "P", "p", "K", "k" va h.k.
      }
    }

    if (empty > 0) {
      fenRow += empty;
    }

    rows.push(fenRow);
  }

  const boardPart = rows.join("/");

  // Navbat kimda
  const sideToMove = state.turn === "b" ? "b" : "w";

  // Rokirowka huquqlari
  let castling = "";
  if (state.castling) {
    if (state.castling.w) {
      if (state.castling.w.kingSide)  castling += "K";
      if (state.castling.w.queenSide) castling += "Q";
    }
    if (state.castling.b) {
      if (state.castling.b.kingSide)  castling += "k";
      if (state.castling.b.queenSide) castling += "q";
    }
  }
  if (!castling) castling = "-";

  // En passant katagi
  let ep = "-";
  if (state.enPassant) {
    ep = GC.squareToNotation(state.enPassant.row, state.enPassant.col);
  }

  const halfmove = state.halfmoveClock || 0;
  const fullmove = state.moveNumber || 1;

  // FEN: board side castling ep halfmove fullmove
  return (
    boardPart +
    " " +
    sideToMove +
    " " +
    castling +
    " " +
    ep +
    " " +
    halfmove +
    " " +
    fullmove
  );
};

// Holatni chuqur nusxa olish
GC.cloneState = function (state) {
  return {
    board: state.board.map(row => row.slice()),
    turn: state.turn,
    moveNumber: state.moveNumber,
    enPassant: state.enPassant
      ? { row: state.enPassant.row, col: state.enPassant.col }
      : null,
    halfmoveClock: state.halfmoveClock,
    castling: {
      w: {
        kingSide:  state.castling.w.kingSide,
        queenSide: state.castling.w.queenSide,
      },
      b: {
        kingSide:  state.castling.b.kingSide,
        queenSide: state.castling.b.queenSide,
      },
    },
  };
};

// Koordinatani notatsiyaga: (row, col) -> "e4"
GC.squareToNotation = function (row, col) {
  const files = "abcdefgh";
  const file = files[col];
  const rank = 8 - row;
  return file + rank;
};

// Holatga yurishni qo'llash
// (isLegalMove allaqachon tekshirgan deb hisoblaymiz)
GC.applyMove = function (state, fromRow, fromCol, toRow, toCol) {
  const board  = state.board;
  const piece  = board[fromRow][fromCol];
  const target = board[toRow][toCol];

  if (!piece || piece === ".") return;

  const isWhite = piece === piece.toUpperCase();
  const color   = isWhite ? "w" : "b";
  const p       = piece.toLowerCase();
  const dr      = toRow - fromRow;
  const dc      = toCol - fromCol;

  let isCapture = false;
  let isPawn    = p === "p";

  // Eski en-passant
  const oldEnPassant = state.enPassant;

  // En-passant capture
  if (
    isPawn &&
    target === "." &&
    Math.abs(dc) === 1 &&
    (isWhite ? dr === -1 : dr === 1) &&
    oldEnPassant &&
    oldEnPassant.row === toRow &&
    oldEnPassant.col === toCol
  ) {
    const capRow = toRow + (isWhite ? 1 : -1);
    board[capRow][toCol] = ".";
    isCapture = true;
  }

  // Oddiy capture
  if (target && target !== ".") {
    isCapture = true;

    // Rookni urib qo'ysak – rokirovka huquqini o'chiramiz
    if (target.toLowerCase() === "r") {
      const capturedIsWhite = target === target.toUpperCase();
      const capturedColor   = capturedIsWhite ? "w" : "b";
      const rookRow         = capturedIsWhite ? 7 : 0;

      if (toRow === rookRow && toCol === 0) {
        state.castling[capturedColor].queenSide = false;
      }
      if (toRow === rookRow && toCol === 7) {
        state.castling[capturedColor].kingSide = false;
      }
    }
  }

  // Start katakni bo'shatamiz
  board[fromRow][fromCol] = ".";

  // Rokirowka – shoh 2 katak o'ng/chapga yurdi
  if (p === "k" && fromRow === toRow && Math.abs(dc) === 2) {
    const row = fromRow;

    if (toCol === 6) {
      // King-side: e -> g, rook: h -> f
      board[row][6] = piece;
      board[row][4] = ".";
      board[row][5] = board[row][7];
      board[row][7] = ".";
    } else if (toCol === 2) {
      // Queen-side: e -> c, rook: a -> d
      board[row][2] = piece;
      board[row][4] = ".";
      board[row][3] = board[row][0];
      board[row][0] = ".";
    } else {
      board[toRow][toCol] = piece;
    }

    state.castling[color].kingSide  = false;
    state.castling[color].queenSide = false;
  } else {
    // Oddiy yurish
    board[toRow][toCol] = piece;

    // Rook harakat qilsa – rokirovka huquqi o'chadi
    if (p === "r") {
      const rookRow = isWhite ? 7 : 0;
      if (fromRow === rookRow && fromCol === 0) {
        state.castling[color].queenSide = false;
      }
      if (fromRow === rookRow && fromCol === 7) {
        state.castling[color].kingSide = false;
      }
    }

    // Shoh harakat qilsa – rokirovka yo'q
    if (p === "k") {
      state.castling[color].kingSide  = false;
      state.castling[color].queenSide = false;
    }
  }

  // Pawn promotion (ferzga)
  //if (isPawn) {
  //  const lastRank = isWhite ? 0 : 7;
  //  if (toRow === lastRank) {
   //   board[toRow][toCol] = isWhite ? "Q" : "q";
  //  }
 // }

  // Yangi en-passant huquqi
  state.enPassant = null;
  if (isPawn && Math.abs(dr) === 2 && dc === 0) {
    const midRow = (fromRow + toRow) / 2;
    state.enPassant = { row: midRow, col: fromCol };
  }

  // Halfmove clock
  if (isPawn || isCapture) {
    state.halfmoveClock = 0;
  } else {
    state.halfmoveClock = (state.halfmoveClock || 0) + 1;
  }

  // Navbatni almashtiramiz
  state.turn = state.turn === "w" ? "b" : "w";

  // Faqat qora yurib bo'lganda moveNumber++
  if (state.turn === "w") {
    state.moveNumber += 1;
  }
};
