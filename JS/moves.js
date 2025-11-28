/* ================================
   1. FUNKSIYALAR: asosiy yordamchilar
   ================================ */

function pieceColor(piece) {
  return piece === piece.toUpperCase() ? "white" : "black";
}

function coordToSquare(row, col) {
  const file = files[col];
  const rank = 8 - row;
  return file + rank;
}

function isInsideBoard(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isPathClear(from, to, pos) {
  const dr = Math.sign(to.row - from.row);
  const dc = Math.sign(to.col - from.col);
  let r = from.row + dr;
  let c = from.col + dc;

  while (r !== to.row || c !== to.col) {
    if (pos[r][c]) return false;
    r += dr;
    c += dc;
  }
  return true;
}

function clonePosition(pos) {
  return pos.map(row => row.slice());
}

/* ================================
   2. AL0HIDA FIGURALAR YURISH QOIDALARI
   ================================ */

function isPawnMoveLegal(piece, from, to, pos) {
  const color = pieceColor(piece);
  const dir = color === "white" ? -1 : 1;
  const startRow = color === "white" ? 6 : 1;
  const deltaRow = to.row - from.row;
  const deltaCol = to.col - from.col;
  const target = pos[to.row][to.col];

  if (deltaCol === 0) {
    if (deltaRow === dir && !target) return true;
    if (
      from.row === startRow &&
      deltaRow === 2 * dir &&
      !target &&
      !pos[from.row + dir][from.col]
    ) {
      return true;
    }
    return false;
  }

  if (Math.abs(deltaCol) === 1 && deltaRow === dir) {
    if (target && pieceColor(target) !== color) return true;

    if (
      !target &&
      enPassantTarget &&
      enPassantTarget.row === to.row &&
      enPassantTarget.col === to.col
    ) {
      return true;
    }
  }
  return false;
}

function isKnightMoveLegal(from, to) {
  const dr = Math.abs(to.row - from.row);
  const dc = Math.abs(to.col - from.col);
  return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
}

function isBishopMoveLegal(from, to, pos) {
  const dr = Math.abs(to.row - from.row);
  const dc = Math.abs(to.col - from.col);
  if (dr !== dc) return false;
  return isPathClear(from, to, pos);
}

function isRookMoveLegal(from, to, pos) {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  if (dr !== 0 && dc !== 0) return false;
  if (dr === 0 && dc === 0) return false;
  return isPathClear(from, to, pos);
}

function isQueenMoveLegal(from, to, pos) {
  return isBishopMoveLegal(from, to, pos) || isRookMoveLegal(from, to, pos);
}

function isKingMoveLegal(from, to) {
  const dr = Math.abs(to.row - from.row);
  const dc = Math.abs(to.col - from.col);
  return Math.max(dr, dc) === 1;
}

/* ================================
   3. BIR YURISHNING LEGALLIGI
   ================================ */

function isLegalMove(piece, from, to, pos) {
  if (!isInsideBoard(to.row, to.col)) return false;

  const target = pos[to.row][to.col];
  const color = pieceColor(piece);

  if (target && pieceColor(target) === color) return false;

  switch (piece.toLowerCase()) {
    case "p": return isPawnMoveLegal(piece, from, to, pos);
    case "n": return isKnightMoveLegal(from, to);
    case "b": return isBishopMoveLegal(from, to, pos);
    case "r": return isRookMoveLegal(from, to, pos);
    case "q": return isQueenMoveLegal(from, to, pos);
    case "k": return isKingMoveLegal(from, to);
    default : return false;
  }
}

/* ================================
   4. SHOHNI TOPISH, HUJUM TEKSHIRISH
   ================================ */

function findKingPos(color, pos) {
  const kingChar = color === "white" ? "K" : "k";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (pos[r][c] === kingChar) return { row: r, col: c };
    }
  }
  return null;
}

function isSquareAttacked(row, col, attackerColor, pos) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = pos[r][c];
      if (!piece) continue;
      if (pieceColor(piece) !== attackerColor) continue;

      const from = { row: r, col: c };
      const to   = { row, col };

      if (isLegalMove(piece, from, to, pos)) return true;
    }
  }
  return false;
}

function isKingInCheck(color, pos) {
  const kingPos = findKingPos(color, pos);
  if (!kingPos) return false;
  const enemy = color === "white" ? "black" : "white";
  return isSquareAttacked(kingPos.row, kingPos.col, enemy, pos);
}

/* ================================
   5. ROKIROVKA (CASTLING)
   ================================ */

if (typeof castlingRights === "undefined") {
  var castlingRights = {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true }
  };
}

function canCastle(color, side, pos) {
  const rights = castlingRights[color][side];
  if (!rights) return false;

  const row = color === "white" ? 7 : 0;
  const kingCol = 4;
  const enemy = color === "white" ? "black" : "white";
  const kingChar = color === "white" ? "K" : "k";
  const rookChar = color === "white" ? "R" : "r";

  if (pos[row][kingCol] !== kingChar) return false;

  const rookCol = side === "kingSide" ? 7 : 0;
  if (pos[row][rookCol] !== rookChar) return false;

  const step = side === "kingSide" ? 1 : -1;

  for (let c = kingCol + step; c !== rookCol; c += step) {
    if (pos[row][c]) return false;
  }

  if (isKingInCheck(color, pos)) return false;

  const passCol1 = kingCol + step;
  const passCol2 = kingCol + 2 * step;
  if (isSquareAttacked(row, passCol1, enemy, pos)) return false;
  if (isSquareAttacked(row, passCol2, enemy, pos)) return false;

  return true;
}

/* ================================
   6. KING XAVFSIZLIGI BILAN YURISHNI TEKSHIRISH
   ================================ */

function isMoveLegalWithKingSafety(piece, from, to, pos) {
  const color = pieceColor(piece);
  const pieceLower = piece.toLowerCase();

  if (
    pieceLower === "k" &&
    from.row === to.row &&
    Math.abs(to.col - from.col) === 2
  ) {
    const side = to.col > from.col ? "kingSide" : "queenSide";
    if (!canCastle(color, side, pos)) return false;

    const newPos = clonePosition(pos);
    const row = from.row;
    const kingChar = color === "white" ? "K" : "k";
    const rookChar = color === "white" ? "R" : "r";
    const rookFromCol = side === "kingSide" ? 7 : 0;
    const rookToCol   = side === "kingSide" ? 5 : 3;
    const kingToCol   = side === "kingSide" ? 6 : 2;

    newPos[row][from.col]    = "";
    newPos[row][kingToCol]   = kingChar;
    newPos[row][rookFromCol] = "";
    newPos[row][rookToCol]   = rookChar;

    return !isKingInCheck(color, newPos);
  }

  if (!isLegalMove(piece, from, to, pos)) return false;

  const newPos = clonePosition(pos);
  const target = newPos[to.row][to.col];

  if (pieceLower === "p") {
    if (
      !target &&
      enPassantTarget &&
      enPassantTarget.row === to.row &&
      enPassantTarget.col === to.col &&
      Math.abs(to.col - from.col) === 1
    ) {
      newPos[from.row][to.col] = "";
    }
  }

  newPos[to.row][to.col] = piece;
  newPos[from.row][from.col] = "";

  if (pieceLower === "p") {
    if (color === "white" && to.row === 0) newPos[to.row][to.col] = "Q";
    else if (color === "black" && to.row === 7) newPos[to.row][to.col] = "q";
  }

  return !isKingInCheck(color, newPos);
}

/* ================================
   7. UMUMIY HOLATLAR: CHECK / MATE / PAT
   ================================ */

function updateCheckState() {
  checkedKing = null;

  if (isKingInCheck("white", position)) {
    const kp = findKingPos("white", position);
    checkedKing = { color: "white", ...kp };
  } else if (isKingInCheck("black", position)) {
    const kp = findKingPos("black", position);
    checkedKing = { color: "black", ...kp };
  }

  if (typeof updateCheckIndicator === "function") {
    updateCheckIndicator();
  }
}

function hasAnyLegalMove(color, pos) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = pos[r][c];
      if (!piece || pieceColor(piece) !== color) continue;

      const from = { row: r, col: c };

      for (let r2 = 0; r2 < 8; r2++) {
        for (let c2 = 0; c2 < 8; c2++) {
          const to = { row: r2, col: c2 };
          if (r2 === r && c2 === c) continue;
          if (isMoveLegalWithKingSafety(piece, from, to, pos)) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function updateGameState() {
  updateCheckState();

  gameOver = false;
  gameResult = null;

  const colorToMove = currentTurn;
  const inCheck = isKingInCheck(colorToMove, position);
  const anyMove = hasAnyLegalMove(colorToMove, position);

  if (!anyMove) {
    gameOver = true;
    if (inCheck) {
      const winner = colorToMove === "white" ? "black" : "white";
      gameResult = { type: "checkmate", winner };
    } else {
      gameResult = { type: "stalemate", winner: null };
    }
  }

  if (typeof updateGameIndicator === "function") {
    updateGameIndicator();
  }
}

/* ================================
   8. KONKRET FIGURA UCHUN LEGAL YURISHLAR
   ================================ */

function getLegalMoves(from) {
  const piece = position[from.row][from.col];
  if (!piece) return [];

  const moves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const to = { row: r, col: c };
      if (r === from.row && c === from.col) continue;

      if (isMoveLegalWithKingSafety(piece, from, to, position)) {
        moves.push(to);
      }
    }
  }
  return moves;
}

/* --- AI uchun barcha legal yurishlarni yig‘ish --- */
function collectAllLegalMoves(color, pos) {
  const moves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = pos[r][c];
      if (!piece || pieceColor(piece) !== color) continue;

      const from = { row: r, col: c };

      for (let r2 = 0; r2 < 8; r2++) {
        for (let c2 = 0; c2 < 8; c2++) {
          const to = { row: r2, col: c2 };
          if (r2 === r && c2 === c) continue;
          if (!isMoveLegalWithKingSafety(piece, from, to, pos)) continue;

          let promotion = null;
          const pieceLower = piece.toLowerCase();
          if (pieceLower === "p") {
            if (color === "black" && to.row === 7) promotion = "q";
            if (color === "white" && to.row === 0) promotion = "Q";
          }

          moves.push({ from, to, promotion });
        }
      }
    }
  }
  return moves;
}

/* ================================
   9. SAN GENERATSIYASI
   ================================ */

function generateSAN(piece, from, to, promotionPiece, prevPos, newPos) {
  const color = pieceColor(piece);
  const pieceLower = piece.toLowerCase();

  if (
    pieceLower === "k" &&
    from.row === to.row &&
    Math.abs(to.col - from.col) === 2
  ) {
    let san = (to.col > from.col) ? "O-O" : "O-O-O";
    const enemy = color === "white" ? "black" : "white";
    const inCheck = isKingInCheck(enemy, newPos);
    const anyMove = hasAnyLegalMove(enemy, newPos);
    if (inCheck && !anyMove) san += "#";
    else if (inCheck) san += "+";
    return san;
  }

  const destSquare = coordToSquare(to.row, to.col);

  let capture = false;
  const targetBefore = prevPos[to.row][to.col];
  if (targetBefore && pieceColor(targetBefore) !== color) {
    capture = true;
  }
  if (!capture && pieceLower === "p" && from.col !== to.col && !targetBefore) {
    capture = true;
  }

  let sanPiece = piece.toUpperCase();
  if (sanPiece === "P") sanPiece = "";

  let disambiguation = "";
  if (sanPiece) {
    const candidates = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (r === from.row && c === from.col) continue;
        if (prevPos[r][c] === piece) {
          const otherFrom = { row: r, col: c };
          if (isMoveLegalWithKingSafety(piece, otherFrom, to, prevPos)) {
            candidates.push(otherFrom);
          }
        }
      }
    }

    if (candidates.length) {
      const sameFile = candidates.some(p => p.col === from.col);
      const sameRank = candidates.some(p => p.row === from.row);
      const fileChar = files[from.col];
      const rankChar = 8 - from.row;
      if (!sameFile) disambiguation = fileChar;
      else if (!sameRank) disambiguation = String(rankChar);
      else disambiguation = fileChar + rankChar;
    }
  }

  let san = "";

  if (!sanPiece && capture) {
    san += files[from.col];
  }

  san += sanPiece + disambiguation;

  if (capture) san += "x";

  san += destSquare;

  if (promotionPiece) {
    san += "=" + promotionPiece.toUpperCase();
  }

  const enemy = color === "white" ? "black" : "white";
  const inCheck = isKingInCheck(enemy, newPos);
  const anyMove = hasAnyLegalMove(enemy, newPos);

  if (inCheck && !anyMove) san += "#";
  else if (inCheck) san += "+";

  return san;
}
