import {
  BotEngine,
  BotPlayers,
  EvalFunction,
  EvaluationFactorBalances,
  MiniMaxTerminationType,
  PieceColour,
  PieceValues,
  SquareValueMatrixType,
} from "./typings";

export const boardSpaceUtilization = 0.8;

export const numRanks = 8;
export const numFiles = 8;

export const startingFEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const bots: BotPlayers = {
  white: true,
  black: true,
};

export const botEngine: { [colour in PieceColour]: BotEngine } = {
  white: "cherryComplex",
  black: "cherryComplex",
};

export const botMoveDelay = 0;

export const pawnValue = 100;

export const pieceValues: PieceValues = {
  king: pawnValue * 200,
  queen: pawnValue * 9,
  rook: pawnValue * 5,
  bishop: pawnValue * 3.1,
  knight: pawnValue * 3,
  pawn: pawnValue,
};

export const miniMaxDepth = 4;

export const evalFactorWeights: EvaluationFactorBalances = {
  material: 4 / 5,
  control: 1 / 5,
};

export const squareValueMatrixType: SquareValueMatrixType = "sum";

export const miniMaxTerminationType: MiniMaxTerminationType = "none";

export const pieceSquareMultiplier = 5;

export const evalFunction: EvalFunction = "complex";

export const maxSearchDepth = 10;
export const maxSearchTimeMs = 5000;
