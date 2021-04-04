import { CastlingSide, Piece, PieceColour, Position } from "../../typings";

export type GameDataAction =
  | { type: "SET_ACTIVE_COLOUR"; colour: PieceColour }
  | {
      type: "SET_CASTLING_AVAILABILITY";
      colour: PieceColour;
      side: CastlingSide;
      isAvailable: boolean;
    }
  | { type: "SET_EN_PASSANT_TARGET"; target: Position | null }
  | { type: "INCREMENT_HALFMOVE_CLOCK" }
  | { type: "SET_HALFMOVE_CLOCK"; value: number }
  | { type: "RESET_HALFMOVE_CLOCK" }
  | { type: "INCREMENT_FULLMOVE_NUMBER" }
  | { type: "SET_FULLMOVE_NUMBER"; value: number }
  | { type: "RESET_FULLMOVE_NUMBER" }
  | { type: "SET_PIECES"; colour: PieceColour; pieces: Piece[] };

export type InterfaceDataAction = {
  type: "SET_DROPPABLE_SQUARES";
  squares: Position[];
};
