export const pieceTypeArray = [
  "pawn",
  "knight",
  "bishop",
  "rook",
  "queen",
  "king",
] as const;

export const pieceColourArray = ["white", "black"] as const;

export const pieceMoveTypeArray = [
  "pawnForward",
  "pawnDiagonalAttack",
  "vertical",
  "horizontal",
  "diagonal",
  "lJump",
  "castleKingside",
  "castleQueenside",
] as const;

export default pieceTypeArray;
