/* ================================
   CHESS CLOCK (timer.js)
   ================================ */

// Boshlang'ich vaqt (5 daqiqa)
const INITIAL_TIME = 5 * 60;  // sekundlarda

let whiteTime = INITIAL_TIME;
let blackTime = INITIAL_TIME;
let clockInterval = null;

/**
 * Sekundni "MM:SS" ko‘rinishiga o‘giradi
 */
function formatTime(seconds) {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    m.toString().padStart(2, "0") +
    ":" +
    s.toString().padStart(2, "0")
  );
}

/**
 * Soat yozuvlarini yangilash + 10 soniya qolganda qizil qilib puls qilish
 */
function updateClockUI() {
  const wEl = document.getElementById("white-clock");
  const bEl = document.getElementById("black-clock");
  if (!wEl || !bEl) return;

  // Vaqtni matn ko‘rinishida chiqarish
  wEl.textContent = formatTime(whiteTime);
  bEl.textContent = formatTime(blackTime);

  // 10 soniya yoki kam bo‘lsa va navbat o‘sha tarafda bo‘lsa — qizil bo‘ladi (low-time)
  wEl.classList.toggle(
    "low-time",
    whiteTime <= 10 && currentTurn === "white"
  );
  bEl.classList.toggle(
    "low-time",
    blackTime <= 10 && currentTurn === "black"
  );
}

/**
 * Aktiv o‘yinchi soatini sariq qilish / passivnini oq qilish
 * (clock.active klassi)
 */
function updateActiveClock() {
  const wEl = document.getElementById("white-clock");
  const bEl = document.getElementById("black-clock");
  if (!wEl || !bEl) return;

  wEl.classList.toggle("active", currentTurn === "white");
  bEl.classList.toggle("active", currentTurn === "black");
}

/**
 * Navbatdagi o‘yinchi uchun soatni ishga tushirish
 * (har yurishdan keyin toggleTurn ichidan chaqiriladi)
 */
function startClockForCurrentTurn() {
  // Eski intervalni o‘chirib tashlaymiz
  if (clockInterval) clearInterval(clockInterval);

  clockInterval = setInterval(() => {
    if (gameOver) {
      clearInterval(clockInterval);
      return;
    }

    if (currentTurn === "white") {
      whiteTime--;
      if (whiteTime <= 0) {
        whiteTime = 0;
        gameOver = true;
        gameResult = { type: "flag", winner: "black" };
        if (typeof updateGameIndicator === "function") {
          updateGameIndicator();
        }
        clearInterval(clockInterval);
      }
    } else {
      blackTime--;
      if (blackTime <= 0) {
        blackTime = 0;
        gameOver = true;
        gameResult = { type: "flag", winner: "white" };
        if (typeof updateGameIndicator === "function") {
          updateGameIndicator();
        }
        clearInterval(clockInterval);
      }
    }

    updateClockUI();
  }, 1000);
}
