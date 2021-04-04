import { CastlingSide, Piece, PieceColour, Position } from "../../typings";
import { GameDataAction } from "./types";

export const setActiveColour = (colour: PieceColour): GameDataAction => ({
  type: "SET_ACTIVE_COLOUR",
  colour,
});

export const setCastlingAvailability = (
  colour: PieceColour,
  side: CastlingSide,
  isAvailable: boolean
): GameDataAction => ({
  type: "SET_CASTLING_AVAILABILITY",
  colour,
  side,
  isAvailable,
});

export const setEnPassantTarget = (
  target: Position | null
): GameDataAction => ({
  type: "SET_EN_PASSANT_TARGET",
  target,
});

export const incrementHalfmoveClock = (): GameDataAction => ({
  type: "INCREMENT_HALFMOVE_CLOCK",
});

export const setHalfmoveClock = (value: number): GameDataAction => ({
  type: "SET_HALFMOVE_CLOCK",
  value,
});

export const resetHalfmoveClock = (): GameDataAction => ({
  type: "RESET_HALFMOVE_CLOCK",
});

export const incrementFullmoveNumber = (): GameDataAction => ({
  type: "INCREMENT_FULLMOVE_NUMBER",
});

export const setFullmoveNumber = (value: number): GameDataAction => ({
  type: "SET_FULLMOVE_NUMBER",
  value,
});

export const resetFullmoveNumber = (): GameDataAction => ({
  type: "RESET_FULLMOVE_NUMBER",
});

export const setPieces = (
  colour: PieceColour,
  pieces: Piece[]
): GameDataAction => ({
  type: "SET_PIECES",
  colour,
  pieces,
});
