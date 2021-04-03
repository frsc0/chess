import pieceTypeArray, {
  pieceColourArray,
  pieceMoveTypeArray,
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
}

export type PieceMovement = {
  /**
   * The number represents the number of squares the piece is allowed to move in that direction.
   * For lJumps the number represents the number of jumps that can be made in one move. This will usually be 1.
   * When null, this piece is forbidden from moving in this direction.
   */
  [moveType in PieceMoveType]: number | null;
};
