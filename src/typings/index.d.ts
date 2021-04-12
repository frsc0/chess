import {
  pieceColourArray,
  pieceMoveTypeArray,
  pieceTypeArray,
} from "../globalConstants";

export type PieceColour = typeof pieceColourArray[number];
export type PieceType = typeof pieceTypeArray[number];
export type PieceMoveType = typeof pieceMoveTypeArray[number];

export interface Piece {
  id: string;
  colour: PieceColour;
  type: PieceType;
  /**
   * When a piece is captured, its position is set to null.
   */
  position: Position | null;
  attacks: Position[];
}

export type PieceData = {
  [colour in PieceColour]: Piece[];
};

export type PieceCount = {
  [piece in PieceType]: number;
};

export type PieceCounts = {
  [colour in PieceColour]: PieceCount;
};

export type CastlingSide = keyof CastlingAvailability;

export interface CastlingAvailability {
  kingside: boolean;
  queenside: boolean;
}

export type CastlingAvailabilities = {
  [colour in PieceColour]: CastlingAvailability;
};

export interface Position {
  rank: number;
  file: number;
}

export interface GameData {
  activeColour: PieceColour;
  castlingAvailabilities: CastlingAvailabilities;
  enPassantTarget: Position | null;
  /**
   * This is the number of halfmoves since the last capture or pawn advance. Used for the fifty-move rule.
   */
  halfmoveClock: number;
  /**
   * The number of full moves. It starts at 1 and is incremented after Black's move.
   */
  fullmoveNumber: number;
  pieceData: PieceData;
  FEN: string;
}

export type PieceMovement = {
  /**
   * The number represents the number of squares the piece is allowed to move in that direction.
   * For lJumps the number represents the number of jumps that can be made in one move. This will usually be 1.
   * When null, this piece is forbidden from moving in this direction.
   */
  [moveType in PieceMoveType]: number | null;
};

export interface Move {
  piece: Piece;
  newPosition: Position;
}

export type BotEngine = "random" | "cherry";

export type GameResult = {
  [colour in PieceColour]: number;
};

export type EvaluationFactorScore = {
  [colour in PieceColour]: number;
};

export type PieceValues = {
  [type in PieceType]: number;
};

export interface MoveWithEval {
  move: Move | null;
  eval: number;
}

export type EvaluationFactor = "material" | "positional";

export type EvaluationFactorBalances = {
  [factor in EvaluationFactor]: number;
};

export type SquareValueMatrixType = "product" | "sum" | "fixed";

export type PieceFENMapping = {
  [colour in PieceColour]: { [type in PieceType]: string };
};

export type BotPlayers = { [colour in PieceColour]: boolean };

export type TranspositionMap = { [fenPosition: string]: number };

export type MiniMaxTerminationType =
  | "none"
  | "captures"
  | "hanging"
  | "winningExchanges";

export interface EvalMetrics {
  positionsAnalyzed: number;
  transpositionsAnalyzed: number;
  maxDepthSearched: number;
  duration: number;
}

export type EvalMetricsIncrementors = {
  [metric in keyof EvalMetrics]: (...args: any[]) => void;
};
