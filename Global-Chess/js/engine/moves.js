// js/engine/moves.js
window.GC = window.GC || {};

GC.isOwnPiece = function (piece, turn) {
  if (!piece || piece === ".") return false;
  const isWhite = piece === piece.toUpperCase();
  return (isWhite && turn === "w") || (!isWhite && turn === "b");
};

GC.isEnemyPiece = function (piece, turn) {
  if (!piece || piece === ".") return false;
  const isWhite = piece === piece.toUpperCase();
  return (isWhite && turn === "b") || (!isWhite && turn === "w");
};

function isInsideBoard(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isPathClear(board, fromRow, fromCol, toRow, toCol) {
  const dRow = Math.sign(toRow - fromRow);
  const dCol = Math.sign(toCol - fromCol);
  let r = fromRow + dRow;
  let c = fromCol + dCol;

  while (r !== toRow || c !== toCol) {
    if (board[r][c] !== ".") return false;
    r += dRow;
    c += dCol;
  }
  return true;
}

// Figura rangini aniqlash: "w" / "b" yoki null
function getPieceColor(piece) {
  if (!piece || piece === ".") return null;
  return (piece === piece.toUpperCase()) ? "w" : "b";
}

// Taxtadagi berilgan rangdagi shoh joylashuvi
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

// Bitta figura (fromRow,fromCol) (toRow,toCol) katakka HUJUM qilyaptimi?
function pieceAttacksSquare(state, fromRow, fromCol, toRow, toCol, attackerColor) {
  const board = state.board;
  const piece = board[fromRow][fromCol];
  if (!piece || piece === ".") return false;

  const color = getPieceColor(piece);
  if (color !== attackerColor) return false;

  const isWhite = (color === "w");
  const p = piece.toLowerCase();
  const dr = toRow - fromRow;
  const dc = toCol - fromCol;
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  // ===== Pawn hujumi =====
  if (p === "p") {
    const dir = isWhite ? -1 : 1;
    return (dr === dir && Math.abs(dc) === 1);
  }

  // ===== Knight hujumi =====
  if (p === "n") {
    return (
      (absDr === 2 && absDc === 1) ||
      (absDr === 1 && absDc === 2)
    );
  }

  // ===== Bishop (diagonal) =====
  if (p === "b") {
    if (absDr === absDc && absDr !== 0) {
      return isPathClear(board, fromRow, fromCol, toRow, toCol);
    }
    return false;
  }

  // ===== Rook (vertikal/gorizontal) =====
  if (p === "r") {
    if (
      (absDr === 0 && absDc > 0) ||
      (absDc === 0 && absDr > 0)
    ) {
      return isPathClear(board, fromRow, fromCol, toRow, toCol);
    }
    return false;
  }

  // ===== Queen (Bishop + Rook) =====
  if (p === "q") {
    const isDiag = absDr === absDc && absDr !== 0;
    const isLine = (absDr === 0 && absDc > 0) || (absDc === 0 && absDr > 0);
    if (!isDiag && !isLine) return false;
    return isPathClear(board, fromRow, fromCol, toRow, toCol);
  }

  // ===== King hujumi (yon atrof 1 katak) =====
  if (p === "k") {
    return (absDr <= 1 && absDc <= 1 && (absDr + absDc > 0));
  }

  return false;
}

// Berilgan katakka (row,col) ga byColor rangidagi figuralar hujum qilayaptimi?
GC.isSquareAttacked = function (state, row, col, byColor) {
  const board = state.board;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece === ".") continue;
      const color = getPieceColor(piece);
      if (color !== byColor) continue;

      if (pieceAttacksSquare(state, r, c, row, col, byColor)) {
        return true;
      }
    }
  }

  return false;
};

// color = "w" / "b" shoh hozir shax ostidami?
GC.isKingInCheck = function (state, color) {
  const kingPos = GC.findKingPosition(state, color);
  if (!kingPos) return false;
  const enemy = (color === "w") ? "b" : "w";
  return GC.isSquareAttacked(state, kingPos.row, kingPos.col, enemy);
};

// FIGURA QOIDALARI + KING SAFETY bilan yakuniy legal move
GC.isLegalMove = function (state, fromRow, fromCol, toRow, toCol) {
  if (!isInsideBoard(fromRow, fromCol) || !isInsideBoard(toRow, toCol)) {
    return false;
  }

  const board  = state.board;
  const piece  = board[fromRow][fromCol];
  const target = board[toRow][toCol];

  if (!piece || piece === ".") return false;

  // ❌ Qirolni yeb bo'lmaydi – hech qaysi figura "k"/"K" ni ura olmaydi
  if (target && target.toLowerCase() === "k") {
    return false;
  }

  const turn = state.turn;
  if (!GC.isOwnPiece(piece, turn)) return false;
  if (GC.isOwnPiece(target, turn)) return false;

  const isWhite = piece === piece.toUpperCase();
  const p       = piece.toLowerCase();
  const dr      = toRow - fromRow;
  const dc      = toCol - fromCol;
  const absDr   = Math.abs(dr);
  const absDc   = Math.abs(dc);

  let basicLegal     = false;
  let isCastlingMove = false;

  // ===== Pawn (piyoda) =====
  if (p === "p") {
    const dir       = isWhite ? -1 : 1;
    const startRow  = isWhite ? 6 : 1;
    const enPassant = state.enPassant;

    // 1 qadam oldinga
    if (dc === 0 && dr === dir && target === ".") {
      basicLegal = true;
    }

    // 2 qadam start qatoridan
    if (
      !basicLegal &&
      dc === 0 &&
      dr === 2 * dir &&
      fromRow === startRow &&
      target === "." &&
      board[fromRow + dir][fromCol] === "."
    ) {
      basicLegal = true;
    }

    // Diagonalga oddiy urish
    if (
      !basicLegal &&
      Math.abs(dc) === 1 &&
      dr === dir &&
      target !== "." &&
      GC.isEnemyPiece(target, turn)
    ) {
      basicLegal = true;
    }

    // En-passant
    if (
      !basicLegal &&
      Math.abs(dc) === 1 &&
      dr === dir &&
      target === "." &&
      enPassant &&
      enPassant.row === toRow &&
      enPassant.col === toCol
    ) {
      basicLegal = true;
    }
  }

  // ===== Knight (ot) =====
  if (p === "n") {
    if (
      (absDr === 2 && absDc === 1) ||
      (absDr === 1 && absDc === 2)
    ) {
      basicLegal = true;
    }
  }

  // ===== Bishop (fil) =====
  if (p === "b") {
    if (absDr === absDc && absDr !== 0) {
      basicLegal = isPathClear(board, fromRow, fromCol, toRow, toCol);
    }
  }

  // ===== Rook =====
  if (p === "r") {
    if (
      (absDr === 0 && absDc > 0) ||
      (absDc === 0 && absDr > 0)
    ) {
      basicLegal = isPathClear(board, fromRow, fromCol, toRow, toCol);
    }
  }

  // ===== Queen (ferz) =====
  if (p === "q") {
    const isDiag = absDr === absDc && absDr !== 0;
    const isLine = (absDr === 0 && absDc > 0) || (absDc === 0 && absDr > 0);
    if (isDiag || isLine) {
      basicLegal = isPathClear(board, fromRow, fromCol, toRow, toCol);
    }
  }

  // ===== King (shoh) =====
  if (p === "k") {
    // Oddiy 1 katak
    if (absDr <= 1 && absDc <= 1 && (absDr + absDc > 0)) {
      basicLegal = true;
    }

    // Rokirowka: 2 katak o'ng/chapga
    if (!basicLegal && fromRow === toRow && absDc === 2) {
      const color    = isWhite ? "w" : "b";
      const castling = state.castling && state.castling[color];
      if (!castling) return false;

      const row  = fromRow;
      const side = (toCol > fromCol) ? "kingSide" : "queenSide";
      if (!castling[side]) return false;

      const rookCol  = side === "kingSide" ? 7 : 0;
      const rookChar = isWhite ? "R" : "r";

      if (board[row][rookCol] !== rookChar) return false;

      const step = side === "kingSide" ? 1 : -1;
      for (let c = fromCol + step; c !== rookCol; c += step) {
        if (board[row][c] !== ".") return false;
      }

      basicLegal = true;
      isCastlingMove = true;
    }
  }

  // Agar figura qoidalari bo'yicha ham legal bo'lmasa – bo'ldi
  if (!basicLegal) return false;

  // ==== KING SAFETY: yurishdan keyin o'z shohimiz shax ostida qolmasligi shart ====
  const clone = GC.cloneState
    ? GC.cloneState(state)
    : JSON.parse(JSON.stringify(state));

  GC.applyMove(clone, fromRow, fromCol, toRow, toCol);

  const color = isWhite ? "w" : "b";
  if (GC.isKingInCheck && GC.isKingInCheck(clone, color)) {
    return false;
  }

  // ==== ROKIROWKA uchun qo'shimcha: shoh yo'ldagi kataklardan "shax orqali" o'tmasligi ====
  if (isCastlingMove && GC.isSquareAttacked) {
    const enemy = (color === "w") ? "b" : "w";
    const row   = fromRow;
    const step  = (toCol > fromCol) ? 1 : -1;

    // e1/e8 dagi boshlang'ich katak ham shax ostida bo'lmasligi kerak
    for (let c = fromCol; c !== toCol + step; c += step) {
      if (GC.isSquareAttacked(state, row, c, enemy)) {
        return false;
      }
    }
  }

  return true;
};

// Hozirgi navbatdagi tomonga KING SAFETY bilan barcha legal yurishlar
GC.generateAllLegalMoves = function (state) {
  const moves = [];
  const board = state.board;
  const turn  = state.turn; // "w" yoki "b"

  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (!GC.isOwnPiece(piece, turn)) continue;

      for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
          if (GC.isLegalMove(state, fromRow, fromCol, toRow, toCol)) {
            moves.push({ fromRow, fromCol, toRow, toCol });
          }
        }
      }
    }
  }

  return moves;
};
