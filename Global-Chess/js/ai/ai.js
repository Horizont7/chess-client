// js/ai/ai.js
// Global Chess – Stockfish AI wrapper + juda oson EASY bot

window.GC = window.GC || {};

/* =========================
   AI LEVEL (EASY / MEDIUM / HARD / IMPOSSIBLE)
   ========================= */

GC.AI = {
  selectedLevel: null,
  STORAGE_KEY: "GC_AI_LEVEL",

  setLevel(level) {
    const norm = String(level || "").toUpperCase();
    this.selectedLevel = norm;
    try {
      localStorage.setItem(this.STORAGE_KEY, norm);
    } catch (e) {
      console.warn("AI level: localStorage is not available", e);
    }

    if (typeof GC.updateAISkillFromLevel === "function") {
      GC.updateAISkillFromLevel();
    }
  },

  getLevel() {
    if (this.selectedLevel) return this.selectedLevel;

    let saved = null;
    try {
      saved = localStorage.getItem(this.STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }

    return (saved || "MEDIUM").toUpperCase(); // default MEDIUM
  }
};

/* =========================
   LOW-LEVEL STOCKFISH STATE
   ========================= */

GC.ai = {
  worker: null,
  ready: false,
  thinking: false,
  color: "b",      // foydalanuvchi oq, AI qora
  skillLevel: 6,   // Stockfish Skill Level (0–20)
  depth: 7         // "go depth" qiymati
};

GC.aiEnabled = true;

/* ===========================================
   EASY / MEDIUM / HARD / IMPOSSIBLE → config
   =========================================== */

GC.updateAISkillFromLevel = function () {
  const level = GC.AI.getLevel(); // "EASY", "MEDIUM", "HARD", "IMPOSSIBLE"
  let skill;
  let depth;

  switch (level) {
    case "EASY":
      // EASY: umuman aqlli emas – random yurish, Stockfish ishlatilmaydi
      // Bu qiymatlar faqat shunchaki, ishlatilmaydi
      skill = 0;
      depth = 1;
      break;

    case "MEDIUM":
      // MEDIUM ≈ 800 Elo
      skill = 5;
      depth = 6;
      break;

    case "HARD":
      // HARD ≈ 1300 Elo
      skill = 10;
      depth = 12;
      break;

    case "IMPOSSIBLE":
      // IMPOSSIBLE: to'liq Stockfish, maksimal daraja
      skill = 20;
      depth = 20;
      break;

    default:
      skill = 5;
      depth = 6;
      break;
  }

  GC.ai.skillLevel = skill;
  GC.ai.depth = depth;

  // Worker allaqachon ishga tushgan bo'lsa — skillni live yangilaymiz
  if (GC.ai.worker) {
    GC.ai.worker.postMessage("setoption name Skill Level value " + skill);
  }

  console.log("AI config:", level, "skill =", skill, "depth =", depth);
};

/* =========================
   AI MOVE TIME – time control ga qarab movetime tanlash
   ========================= */

GC.getAiMoveTimeMs = function () {
  let cfg = null;

  try {
    const raw = localStorage.getItem("GC_AI_SETTINGS_V1");
    if (raw) {
      cfg = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("AI: time config o'qilmadi", e);
  }

  // Agar config bo'lmasa – defolt qiymatlar
  if (!cfg || !cfg.time) {
    return 600; // 0.6 sekund
  }

  const t = String(cfg.time).toLowerCase().trim();

  // No timer rejimi – aynan shu yerda 3 sekund qilamiz
  if (t === "untimed" || t === "no-timer" || t === "notimer") {
    return 3000; // 3 sekund
  }

  // Masalan: "1+0", "3+2", "5+5", "10+5" kabi format
  // biz faqat bazaviy minutga qaraymiz
  let baseMin = 3;
  try {
    const baseStr = t.split("+")[0];
    baseMin = parseFloat(baseStr.replace(",", "."));
    if (isNaN(baseMin)) baseMin = 3;
  } catch (e) {
    baseMin = 3;
  }

  // Juda taxminiy, lekin real o'yinlar uchun yetarli:
  if (baseMin <= 1) {
    // Bullet (1+0, 1+1, 0.5+0 va hok.)
    return 250; // 0.25 s
  } else if (baseMin <= 5) {
    // Blitz (3+2, 5+0, 5+5)
    return 500; // 0.5 s
  } else {
    // Rapid va uzun o'yinlar (10+, 15+)
    return 1000; // 1 s
  }
};

/* =========================
   Yordamchi: koordinata bo'yicha AI yurishi
   ========================= */

GC.aiPlayMoveCoords = function (fromRow, fromCol, toRow, toCol, isRandomMove) {
  const state = GC.gameState;
  if (!state || GC.gameOver) return;

  const board = state.board;
  const movingPiece = board[fromRow][fromCol];
  const targetPiece = board[toRow][toCol];

  const wasCapture = !!(targetPiece && targetPiece !== ".");

  const newState = GC.cloneState ? GC.cloneState(state) : state;
  if (typeof GC.applyMove === "function") {
    GC.applyMove(newState, fromRow, fromCol, toRow, toCol);
  } else {
    newState.board[toRow][toCol] = newState.board[fromRow][fromCol];
    newState.board[fromRow][fromCol] = ".";
    newState.turn = newState.turn === "w" ? "b" : "w";
  }

  GC.gameState = newState;
  GC.lastMove = {
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol }
  };

  const fromNotation = GC.squareToNotation
    ? GC.squareToNotation(fromRow, fromCol)
    : "";
  const toNotation = GC.squareToNotation
    ? GC.squareToNotation(toRow, toCol)
    : "";

  const pieceChar = movingPiece ? movingPiece.toUpperCase() : "?";

  if (typeof GC.addMoveToHistory === "function") {
    GC.addMoveToHistory({
      moveNumber: newState.moveNumber || 1,
      turn: newState.turn === "w" ? "b" : "w", // hozir o'ynagan rang
      from: fromNotation,
      to: toNotation,
      piece: pieceChar,
      isAI: true,
      easyRandom: !!isRandomMove
    });
  }

  if (typeof GC.updateGameStatus === "function") {
    GC.updateGameStatus();
  }
  if (typeof GC.renderBoard === "function") {
    GC.renderBoard(newState);
  }

  if (wasCapture && targetPiece && typeof GC.playSimpleCaptureEffect === "function") {
    GC.playSimpleCaptureEffect(toRow, toCol, targetPiece);
  }
};


/* =========================
   STOCKFISH WORKER INIT
   ========================= */

GC.initAI = function () {
  if (GC.ai.worker) return;

  try {
    console.log("INIT AI: creating worker js/ailevel/stockfish.js");
    const worker = new Worker("js/ailevel/stockfish.js");
    GC.ai.worker = worker;
    GC.ai.ready = false;
    GC.ai.thinking = false;

    // PV liniyalarni to'plash uchun buffer
    let moveLines = [];

    worker.onerror = function (e) {
      console.error("Stockfish worker ERROR:", e);
    };

    worker.onmessage = function (e) {
      const line = String(e.data || "").trim();
      if (!line) return;

      if (line === "uciok") {
        GC.ai.ready = true;
        GC.updateAISkillFromLevel();
        return;
      }

      if (line === "readyok") {
        return;
      }

      if (line.startsWith("info depth")) {
        if (line.includes(" pv ")) {
          moveLines.push(line);
        }
        return;
      }

      if (line.startsWith("bestmove")) {
        GC.ai.thinking = false;

        const level = GC.AI.getLevel(); // EASY / MEDIUM / HARD / IMPOSSIBLE
        let chosenMove = null;

        // MEDIUM/HARD uchun biroz “not-perfect” qilib qo'ysak ham bo'ladi,
        // hozircha oddiy bestmove yetarli, shuning uchun bu qismni soddaroq qoldiramiz.
        const parts = line.split(/\s+/);
        chosenMove = parts[1]; // "e2e4" va hokazo

        moveLines = [];

        if (!chosenMove || chosenMove === "(none)") {
          console.warn("AI: move topilmadi:", line);
          return;
        }

        GC.aiApplyBestMove(chosenMove);
      }
    };

    worker.postMessage("uci");
    worker.postMessage("isready");
  } catch (err) {
    console.error("AI init failed:", err);
    GC.aiEnabled = false;
  }
};


/* =========================
   EASY: juda TUPОY random bot
   ========================= */

GC.requestVeryEasyMove = function () {
  if (!GC.aiEnabled) return;

  const state = GC.gameState;
  if (!state || GC.gameOver) return;

  // Navbat AI rangida bo'lishi kerak
  if (state.turn !== GC.ai.color) return;

  const color = state.turn; // "b" bo'ladi

  const moves = [];

  const board = state.board;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece === ".") continue;

      const isWhitePiece = piece === piece.toUpperCase();
      const pieceColor = isWhitePiece ? "w" : "b";
      if (pieceColor !== color) continue;

      for (let tr = 0; tr < 8; tr++) {
        for (let tc = 0; tc < 8; tc++) {
          if (!GC.isLegalMove(state, r, c, tr, tc)) continue;

          const testState = GC.cloneState(state);
          GC.applyMove(testState, r, c, tr, tc);

          if (GC.isKingInCheck && GC.isKingInCheck(testState, color)) {
            continue; // qirolni shoxda qoldiradigan yurishlar tashlanadi
          }

          const targetPiece = board[tr][tc];
          moves.push({
            fromRow: r,
            fromCol: c,
            toRow: tr,
            toCol: tc,
            targetPiece
          });
        }
      }
    }
  }

  if (!moves.length) {
    console.warn("EASY AI: legal yurish yo'q (mate yoki pat)");
    if (typeof GC.updateGameStatus === "function") {
      GC.updateGameStatus();
    }
    GC.gameOver = true;
    return;
  }

  // Juda tupoylik uchun: shunchaki random yurish
  const idx = Math.floor(Math.random() * moves.length);
  const mv = moves[idx];

  GC.aiPlayMoveCoords(mv.fromRow, mv.fromCol, mv.toRow, mv.toCol, true);
};


/* =========================
   AI MOVE REQUEST (PLAYERDAN KEYIN)
   ========================= */

// ===== AI DAN NAVBATDAGI YURISHNI SO'RASH =====
GC.requestAIMove = function () {
  // Agar AI yo'q yoki worker yo'q bo'lsa – hech narsa qilmaymiz
  if (!GC.ai || !GC.ai.worker) {
    console.warn("AI worker yo'q, GC.requestAIMove bekor qilindi");
    return;
  }

  // Agar o'yin tugagan bo'lsa – yurmaymiz
  if (GC.gameOver) {
    return;
  }

  // AI allaqachon "o'ylayotgan" bo'lsa – ikkinchi marta chaqirmaymiz
  if (GC.ai.thinking) {
    return;
  }

  // Hozir kimning navbati
  const turn = GC.gameState && GC.gameState.turn; // "w" yoki "b"
  if (!turn || turn !== GC.ai.color) {
    // Navbat AI tomonda emas – hech narsa qilmaymiz
    return;
  }

  // Holatni FEN ga o'giramiz
  if (typeof GC.stateToFEN !== "function") {
    console.error("GC.stateToFEN funksiyasi topilmadi");
    return;
  }

  const fen = GC.stateToFEN(GC.gameState);
  GC.ai.thinking = true;

  // Board holatini Stockfish'ga beramiz
  GC.ai.worker.postMessage("position fen " + fen);

  // AI darajasini aniqlaymiz (EASY / MEDIUM / HARD / IMPOSSIBLE ...)
  const level = (GC.ai.level || "EASY").toUpperCase();

  // 🔥 HAMMA rejimda juda tez yurishi uchun umumiy movetime
  const moveTimeMs = 100; // 0.10 sekund

  if (level === "MEDIUM") {
    // O'rtacha kuch – chuqurlik 6
    GC.ai.worker.postMessage(
      "go depth 6 movetime " + moveTimeMs
    );
  } else if (level === "HARD") {
    // Kuchliroq – chuqurlik 12
    const depth = GC.ai.depth || 12;
    GC.ai.worker.postMessage(
      "go depth " + depth + " movetime " + moveTimeMs
    );
  } else if (level === "IMPOSSIBLE") {
    // Maksimal kuch – chuqurlik 20
    const depth = GC.ai.depth || 20;
    GC.ai.worker.postMessage(
      "go depth " + depth + " movetime " + moveTimeMs
    );
  } else {
    // EASY yoki noma'lum level – juda yengil
    GC.ai.worker.postMessage(
      "go depth 4 movetime " + moveTimeMs
    );
  }
};  // <--- MUHIM: funksiya shu } bilan yopiladi va ; bilan tugaydi

/* =========================
   STOCKFISH "e2e4" → BIZNING BOARD KOORDINATALARI
   ========================= */

GC.aiApplyBestMove = function (uciMove) {
  const state = GC.gameState;
  if (!state || GC.gameOver) return;

  function fileToCol(ch) {
    return "abcdefgh".indexOf(ch);
  }
  function rankToRow(ch) {
    const n = parseInt(ch, 10);
    return 8 - n; // rank 8 → row 0, rank 1 → row 7
  }

  const fromFile = uciMove[0];
  const fromRank = uciMove[1];
  const toFile = uciMove[2];
  const toRank = uciMove[3];

  const fromCol = fileToCol(fromFile);
  const fromRow = rankToRow(fromRank);
  const toCol = fileToCol(toFile);
  const toRow = rankToRow(toRank);

  if (
    fromRow < 0 || fromRow > 7 ||
    fromCol < 0 || fromCol > 7 ||
    toRow < 0 || toRow > 7 ||
    toCol < 0 || toCol > 7
  ) {
    console.warn("AI move noto'g'ri koordinata:", uciMove);
    return;
  }

  GC.aiPlayMoveCoords(fromRow, fromCol, toRow, toCol, false);
};

