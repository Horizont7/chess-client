// ===== Oddiy lokal taxta (faqat start pozitsiya) =====

// FEN formatidagi boshlang'ich joylashuv
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

// FEN belgisi -> rasm
const PIECE_IMAGES = {
  "p": "assets/pieces/bp.png",
  "r": "assets/pieces/br.png",
  "n": "assets/pieces/bn.png",
  "b": "assets/pieces/bb.png",
  "q": "assets/pieces/bq.png",
  "k": "assets/pieces/bk.png",

  "P": "assets/pieces/wp.png",
  "R": "assets/pieces/wr.png",
  "N": "assets/pieces/wn.png",
  "B": "assets/pieces/wb.png",
  "Q": "assets/pieces/wq.png",
  "K": "assets/pieces/wk.png"
};

// Fayl nomlari (a–h) – koordinatalar uchun
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

/**
 * FEN ni 8x8 massivga aylantirish
 */
function fenToMatrix(fen) {
  const rows = fen.split("/");
  const matrix = [];

  for (let r = 0; r < 8; r++) {
    const row = rows[r];
    const outRow = [];
    for (let ch of row) {
      if (/\d/.test(ch)) {
        const empty = parseInt(ch, 10);
        for (let i = 0; i < empty; i++) {
          outRow.push(null);
        }
      } else {
        outRow.push(ch);
      }
    }
    matrix.push(outRow);
  }

  return matrix; // 0-index: yuqoridan pastga (8 -> 1)
}

/**
 * Taxtani DOMga chizish
 */
function renderBoard(fen) {
  const boardEl = document.getElementById("board");
  if (!boardEl) return;

  boardEl.innerHTML = "";
  const matrix = fenToMatrix(fen);

  // rankIndex: 0 -> 8-rank, 7 -> 1-rank
  for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
    const rankNumber = 8 - rankIndex; // vizual (8,7,...,1)
    const row = matrix[rankIndex];

    for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
      const fileLetter = FILES[fileIndex];
      const piece = row[fileIndex];
      const squareName = fileLetter + rankNumber;

      const square = document.createElement("div");
      square.classList.add("square");
      const isDark = (fileIndex + rankIndex) % 2 === 1;
      square.classList.add(isDark ? "dark" : "light");
      square.dataset.square = squareName;

      // Agar bu katakda figura bo'lsa – rasm qo'yamiz
      if (piece && PIECE_IMAGES[piece]) {
        const img = document.createElement("img");
        img.src = PIECE_IMAGES[piece];
        img.alt = piece;
        square.appendChild(img);
      }

      // Fayl harflari (a–h) – faqat 1-rankda (pastki qator)
      if (rankNumber === 1) {
        const fileLabel = document.createElement("span");
        fileLabel.classList.add("file-label");
        fileLabel.classList.add(isDark ? "on-dark" : "on-light");
        fileLabel.textContent = fileLetter;
        square.appendChild(fileLabel);
      }

      // Rank raqamlari (1–8) – faqat "a" faylida (chap tomonda)
      if (fileIndex === 0) {
        const rankLabel = document.createElement("span");
        rankLabel.classList.add("rank-label");
        rankLabel.classList.add(isDark ? "on-dark" : "on-light");
        rankLabel.textContent = rankNumber;
        square.appendChild(rankLabel);
      }


      boardEl.appendChild(square);
    }
  }

  const turnIndicator = document.getElementById("turn-indicator");
  if (turnIndicator) {
    turnIndicator.textContent = "White to move";
  }
}

/**
 * Boshlang'ich init
 */
window.addEventListener("load", () => {
  renderBoard(START_FEN);
});
