import { EvalMetrics, PieceFENMapping } from "./typings";

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

export const blankCastlingAvailability = {
  kingside: false,
  queenside: false,
};

export const pieceFENMapping: PieceFENMapping = {
  white: {
    pawn: "P",
    knight: "N",
    bishop: "B",
    rook: "R",
    queen: "Q",
    king: "K",
  },
  black: {
    pawn: "p",
    knight: "n",
    bishop: "b",
    rook: "r",
    queen: "q",
    king: "k",
  },
};

export const pgnDateFormat = "yyyy'.'MM'.'dd";
export const botPGNName = "Cherry Bot";
export const humanPGNName = "Human Player";

export const initialEvalMetrics: EvalMetrics = {
  positionsAnalyzed: 0,
  transpositionsAnalyzed: 0,
  maxDepthSearched: 0,
  duration: 0,
};
