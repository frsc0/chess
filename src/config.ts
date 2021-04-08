import { BotEngine, PieceColour } from "./typings";

export const boardSpaceUtilization = 0.8;

export const numRanks = 8;
export const numFiles = 8;

export const startingFEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const bots: { [colour in PieceColour]: boolean } = {
  white: true,
  black: true,
};

export const botEngine: { [colour in PieceColour]: BotEngine } = {
  white: "random",
  black: "random",
};

export const botMoveDelay = 250;
