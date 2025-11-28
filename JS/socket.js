/* ================================
   SOCKET.IO ALOQA (socket.js)
   ================================ */

// Serverga ulanamiz
const socket = io("https://chess-server-39ej.onrender.com");

// Serverdan keladigan yurishlarni qabul qilish
socket.on("move", ({ from, to, promotion }) => {
  // Local boardda bu joyda figura bo‘lmasa – e'tibor bermaymiz
  const movingPiece = position[from.row][from.col];
  if (!movingPiece) return;

  const prevPosition = clonePosition(position);
  const color = pieceColor(movingPiece);

  movePieceLocally(from, to, promotion || null);
  lastMove = { from, to };

  const san = generateSAN(
    movingPiece,
    from,
    to,
    promotion || null,
    prevPosition,
    position
  );

  addMoveToHistory(color, san, promotion || movingPiece);

  toggleTurn();
  selected = null;
  legalMoves = [];
  updateGameState();
  renderBoard();
});
