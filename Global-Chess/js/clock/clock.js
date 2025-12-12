// js/clock/clock.js
// GLOBAL CHESS – universal shaxmat taymeri (AI va local game uchun)

window.GC = window.GC || {};

(function () {
  const clock = {
    enabled: false,
    baseMs: 0,
    incMs: 0,
    whiteMs: 0,
    blackMs: 0,
    active: null,      // "w" | "b"
    lastTick: null,
    intervalId: null,
    lastTurn: null     // oxirgi yuragan tomon ("w" | "b")
  };

  GC.clock = clock;

  // --- Time control parselash: "3+2", "5+0", "0.3+1" va hokazo ---
  function parseTimeControl(str) {
    if (!str || str === "untimed") {
      return { enabled: false };
    }

    const parts = String(str).split("+");
    let base = parseFloat(parts[0].trim());       // minut
    let inc = parseFloat((parts[1] || "0").trim()); // sekund

    if (isNaN(base)) base = 3;
    if (isNaN(inc)) inc = 0;

    // 0.3 => 18 sec, 0.5 => 30 sec va hokazo
    const baseMs = Math.round(base * 60 * 1000);
    const incMs = Math.round(inc * 1000);

    return {
      enabled: true,
      baseMs,
      incMs
    };
  }

  function formatClock(ms) {
    if (ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return (
      String(min).padStart(2, "0") +
      ":" +
      String(sec).padStart(2, "0")
    );
  }

  function updateUI() {
    const wEl = document.getElementById("white-timer");
    const bEl = document.getElementById("black-timer");
    if (!wEl || !bEl) return;

    if (!clock.enabled) {
      wEl.textContent = "∞";
      bEl.textContent = "∞";
      wEl.classList.remove("active", "flagged");
      bEl.classList.remove("active", "flagged");
      return;
    }

    function getHumanColor() {
  // Agar aniq o'yinchi rangi saqlangan bo'lsa
  if (GC.playerColor === "w" || GC.playerColor === "b") {
    return GC.playerColor;
  }

  // Agar faqat AI rangi ma'lum bo'lsa, teskarisini olamiz
  if (GC.ai && (GC.ai.color === "w" || GC.ai.color === "b")) {
    return GC.ai.color === "w" ? "b" : "w";
  }

  // Default – oq deb olaylik
  return "w";
}


    wEl.textContent = formatClock(clock.whiteMs);
    bEl.textContent = formatClock(clock.blackMs);

    wEl.classList.toggle("active", clock.active === "w");
    bEl.classList.toggle("active", clock.active === "b");
  }

  function stopInterval() {
    if (clock.intervalId) {
      clearInterval(clock.intervalId);
      clock.intervalId = null;
    }
  }

  function onFlag(color) {
    if (GC.gameOver) return;
    GC.gameOver = true;
    stopInterval();

    const wEl = document.getElementById("white-timer");
    const bEl = document.getElementById("black-timer");

    if (wEl && bEl) {
      if (color === "w") {
        wEl.classList.add("flagged");
      } else {
        bEl.classList.add("flagged");
      }
      updateUI();
    }

    const loser = color === "w" ? "White" : "Black";
    const winner = color === "w" ? "Black" : "White";
    console.log(`${loser} lost on time – ${winner} wins`);
    // Xohlasang, bu yerda GC.setStatus(...) chaqirsa bo‘ladi
  }

  function startFor(color) {
    if (!clock.enabled) return;

    stopInterval();
    clock.active = color;
    clock.lastTick = performance.now();
    updateUI();

    clock.intervalId = setInterval(function () {
      if (!clock.active || GC.gameOver) {
        stopInterval();
        return;
      }

      const now = performance.now();
      const dt = now - clock.lastTick;
      clock.lastTick = now;

      if (clock.active === "w") {
        clock.whiteMs -= dt;
        if (clock.whiteMs <= 0) {
          clock.whiteMs = 0;
          onFlag("w");
        }
      } else if (clock.active === "b") {
        clock.blackMs -= dt;
        if (clock.blackMs <= 0) {
          clock.blackMs = 0;
          onFlag("b");
        }
      }

      updateUI();
    }, 100);
  }

  // prevTurn yurishni tugatgan tomon, newTurn – navbat kimga
  function handleTurnChange(prevTurn, newTurn) {
    if (!clock.enabled) return;
    if (!prevTurn || prevTurn === newTurn) return;

    // 🔁 Increment – yurishni tugatgan tomonga qo'shamiz
    if (prevTurn === "w") {
      clock.whiteMs += clock.incMs;
    } else if (prevTurn === "b") {
      clock.blackMs += clock.incMs;
    }

    startFor(newTurn);
  }

  // updateGameStatus har safar chaqirilganda bitta marta chaqiramiz
  function updateAfterMove(currentTurn) {
    if (!clock.enabled || !currentTurn) return;

    if (clock.lastTurn == null) {
      // birinchi navbat
      clock.lastTurn = currentTurn;
      startFor(currentTurn);
    } else if (clock.lastTurn !== currentTurn) {
      const prev = clock.lastTurn;
      clock.lastTurn = currentTurn;
      handleTurnChange(prev, currentTurn);
    }
  }

  // localStorage'dan time control bo'yicha taymerni sozlash
  function initFromSettings(storageKey) {
    const key = storageKey || "GC_AI_SETTINGS_V1";

    let cfg = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) cfg = JSON.parse(raw);
    } catch (e) {
      console.warn("Clock: settingsni o'qib bo'lmadi:", e);
    }

    if (!cfg || !cfg.time) {
      clock.enabled = false;
      updateUI();
      return;
    }

    const tc = parseTimeControl(cfg.time);
    if (!tc.enabled) {
      clock.enabled = false;
      updateUI();
      return;
    }

    clock.enabled = true;
    clock.baseMs = tc.baseMs;
    clock.incMs = tc.incMs;
    clock.whiteMs = tc.baseMs;
    clock.blackMs = tc.baseMs;
    clock.active = null;
    clock.lastTick = null;
    clock.lastTurn = null;
    stopInterval();
    updateUI();
  }

  // ==== GC namespace ga eksport qilamiz ====
  GC.initGameClockFromSettings = initFromSettings;
  GC.updateClockAfterMove = updateAfterMove;
  GC.startClockFor = startFor;
  GC.onFlag = onFlag;
})();

function getHumanColor() {
  // Agar aniq o'yinchi rangi saqlangan bo'lsa
  if (GC.playerColor === "w" || GC.playerColor === "b") {
    return GC.playerColor;
  }

  // Agar faqat AI rangi ma'lum bo'lsa, teskarisini olamiz
  if (GC.ai && (GC.ai.color === "w" || GC.ai.color === "b")) {
    return GC.ai.color === "w" ? "b" : "w";
  }

  // Default – oq deb olaylik
  return "w";
}
