// js/ai/ai_menu.js
// GLOBAL CHESS – AI menyu (modal) logikasi

window.GC = window.GC || {};

(function () {
  // === YORDAMCHI FUNKSIYALAR ===
  function getModal() {
    return document.getElementById("gc-ai-modal");
  }

  function getInner() {
    return document.getElementById("gc-ai-modal-inner");
  }

  function openAiModal() {
    const modal = getModal();
    if (modal) {
      modal.classList.remove("hidden");
    }
  }

  function closeAiModal() {
    const modal = getModal();
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  // === AI MENYUNI HTML DAN YUKLASH ===
  async function loadAiMenu() {
    try {
      const inner = getInner();
      if (!inner) {
        console.warn("gc-ai-modal-inner topilmadi");
        return;
      }

      // allaqachon yuklangan bo'lsa – qayta fetch qilmaymiz
      if (inner.dataset.loaded === "1") {
        initAiMenuEvents();
        openAiModal();
        return;
      }

      console.log("AI menu yuklanmoqda...");
      const res = await fetch("ai_menu.html");
      if (!res.ok) {
        console.error("ai_menu.html yuklab bo'lmadi:", res.status);
        return;
      }

      const html = await res.text();
      inner.innerHTML = html;
      inner.dataset.loaded = "1";

      initAiMenuEvents();
      openAiModal();
    } catch (err) {
      console.error("AI menu yuklashda xatolik:", err);
    }
  }

  // === AI MENYU ICHIDAGI EVENTLAR ===
  function initAiMenuEvents() {
    const inner = getInner();
    if (!inner) return;

    // --- CLOSE (X) tugmalar ---
    const closeButtons = inner.querySelectorAll(".gc-ai-close-btn");
    closeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        closeAiModal();
      });
    });

    // --- TIME CONTROL TUGMALARI ---
    const timeButtons = inner.querySelectorAll(".gc-ai-timer-btn[data-time]");
    let selectedTime = "3+0"; // default

    timeButtons.forEach((btn) => {
      // default active bo'lsa – o'qib olamiz
      if (btn.classList.contains("gc-ai-timer-btn-active")) {
        selectedTime = btn.dataset.time || "3+0";
      }

      btn.addEventListener("click", () => {
        selectedTime = btn.dataset.time || "3+0";

        timeButtons.forEach((b) =>
          b.classList.remove("gc-ai-timer-btn-active")
        );
        btn.classList.add("gc-ai-timer-btn-active");
      });
    });

    // --- PLAY AS (WHITE / BLACK / RANDOM) ---
    const colorButtons = inner.querySelectorAll(".gc-ai-color-btn");
    let selectedColor = "white"; // default: White aktiv bo'lib tursin

    colorButtons.forEach((btn) => {
      if (btn.classList.contains("gc-ai-timer-btn-active")) {
        selectedColor = btn.dataset.color || "white";
      }

      btn.addEventListener("click", () => {
        selectedColor = btn.dataset.color || "white";

        colorButtons.forEach((b) =>
          b.classList.remove("gc-ai-timer-btn-active")
        );
        btn.classList.add("gc-ai-timer-btn-active");
      });
    });

    // --- BOT KARTALARI (Easy / Medium / Hard / Impossible / Trainer) ---
    const botCards = inner.querySelectorAll(".gc-ai-bot-card");
    botCards.forEach((card) => {
      card.addEventListener("click", () => {
        const level = (card.dataset.level || "easy").toUpperCase();

        // UI: aktiv karta
        botCards.forEach((c) => c.classList.remove("gc-ai-bot-active"));
        card.classList.add("gc-ai-bot-active");

        // Sozlamalarni localStorage ga saqlaymiz
        const settings = {
          mode: "ai",
          level, // EASY / MEDIUM / HARD / IMPOSSIBLE / TRAINER
          time: selectedTime,
          color: selectedColor.toLowerCase(), // white / black / random
        };

        try {
          localStorage.setItem(
            "GC_AI_SETTINGS_V1",
            JSON.stringify(settings)
          );
        } catch (e) {
          console.warn("AI settings saqlanmadi:", e);
        }

        console.log("AI game config:", settings);

        closeAiModal();
        window.location.href = "game.html";
      });
    });
  }

  // === FOOTERDAGI "PLAY VS AI" TUGMASINI ULASH ===
  function initPlayVsAiButton() {
    // Bir nechta variantlardan qidiramiz:
    const candidates = Array.from(
      document.querySelectorAll(".gc-nav, .gc-footer-btn, button, a")
    );

    const btn = candidates.find((el) => {
      const text = (el.textContent || "").trim().toUpperCase();
      return text === "PLAY VS AI";
    });

    if (!btn) {
      console.warn('PLAY VS AI tugmasi topilmadi');
      return;
    }

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("PLAY VS AI bosildi");
      loadAiMenu();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initPlayVsAiButton();
  });

  // Tashqaridan chaqirish uchun (agar kerak bo'lsa)
  window.GC.openAiMenu = loadAiMenu;
})();
