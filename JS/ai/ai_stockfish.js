// JS/ai/ai_stockfish.js
// Stockfish (wasm) bilan ishlaydigan oddiy wrapper

let sfWorker = null;
let sfReady = false;
let sfQueue = [];
let sfCallback = null;

// --- Worker'ni ishga tushiramiz ---
function initStockfish() {
  if (sfWorker) return;

  try {
    sfWorker = new Worker("engine/stockfish.js");
  } catch (e) {
    console.error("Stockfish worker yaratib bo‘lmadi:", e);
    sfWorker = null;
    return;
  }

  sfWorker.onmessage = (e) => {
    const line = String(e.data || "");
    console.log("SF >>", line);

    // UCI init tugadi
    if (line.includes("uciok")) {
      sfReady = true;
      sfQueue.forEach(cmd => sfWorker.postMessage(cmd));
      sfQueue = [];
      return;
    }

    // Eng muhim qator: bestmove ...
    if (line.startsWith("bestmove") && sfCallback) {
      const parts = line.split(" ");
      const raw = (parts[1] || "").trim();

      // Hech narsa topolmasa
      if (!raw || raw === "(none)") {
        const cb = sfCallback;
        sfCallback = null;
        cb(null);
        return;
      }

      const from = raw.slice(0, 2);  // masalan "e2"
      const to   = raw.slice(2, 4);  // masalan "e4"
      let promotion = null;
      if (raw.length >= 5) {
        promotion = raw[4];         // q, r, b, n
      }

      const cb = sfCallback;
      sfCallback = null;
      cb({ from, to, promotion });
    }
  };

  sfWorker.onerror = (e) => {
    console.error("Stockfish worker error:", e);
    sfReady = false;
  };

  // UCI rejimini yoqamiz
  sfWorker.postMessage("uci");
}

// Workerga komandalar yuborish
function sfSend(cmd) {
  if (!sfWorker) return;
  if (!sfReady && cmd !== "uci") {
    sfQueue.push(cmd);
  } else {
    sfWorker.postMessage(cmd);
  }
}

// --- Tashqaridan chaqiriladigan funksiya ---
function getStockfishMove(level, aiColor, fen, callback) {
  console.log("getStockfishMove()", { level, aiColor, fen });

  initStockfish();

  if (!sfWorker) {
    console.warn("Stockfish mavjud emas, fallback kerak bo‘ladi");
    callback(null);
    return;
  }

  const timeByLevel = {
    easy:        200,
    medium:      400,
    hard:        800,
    expert:     1500,
    impossible: 3000,
  };

  const movetime = timeByLevel[level] || 800;

  // Keyingi "bestmove" shu callbackka chiqadi
  sfCallback = callback;

  sfSend("stop");
  sfSend("ucinewgame");
  sfSend("isready");
  sfSend("position fen " + fen);
  sfSend("go movetime " + movetime);
}

// Globalga chiqaramiz
window.initStockfish = initStockfish;
window.getStockfishMove = getStockfishMove;
