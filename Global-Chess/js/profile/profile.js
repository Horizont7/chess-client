// js/profile/profile.js

document.addEventListener("DOMContentLoaded", function () {
  const headerProfileBtn   = document.getElementById("btn-profile");
  const settingsProfileBtn = document.getElementById("settings-profile-btn");

  const modal        = document.getElementById("profile-modal");
  const modalContent = modal ? modal.querySelector(".profile-modal-content") : null;

  const closeBtn  = document.getElementById("profile-close-btn");
  const saveBtn   = document.getElementById("profile-save-btn");
  const cancelBtn = document.getElementById("profile-cancel-btn");

  // VIEW uchun spanlar (value)
  const valueEls = Array.from(document.querySelectorAll(".profile-info .value"));

  const STORAGE_KEY = "gc_profile_values_v1";

  // ---------- HELPERS ----------
  function getInitialValuesFromDOM() {
    return valueEls.map((el) => (el ? el.innerText.trim() : ""));
  }

  function loadValues() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const base = getInitialValuesFromDOM();
      if (!raw) return base;

      const arr = JSON.parse(raw);
      return base.map((v, i) => (arr[i] !== undefined ? arr[i] : v));
    } catch (e) {
      return getInitialValuesFromDOM();
    }
  }

  function saveValuesToStorage(values) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch (e) {
      console.warn("Can't save profile values", e);
    }
  }

  function renderValues(values) {
    valueEls.forEach((spanEl, idx) => {
      if (!spanEl) return;

      const text = (values[idx] || "").trim();

      // span'ga yozamiz (view)
      if (!text) {
        spanEl.textContent = "";
        spanEl.classList.add("empty");
      } else {
        spanEl.textContent = text;
        spanEl.classList.remove("empty");
      }

      // agar shu qatorda input bo'lsa, inputni ham to'ldiramiz
      const row = spanEl.closest(".profile-info-item");
      const input = row ? row.querySelector("input") : null;
      if (input) input.value = text;
    });
  }

  function readValuesFromUI() {
    // Har qator bo'yicha: input bo'lsa input.value, bo'lmasa span text
    return valueEls.map((spanEl) => {
      if (!spanEl) return "";

      const row = spanEl.closest(".profile-info-item");
      const input = row ? row.querySelector("input") : null;

      const text = input ? input.value.trim() : spanEl.innerText.trim();
      return text || "";
    });
  }

  // ---------- MODAL OPEN/CLOSE ----------
  let values = loadValues();
  renderValues(values);

  function openModal() {
    if (!modal) return;

    values = loadValues();
    renderValues(values);

    modal.style.display = "flex";
    if (modalContent) modalContent.classList.add("editing"); // edit rejim doim yoq
  }

  function closeModal() {
  const m = document.getElementById("profile-modal");
  if (!m) return;

  // hidden class bilan yopilsa
  m.classList.add("hidden");

  // style bilan ham yopib qo'yamiz (har ehtimolga)
  m.style.display = "none";

  // editing class bo'lsa olib tashlaymiz
  const content = m.querySelector(".profile-modal-content");
  if (content) content.classList.remove("editing");
}


  // ---------- ACTIONS ----------
  function onSave(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const newValues = readValuesFromUI();
    saveValuesToStorage(newValues);
    values = newValues;
    renderValues(values);
    closeModal();
  }

  function onCancel(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Saqlanmagan o'zgarishlarni bekor qilamiz:
    values = loadValues();
    renderValues(values);
    closeModal();
  }

  function onClose(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // X bosilganda ham saqlamay yopamiz:
    values = loadValues();
    renderValues(values);
    closeModal();
  }

  // ---------- EVENTS ----------
  if (headerProfileBtn) headerProfileBtn.addEventListener("click", openModal);
  if (settingsProfileBtn) settingsProfileBtn.addEventListener("click", openModal);

 if (saveBtn) {
  saveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // 1) saqlash
    const newValues = readValuesFromUI();   // sende shu funksiya bo'lsa
    saveValuesToStorage(newValues);
    values = newValues;
    renderValues(values);

    // 2) yopish
    closeModal();
  });
}

  if (cancelBtn) cancelBtn.addEventListener("click", onCancel);
  if (closeBtn) closeBtn.addEventListener("click", onClose);

  // modal foniga bossang ham yopilsin (saqlamasdan)
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) onClose(e);
    });
  }
});
