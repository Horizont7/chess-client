const boardEl = document.getElementById("board");
const pieceToImg = {
  "K": "https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg",
  "Q": "https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg",
  "R": "https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg",
  "B": "https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg",
  "N": "https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg",
  "P": "https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg",
  "k": "https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg",
  "q": "https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg",
  "r": "https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg",
  "b": "https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg",
  "n": "https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg",
  "p": "https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg"
};

function renderBoard() {
  boardEl.innerHTML = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {

      const square = document.createElement("div");
      square.className = "square " + ((row + col) % 2 === 0 ? "light" : "dark");
      square.dataset.row = row;
      square.dataset.col = col;

      const piece = position[row][col];
      if (piece && pieceToImg[piece]) {
        const img = document.createElement("img");
        img.src = pieceToImg[piece];
        square.appendChild(img);
      }

      const isLegalTarget = legalMoves.some(m => m.row === row && m.col === col);
      if (isLegalTarget) square.classList.add("legal-move");

      if (lastMove &&
        ((lastMove.from.row === row && lastMove.from.col === col) ||
         (lastMove.to.row === row && lastMove.to.col === col))) {
        square.classList.add("last-move");
      }

      if (checkedKing &&
        checkedKing.row === row &&
        checkedKing.col === col) {
        square.classList.add("in-check");
      }

      if (selected &&
        selected.row === row &&
        selected.col === col) {
        square.classList.add("selected");
      }

      square.addEventListener("click", onSquareClick);
      boardEl.appendChild(square);
    }
  }
}
