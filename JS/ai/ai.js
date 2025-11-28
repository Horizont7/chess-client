// ==========================================
//  AI CONFIG – ELOga YAQIN LEVEL DARJALARI
// ==========================================
//
// depth – qanchalik chuqur qidiradi
// randomness – ba'zida eng yaxshi yurish o'rniga 2-3-o'rinni tanlash
// blunderChance – ba'zida juda yomon yurishni tanlash ehtimoli
//
window.AI_CONFIG = {
  easy: {        // ~ 600–900 Elo
    depth: 1,
    randomness: 0.6,
    blunderChance: 0.35
  },
  medium: {      // ~ 1200–1400 Elo
    depth: 2,
    randomness: 0.35,
    blunderChance: 0.18
  },
  hard: {        // ~ 1700–1900 Elo
    depth: 3,
    randomness: 0.15,
    blunderChance: 0.07
  },
  expert: {      // ~ 2000–2200 Elo
    depth: 4,
    randomness: 0.05,
    blunderChance: 0.02
  },
  impossible: {  // maksimal qiyin: chuqurroq hisoblaydi
    depth: 6,            // AVVAL 5 edi, endi 6 ply
    randomness: 0.0,
    blunderChance: 0.0
  }
};

// Global konstanta – baholash uchun
const AI_PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

const AI_CHECKMATE_SCORE = 1000000;

// ==========================================
//  YORDAMCHI FUNKSIYALAR (BOARD, PIECES)
// ==========================================

function aiCloneBoard(board) {
  // Agar sendagi clonePosition funksiyasi bo'lsa – undan foydalanamiz
  if (typeof clonePosition === "function") {
    return clonePosition(board);
  }
  return board.map(row => row.slice());
}

function aiPieceColor(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? "white" : "black";
}

function aiOpponent(color) {
  return color === "white" ? "black" : "white";
}

// Taxtadan qirol pozitsiyasini topish
function aiFindKing(board, color) {
  const target = color === "white" ? "K" : "k";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === target) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

// ==========================================
//  HUJUM TEKSHIRISH: KATAK HUJUM OSTIDAMI
// ==========================================

function aiIsSquareAttacked(board, row, col, byColor) {
  const oppColor = byColor;

  // *** MUHIM TUZATISH ***
  // Target katakka hujum qilayotgan piyoda qaerda turganini tekshiramiz.
  // White pawn targetdan BIR QATOR PASTDA bo'ladi (row + 1),
  // black pawn esa BIR QATOR YUQORIDA (row - 1).
  const dirPawn = (oppColor === "white") ? 1 : -1;
  const pawnRow = row + dirPawn;

  // 1) Pawn hujumi
  for (let dc of [-1, 1]) {
    const cc = col + dc;
    if (pawnRow >= 0 && pawnRow < 8 && cc >= 0 && cc < 8) {
      const p = board[pawnRow][cc];
      if (p && aiPieceColor(p) === oppColor && p.toLowerCase() === "p") {
        return true;
      }
    }
  }

  // 2) Knight hujumi
  const knightJumps = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];
  for (let [dr, dc] of knightJumps) {
    const rr = row + dr;
    const cc = col + dc;
    if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
    const p = board[rr][cc];
    if (p && aiPieceColor(p) === oppColor && p.toLowerCase() === "n") {
      return true;
    }
  }

  // 3) Slayderlar: rook / bishop / queen
  const rookDirs = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];
  const bishopDirs = [
    [-1, -1], [-1, 1], [1, -1], [1, 1]
  ];

  // Rook va Queen (straight lines)
  for (let [dr, dc] of rookDirs) {
    let rr = row + dr;
    let cc = col + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const p = board[rr][cc];
      if (p) {
        if (aiPieceColor(p) === oppColor) {
          const lower = p.toLowerCase();
          if (lower === "r" || lower === "q") return true;
        }
        break; // boshqa figura to‘sadi
      }
      rr += dr;
      cc += dc;
    }
  }

  // Bishop va Queen (diagonals)
  for (let [dr, dc] of bishopDirs) {
    let rr = row + dr;
    let cc = col + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const p = board[rr][cc];
      if (p) {
        if (aiPieceColor(p) === oppColor) {
          const lower = p.toLowerCase();
          if (lower === "b" || lower === "q") return true;
        }
        break;
      }
      rr += dr;
      cc += dc;
    }
  }

  // 4) Qirol hujumi (yonida turgan bo'lishi mumkin)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = row + dr;
      const cc = col + dc;
      if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
      const p = board[rr][cc];
      if (p && aiPieceColor(p) === oppColor && p.toLowerCase() === "k") {
        return true;
      }
    }
  }

  return false;
}

// Qirol check ostidami?
function aiIsKingInCheck(board, color) {
  const kingPos = aiFindKing(board, color);
  if (!kingPos) return false; // nazariy bo'lmasligi kerak
  return aiIsSquareAttacked(board, kingPos.row, kingPos.col, aiOpponent(color));
}

// ==========================================
//  PSEUDO LEGAL HAR BIR FIGURA YURISHLARI
// ==========================================

function aiGeneratePseudoMovesForPiece(board, row, col, color) {
  const moves = [];
  const piece = board[row][col];
  if (!piece) return moves;
  if (aiPieceColor(piece) !== color) return moves;

  const lower = piece.toLowerCase();

  // Pawn
  if (lower === "p") {
    const dir = (color === "white") ? -1 : 1;
    const startRow = (color === "white") ? 6 : 1;
    const promotionRow = (color === "white") ? 0 : 7;

    // Oldinga 1 qadam
    const r1 = row + dir;
    if (r1 >= 0 && r1 < 8) {
      if (!board[r1][col]) {
        // Promotion
        if (r1 === promotionRow) {
          moves.push({ fromRow: row, fromCol: col, toRow: r1, toCol: col, promotion: color === "white" ? "Q" : "q" });
        } else {
          moves.push({ fromRow: row, fromCol: col, toRow: r1, toCol: col });
        }

        // Start pozitsiyadan 2 qadam
        const r2 = row + 2 * dir;
        if (row === startRow && !board[r2][col]) {
          moves.push({ fromRow: row, fromCol: col, toRow: r2, toCol: col });
        }
      }
    }

    // Diagonal capture
    for (let dc of [-1, 1]) {
      const cc = col + dc;
      const rr = row + dir;
      if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
      const target = board[rr][cc];
      if (target && aiPieceColor(target) === aiOpponent(color)) {
        // Promotion capture
        if (rr === promotionRow) {
          moves.push({ fromRow: row, fromCol: col, toRow: rr, toCol: cc, promotion: color === "white" ? "Q" : "q" });
        } else {
          moves.push({ fromRow: row, fromCol: col, toRow: rr, toCol: cc });
        }
      }
    }

    // En passantni AI uchun hozircha hisoblamaymiz
    return moves;
  }

  // Knight
  if (lower === "n") {
    const jumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (let [dr, dc] of jumps) {
      const rr = row + dr;
      const cc = col + dc;
      if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
      const target = board[rr][cc];
      if (!target || aiPieceColor(target) === aiOpponent(color)) {
        moves.push({ fromRow: row, fromCol: col, toRow: rr, toCol: cc });
      }
    }
    return moves;
  }

  // Sliding pieces (bishop, rook, queen)
  const rookDirs = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];
  const bishopDirs = [
    [-1, -1], [-1, 1], [1, -1], [1, 1]
  ];

  if (lower === "b" || lower === "r" || lower === "q") {
    const dirs = [];
    if (lower === "b" || lower === "q") dirs.push(...bishopDirs);
    if (lower === "r" || lower === "q") dirs.push(...rookDirs);

    for (let [dr, dc] of dirs) {
      let rr = row + dr;
      let cc = col + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const target = board[rr][cc];
        if (!target) {
          moves.push({ fromRow: row, fromCol: col, toRow: rr, toCol: cc });
        } else {
          if (aiPieceColor(target) === aiOpponent(color)) {
            moves.push({ fromRow: row, fromCol: col, toRow: rr, toCol: cc });
          }
          break; // to'siqqa urildik
        }
        rr += dr;
        cc += dc;
      }
    }
    return moves;
  }

  // King (castlingni AI uchun hozircha qo'shmaymiz)
  if (lower === "k") {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const rr = row + dr;
        const cc = col + dc;
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        const target = board[rr][cc];
        if (!target || aiPieceColor(target) === aiOpponent(color)) {
          moves.push({ fromRow: row, fromCol: col, toRow: rr, toCol: cc });
        }
      }
    }
    return moves;
  }

  return moves;
}

// Barcha LEGAL yurishlar (qirol checkda qolmaydi)
function aiGenerateAllLegalMoves(board, color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || aiPieceColor(piece) !== color) continue;

      const pseudo = aiGeneratePseudoMovesForPiece(board, r, c, color);
      for (let m of pseudo) {
        const newBoard = aiCloneBoard(board);
        aiApplyMove(newBoard, m);
        if (!aiIsKingInCheck(newBoard, color)) {
          moves.push(m);
        }
      }
    }
  }
  return moves;
}

// Taxtada yurishni qo'llash
function aiApplyMove(board, move) {
  const piece = board[move.fromRow][move.fromCol];
  board[move.fromRow][move.fromCol] = "";
  if (move.promotion) {
    board[move.toRow][move.toCol] = move.promotion;
  } else {
    board[move.toRow][move.toCol] = piece;
  }
}

// ==========================================
//  BAHOLASH FUNKSIYASI
// ==========================================

function aiEvaluateBoard(board, aiColor) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = AI_PIECE_VALUES[p.toLowerCase()] || 0;
      const color = aiPieceColor(p);
      if (color === aiColor) score += val;
      else score -= val;
    }
  }
  return score;
}

// ==========================================
//  MINIMAX + ALPHA-BETA
// ==========================================

function aiMinimax(board, depth, alpha, beta, maximizing, aiColor) {
  const colorToMove = maximizing ? aiColor : aiOpponent(aiColor);

  // Leaf: depth tugadi
  if (depth === 0) {
    return aiEvaluateBoard(board, aiColor);
  }

  const moves = aiGenerateAllLegalMoves(board, colorToMove);

  // Yurish bo'lmasa – mate yoki pat
  if (moves.length === 0) {
    if (aiIsKingInCheck(board, colorToMove)) {
      // Mated
      return (colorToMove === aiColor)
        ? -AI_CHECKMATE_SCORE
        : AI_CHECKMATE_SCORE;
    } else {
      // Patt
      return 0;
    }
  }

  if (maximizing) {
    let value = -Infinity;
    for (let m of moves) {
      const nb = aiCloneBoard(board);
      aiApplyMove(nb, m);
      const child = aiMinimax(nb, depth - 1, alpha, beta, false, aiColor);
      if (child > value) value = child;
      if (value > alpha) alpha = value;
      if (beta <= alpha) break; // pruning
    }
    return value;
  } else {
    let value = Infinity;
    for (let m of moves) {
      const nb = aiCloneBoard(board);
      aiApplyMove(nb, m);
      const child = aiMinimax(nb, depth - 1, alpha, beta, true, aiColor);
      if (child < value) value = child;
      if (value < beta) beta = value;
      if (beta <= alpha) break;
    }
    return value;
  }
}

// ==========================================
//  SCORING -> TANLAB OLINADIGAN YURISH
// ==========================================

function aiChooseMoveFromScored(scoredList, cfg, maximizing) {
  if (!scoredList.length) return null;

  // Avval sortlab olamiz
  scoredList.sort((a, b) =>
    maximizing ? b.score - a.score : a.score - b.score
  );

  // 1) Katta blunder – eng yomon yurishlar ichidan tanlash
  if (Math.random() < cfg.blunderChance) {
    const startIdx = Math.floor(scoredList.length * 0.75); // eng yomon 25%
    const idx = startIdx + Math.floor(Math.random() * (scoredList.length - startIdx));
    return scoredList[idx];
  }

  // 2) Randomness – top 2-3 yurish ichidan tasodifiy tanlash
  if (Math.random() < cfg.randomness) {
    const topN = Math.min(3, scoredList.length);
    const idx = Math.floor(Math.random() * topN);
    return scoredList[idx];
  }

  // 3) Default – eng yaxshi yurish
  return scoredList[0];
}

// ==========================================
//  PUBLIC FUNKSIYA: aiMove(level)
//  main.js ichida makeAIMove shuni chaqiradi
// ==========================================

function aiMove(level) {
  const cfg = (window.AI_CONFIG && window.AI_CONFIG[level]) || window.AI_CONFIG.easy;

  // main.js dagi global aiSide bilan ishlaymiz (let aiSide = "black")
  const aiColor = (typeof aiSide === "string") ? aiSide : "black";

  // *** MUHIM TUZATISH ***
  // Bu yerda oldin window.position deyilgan edi – u undefined.
  // Shunchaki global position massivini ishlatamiz.
  const boardNow = aiCloneBoard(position);
  const allMoves = aiGenerateAllLegalMoves(boardNow, aiColor);

  if (!allMoves.length) {
    return null; // yurish yo'q – mate yoki patt
  }

  const scored = [];
  const searchDepth = Math.max(1, cfg.depth);

  for (let move of allMoves) {
    const nb = aiCloneBoard(boardNow);
    aiApplyMove(nb, move);
    const score = aiMinimax(nb, searchDepth - 1, -Infinity, Infinity, false, aiColor);
    scored.push({ move, score });
  }

  const maximizing = (aiColor === "white");
  const chosen = aiChooseMoveFromScored(scored, cfg, maximizing);
  if (!chosen) return null;

  return {
    from: { row: chosen.move.fromRow, col: chosen.move.fromCol },
    to:   { row: chosen.move.toRow,   col: chosen.move.toCol },
    promotion: chosen.move.promotion || null
  };
}

// ==========================================
//  MENYUDAN LEVEL TANLANGANDA CHAQIRILADIGAN
//  FUNKSIYA (main.js ichida ishlatiladi)
// ==========================================

  window.startAIGame = function (level) {
  const cfg = (window.AI_CONFIG && window.AI_CONFIG[level]) || window.AI_CONFIG.easy;

  // main.js dagi global o'zgaruvchilar:
  // let isAIGame, let aiLevel, let aiSide;
  aiLevel = level;
  isAIGame = true;        // shu bilan toggleTurn ichidagi shart ishlaydi

  console.log("AI game started. Level:", level, cfg);
};
// ==========================================
//  STOCKFISH INTEGRATSIYASI UCHUN YORDAMCHI
//  FUNKSIYALAR (ASYNC AI API)
// ==========================================

/**
 * Global `position` massivini FEN satriga aylantirish.
 * Soddalashtirilgan FEN: ro'yxat / side / "-" / "-" / 0 / 1
 */
function aiGenerateFENFromGlobalPosition() {
  if (typeof position === "undefined") {
    console.error("aiGenerateFENFromGlobalPosition: global position topilmadi");
    return null;
  }
  let rows = [];
  for (let r = 0; r < 8; r++) {
    let emptyCount = 0;
    let fenRow = "";
    for (let c = 0; c < 8; c++) {
      const p = position[r][c];
      if (!p) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          fenRow += String(emptyCount);
          emptyCount = 0;
        }
        fenRow += p;
      }
    }
    if (emptyCount > 0) fenRow += String(emptyCount);
    rows.push(fenRow || "8");
  }
  const boardPart = rows.join("/");

  // Hozirgi navbat: white / black
  let sidePart = "w";
  if (typeof currentTurn === "string") {
    sidePart = (currentTurn === "white") ? "w" : "b";
  }

  // Castling, en passant, halfmove, fullmove – soddalashtirilgan
  const castlingPart = "-";
  const epPart       = "-";
  const halfmove     = "0";
  const fullmove     = "1";

  return boardPart + " " + sidePart + " " + castlingPart + " " + epPart + " " + halfmove + " " + fullmove;
}

/**
 * Hozirgi pozitsiyadan FEN olish – boshqa fayllar shuni chaqiradi.
 */
function getCurrentFEN() {
  const fen = aiGenerateFENFromGlobalPosition();
  if (!fen) {
    console.error("getCurrentFEN: FEN generatsiya bo'lmadi");
  }
  return fen;
}

/**
 * Asinxron AI chaqiruvchi:
 *  - level: "easy" | "medium" | "hard" | "expert" | "impossible"
 *  - aiColor: "white" | "black"
 *  - callback(move yoki null)
 *
 * global window.getStockfishMove (ai_stockfish.js ichida) dan foydalanadi.
 */
// Board koordinatasini "e2" formatga aylantirish
function aiCoordToSquare(row, col) {
  try {
    const file = (typeof files === "string") ? files[col] : "abcdefgh"[col];
    const rank = 8 - row;
    return file + String(rank);
  } catch (e) {
    console.error("aiCoordToSquare error:", e);
    return null;
  }
}

/**
 * Asinxron AI chaqiruvchi:
 * 1) Avval Stockfish orqali harakat qiladi
 * 2) Agar Stockfish ishlamasa yoki move bermasa → eski minimax (aiMove) ga fallback
 *
 * @param {"easy"|"medium"|"hard"|"expert"|"impossible"} level
 * @param {"white"|"black"} aiColor
 * @param {Function} callback  // { from: "e2", to: "e4", promotion: "q"|null } yoki null
 */
function requestAIMove(level, aiColor, callback) {
  const useStockfish = (typeof getStockfishMove === "function");
  const fen = (typeof getCurrentFEN === "function") ? getCurrentFEN() : null;

  console.log("requestAIMove()", { level, aiColor, useStockfish, fen });

  // --- Fallback: eski minimax ---
  function fallbackWithMinimax() {
    console.warn("Stockfish ishlamadi yoki FEN yo‘q, fallback: minimax");
    const mm = aiMove(level); // bu sendagi eski AI funksiyasi
    if (!mm) {
      callback(null);
      return;
    }

    const fromSq = aiCoordToSquare(mm.from.row, mm.from.col);
    const toSq   = aiCoordToSquare(mm.to.row,   mm.to.col);
    callback({
      from: fromSq,
      to:   toSq,
      promotion: mm.promotion ? mm.promotion.toLowerCase() : null,
    });
  }

  // Agar Stockfish yo‘q bo‘lsa yoki FEN ololmasak – darrov minimax
  if (!useStockfish || !fen) {
    fallbackWithMinimax();
    return;
  }

  // --- Asosiy: Stockfish orqali yurish ---
  getStockfishMove(level, aiColor, fen, function (move) {
    console.log("Stockfish callback:", move);

    // Agar dvijok javob bermasa – fallback
    if (!move || !move.from || !move.to) {
      console.warn("Stockfish move yo‘q, fallback minimax");
      fallbackWithMinimax();
      return;
    }

    callback(move);  // { from: "e2", to: "e4", promotion: "q"|null }
  });
}



// Globalga chiqaramiz
window.requestAIMove = requestAIMove;


// Globalga chiqaramiz
window.requestAIMove = requestAIMove;

// Debug uchun – konsolga chiqarish
console.log("AI engine loaded: minimax + alpha-beta with ELO-like levels.");
