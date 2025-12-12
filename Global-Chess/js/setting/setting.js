// js/setting/setting.js
document.addEventListener("DOMContentLoaded", () => {
  /* =======================
        PROFILE HEADER INIT
     ======================= */
  if (window.GC && typeof GC.initGlobalProfileHeader === "function") {
    GC.initGlobalProfileHeader();
  }

  /* =======================
        SETTINGS OVERLAY
     ======================= */
  const overlay  = document.getElementById("settings-overlay");
  const openBtn  = document.getElementById("btn-settings");
  const closeBtn = document.getElementById("settings-close");

  if (openBtn && overlay) {
    openBtn.addEventListener("click", () => {
      overlay.classList.remove("hidden");
      if (window.GC && typeof GC.initProfilePage === "function") {
        GC.initProfilePage();
      }
    });
  }

  if (closeBtn && overlay) {
    closeBtn.addEventListener("click", () => overlay.classList.add("hidden"));
  }

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.add("hidden");
    });
  }

  /* =======================
        NICKNAME MODAL
     ======================= */
  const nickBtn     = document.getElementById("settings-nickname-btn");
  const nickModal   = document.getElementById("nickname-modal");
  const nickClose   = document.getElementById("nick-close-btn");
  const nickConfirm = document.getElementById("nick-confirm-btn");
  const nickInput   = document.getElementById("nick-input");
  const nickError   = document.getElementById("nick-error");

  const headerName       = document.getElementById("profile-name");
  const profileNickView  = document.getElementById("profile-nickname-view");

  const NICKNAME_KEY      = "gc_nickname";
  const CRYSTALS_KEY      = "gc_crystals";
  const NICK_CHANGES_KEY  = "gc_nick_changes";

  let nickname = localStorage.getItem(NICKNAME_KEY) || "Player";
  let crystals = Number(localStorage.getItem(CRYSTALS_KEY) || "0");
  let changes  = Number(localStorage.getItem(NICK_CHANGES_KEY) || "0");

  // sync header
  if (headerName) headerName.textContent = nickname;

  function openNickModal() {
    if (!nickModal) return;
    if (nickError) nickError.textContent = "";
    if (nickInput) nickInput.value = nickname;
    nickModal.classList.remove("hidden");
  }

  function closeNickModal() {
    if (!nickModal) return;
    nickModal.classList.add("hidden");
  }

  if (nickBtn && nickModal) nickBtn.addEventListener("click", openNickModal);
  if (nickClose && nickModal) nickClose.addEventListener("click", closeNickModal);

  if (nickModal) {
    nickModal.addEventListener("click", (e) => {
      if (e.target === nickModal) closeNickModal();
    });
  }

  if (nickConfirm && nickInput) {
    nickConfirm.addEventListener("click", () => {
      const newNick = nickInput.value.trim();

      if (newNick.length < 3) {
        if (nickError) nickError.textContent = "Nickname must be at least 3 characters.";
        return;
      }
      if (newNick.length > 14) {
        if (nickError) nickError.textContent = "Max length is 14 characters.";
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(newNick)) {
        if (nickError) nickError.textContent = "Only letters, numbers and _ allowed.";
        return;
      }

      // 1-marta BEPUL, keyingi safar 15 crystals
      if (changes > 0 && crystals < 15) {
        if (nickError) nickError.textContent = "Not enough crystals.";
        return;
      }
      if (changes > 0) {
        crystals -= 15;
        localStorage.setItem(CRYSTALS_KEY, String(crystals));
      }

      changes++;
      localStorage.setItem(NICK_CHANGES_KEY, String(changes));

      nickname = newNick;
      localStorage.setItem(NICKNAME_KEY, nickname);

      if (headerName) headerName.textContent = nickname;
      if (profileNickView) profileNickView.textContent = nickname;

      closeNickModal();
    });
  }

  /* =======================
        PROFILE MODAL
     ======================= */
  const profileBtn      = document.getElementById("settings-profile-btn");
  const profileModal    = document.getElementById("profile-modal");
  const profileCloseBtn = document.getElementById("profile-close-btn");

  const profileSaveBtn   = document.getElementById("profile-save-btn");
  const profileCancelBtn = document.getElementById("profile-cancel-btn");

  function openProfileModal() {
    if (!profileModal) return;

    // Profile ochilganda nickname modal yopilsin
    if (nickModal) nickModal.classList.add("hidden");

    // nickname ko'rsatish joyi bo'lsa sync
    if (profileNickView) profileNickView.textContent = nickname;

    profileModal.classList.remove("hidden");
    profileModal.style.display = "flex"; // ba'zi CSSlarda kerak bo'ladi
  }

  function closeProfileModal() {
    if (!profileModal) return;
    profileModal.classList.add("hidden");
    profileModal.style.display = "none";
  }

  if (profileBtn && profileModal) profileBtn.addEventListener("click", openProfileModal);
  if (profileCloseBtn && profileModal) profileCloseBtn.addEventListener("click", closeProfileModal);

  if (profileModal) {
    profileModal.addEventListener("click", (e) => {
      if (e.target === profileModal) closeProfileModal();
    });
  }

});

// ===== FORCE PROFILE SAVE/CLOSE (CAPTURE MODE) =====
(function () {
  const PROFILE_KEY = "gc_profile_data_v1";

  function getProfileModal() {
    return document.getElementById("profile-modal");
  }

  function closeProfileModalHard() {
    const m = getProfileModal();
    if (!m) return;
    m.classList.add("hidden");
    m.style.display = "none";
    const content = m.querySelector(".profile-modal-content");
    if (content) content.classList.remove("editing");
  }

  function saveProfileFromInputs() {
    const m = getProfileModal();
    if (!m) return;

    // modal ichidagi hamma inputlarni olamiz
    const inputs = Array.from(m.querySelectorAll("input, select, textarea"));

    const data = {};
    inputs.forEach((el) => {
      // faqat id/name bo'lsa saqlaymiz
      const key = el.id || el.name;
      if (!key) return;
      data[key] = (el.value || "").trim();
    });

    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
  }

  function restoreProfileToInputs() {
    const m = getProfileModal();
    if (!m) return;

    let data = {};
    try {
      data = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
    } catch (_) {}

    const inputs = Array.from(m.querySelectorAll("input, select, textarea"));
    inputs.forEach((el) => {
      const key = el.id || el.name;
      if (!key) return;
      if (data[key] !== undefined) el.value = data[key];
    });
  }

  // MODAL ochilganda oldin saqlanganni qayta to'ldirib qo'yamiz
  document.addEventListener(
    "click",
    (e) => {
      const openBtn = e.target.closest("#settings-profile-btn");
      if (!openBtn) return;
      setTimeout(restoreProfileToInputs, 0);
    },
    true
  );

  // SAVE (capture) — saqlaydi + yopadi
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("#profile-save-btn");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      saveProfileFromInputs();
      closeProfileModalHard();
    },
    true
  );

  // CANCEL (capture) — saqlamaydi + yopadi (oldingi saqlanganni qaytaradi)
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("#profile-cancel-btn");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      restoreProfileToInputs();
      closeProfileModalHard();
    },
    true
  );
})();
