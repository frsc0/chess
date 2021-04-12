import { miniMaxDepth, miniMaxTerminationType, pieceValues } from "../config";
import { pieceTypeArray } from "../globalConstants";
import {
  BotEngine,
  EvalMetricsIncrementors,
  EvaluationFactor,
  EvaluationFactorBalances,
  EvaluationFactorScore,
  GameData,
  MiniMaxTerminationType,
  Move,
  MoveWithEval,
  Piece,
  PieceColour,
  PieceCount,
  PieceData,
  Position,
  SquareValueMatrixType,
  TranspositionMap,
} from "../typings";
import {
  enemyHasWinningExchange,
  generateAttacksForPiece,
  generateBlankGameData,
  getAllAvailableMoves,
  getEnemyColour,
  getFENPosFromFullString,
  getPieceOnSquareOfColour,
  initialPieceCount,
  isKingInCheck,
  moveIsCapture,
  movePieceAndGetGameData,
  pieceCanBeCaptured,
} from "./game.utils";

export const calculateMaterialMaxValue = (pieceData: PieceData): number => {
  let globalMax = 0;
  Object.entries(pieceData).forEach(([, pieces]) => {
    const colourMax = pieces.reduce<number>(
      (prev, cur) =>
        cur.type === "king" ? prev : prev + pieceValues[cur.type],
      0
    );
    globalMax = Math.max(globalMax, colourMax);
  });
  return globalMax;
};

export const calculatePositionMaxValue = (
  pieceData: PieceData,
  squareValueMatrix: number[][],
  numRanks: number,
  numFiles: number
): number => {
  const avgSquareValue =
    squareValueMatrix.reduce<number>(
      (boardSum, curRank) =>
        boardSum +
        curRank.reduce<number>((rankSum, curSq) => rankSum + curSq, 0),
      0
    ) /
    (numRanks * numFiles);

  const pieceMaxValues: PieceCount = {
    ...initialPieceCount,
  };
  const centralRank = Math.round((numRanks - 1) / 2);
  const centralFile = Math.round((numFiles - 1) / 2);
  const centralPosition: Position = {
    rank: centralRank,
    file: centralFile,
  };

  pieceTypeArray.forEach((type) => {
    const blankGameData = generateBlankGameData();
    const piece: Piece = {
      id: "temp-id",
      type,
      colour: "white",
      position: centralPosition,
      attacks: [],
    };

    blankGameData.pieceData.white.push(piece);
    const attacks = generateAttacksForPiece(
      piece,
      blankGameData,
      numRanks,
      numFiles,
      piece.type === "pawn",
      false
    );
    pieceMaxValues[type] = attacks.length * avgSquareValue;
  });

  let globalMax = 0;
  Object.entries(pieceData).forEach(([, pieces]) => {
    const colourMax = pieces.reduce<number>(
      (prev, cur) => prev + pieceMaxValues[cur.type],
      0
    );
    globalMax = Math.max(globalMax, colourMax);
  });
  return globalMax;
};

export const calculateEvaluationFactorMaxes = (
  pieceData: PieceData,
  squareValueMatrix: number[][],
  numRanks: number,
  numFiles: number
): EvaluationFactorBalances => ({
  material: calculateMaterialMaxValue(pieceData),
  positional: calculatePositionMaxValue(
    pieceData,
    squareValueMatrix,
    numRanks,
    numFiles
  ),
});

export const generateSquareValueMatrix = (
  numRanks: number,
  numFiles: number,
  type: SquareValueMatrixType
): number[][] => {
  const board: number[][] = [];
  for (let i = 0; i <= numRanks - 1; i += 1) {
    const rank: number[] = [];
    const numRanksFromEdge = Math.min(i, numRanks - 1 - i) + 1;

    for (let j = 0; j <= numFiles - 1; j += 1) {
      const numFilesFromEdge = Math.min(j, numFiles - 1 - j) + 1;
      let value: number;
      switch (type) {
        case "product":
          value = numRanksFromEdge * numFilesFromEdge;
          break;
        case "sum":
          value = numRanksFromEdge + numFilesFromEdge;
          break;
        case "fixed":
          value = 1;
          break;
        default:
          throw Error(`Invalid SquareValueMatrixType: ${type}.`);
      }
      rank.push(value);
    }

    board.push(rank);
  }

  return board;
};

export const calculateMaterialValueForColour = (pieces: Piece[]): number =>
  pieces.reduce<number>(
    (prev, cur) =>
      cur.position !== null && cur.type !== "king"
        ? prev + pieceValues[cur.type]
        : prev,
    0
  );

export const getMaterialValue = (
  pieceData: PieceData
): EvaluationFactorScore => ({
  white: calculateMaterialValueForColour(pieceData.white),
  black: calculateMaterialValueForColour(pieceData.black),
});

export const calculateMaterialBalance = (pieceData: PieceData): number => {
  const materialValue = getMaterialValue(pieceData);
  return materialValue.white - materialValue.black;
};

export const hasNoLegalMoves = (pieces: Piece[]): boolean =>
  getAllAvailableMoves(pieces).length === 0;

export const calculatePositionalValueForColour = (
  pieces: Piece[],
  squareValMatrix: number[][]
): number =>
  pieces.reduce<number>(
    (prev, cur) =>
      prev +
      cur.attacks.reduce<number>(
        (aPrev, aCur) => aPrev + squareValMatrix[aCur.rank][aCur.file],
        0
      ),
    0
  );

export const getPositionalValue = (
  pieceData: PieceData,
  squareValMatrix: number[][]
): EvaluationFactorScore => ({
  white: calculatePositionalValueForColour(pieceData.white, squareValMatrix),
  black: calculatePositionalValueForColour(pieceData.black, squareValMatrix),
});

export const calculatePositionalBalance = (
  pieceData: PieceData,
  squareValMatrix: number[][]
): number => {
  const positionalBalance = getPositionalValue(pieceData, squareValMatrix);
  return positionalBalance.white - positionalBalance.black;
};

export const getWeightedEvalFactorBalances = (
  rawValues: EvaluationFactorBalances,
  maxValues: EvaluationFactorBalances,
  weights: EvaluationFactorBalances
): EvaluationFactorBalances => {
  const weightedValues: EvaluationFactorBalances = {
    material: 0,
    positional: 0,
  };
  Object.entries(rawValues).forEach(([factor, rawValue]) => {
    const factorTyped = factor as EvaluationFactor;
    weightedValues[factorTyped] =
      (rawValue / maxValues[factorTyped]) * weights[factorTyped];
  });
  return weightedValues;
};

export const getOverallEvalFromWeightedFactorBalances = (
  weightedEvalFactorBalances: EvaluationFactorBalances
): number =>
  Object.entries(weightedEvalFactorBalances).reduce<number>(
    (prev, [, weightedValue]) => prev + weightedValue,
    0
  );

export const evaluatePosition = (
  gameData: GameData,
  squareValMatrix: number[][],
  maxEvalFactorValues: EvaluationFactorBalances,
  evalFactorWeights: EvaluationFactorBalances
): number => {
  const whiteMoves = getAllAvailableMoves(gameData.pieceData.white);
  if (whiteMoves.length === 0) {
    if (isKingInCheck("white", gameData.pieceData)) {
      return Number.NEGATIVE_INFINITY;
    }
    return 0;
  }
  const blackMoves = getAllAvailableMoves(gameData.pieceData.black);
  if (blackMoves.length === 0) {
    if (isKingInCheck("black", gameData.pieceData)) {
      return Number.POSITIVE_INFINITY;
    }
    return 0;
  }

  const evaluationFactorBalances: EvaluationFactorBalances = {
    material: calculateMaterialBalance(gameData.pieceData),
    positional: calculatePositionalBalance(gameData.pieceData, squareValMatrix),
  };

  const weightedEvalFactorBalance = getWeightedEvalFactorBalances(
    evaluationFactorBalances,
    maxEvalFactorValues,
    evalFactorWeights
  );

  return getOverallEvalFromWeightedFactorBalances(weightedEvalFactorBalance);
};

export const getCaptureValueDifference = (
  move: Move,
  enemyPieces: Piece[]
): number => {
  const enemyPieceCaptured = getPieceOnSquareOfColour(
    move.newPosition,
    enemyPieces
  );
  if (enemyPieceCaptured === null) {
    return Number.NEGATIVE_INFINITY;
  }
  return pieceValues[enemyPieceCaptured.type] - pieceValues[move.piece.type];
};

export const moveSearchSorter = (
  a: Move,
  b: Move,
  enemyPieces: Piece[],
  squareValMatrix: number[][]
): number => {
  // Sort criterion 1: Capture value difference.
  const aCVD = getCaptureValueDifference(a, enemyPieces);
  const bCVD = getCaptureValueDifference(b, enemyPieces);
  if (aCVD !== bCVD) {
    return bCVD - aCVD;
  }

  // Sort criterion 2: Move to high value square.
  return (
    squareValMatrix[b.newPosition.rank][b.newPosition.file] -
    squareValMatrix[a.newPosition.rank][a.newPosition.file]
  );
};

export const getSearchOptimizedMoves = (
  friendlyPieces: Piece[],
  enemyPieces: Piece[],
  squareValMatrix: number[][],
  capturesOnly: boolean
): Move[] => {
  let availableMoves = getAllAvailableMoves(friendlyPieces);
  if (capturesOnly === true) {
    availableMoves = availableMoves.filter((move) =>
      moveIsCapture(move, enemyPieces)
    );
  }

  availableMoves.sort((a, b) =>
    moveSearchSorter(a, b, enemyPieces, squareValMatrix)
  );
  return availableMoves;
};

export const selectRandomMove = (moves: Move[]): Move =>
  moves[Math.floor(Math.random() * moves.length)];

// export const miniMaxUntilNoneHanging = (
//   endNode: GameData,
//   alpha: number,
//   beta: number,
//   numRanks: number,
//   numFiles: number,
//   squareValMatrix: number[][],
//   maxEvalFactors: EvaluationFactorBalances,
//   evalFactorWeights: EvaluationFactorBalances,
//   transpositionMap: TranspositionMap
// ): MoveWithEval => {
//   const { activeColour } = endNode;
//   if (
//     hasHangingPiece(activeColour, endNode, numRanks, numFiles) === false ||
//     hasNoLegalMoves(endNode.pieceData[activeColour])
//   ) {
//     return {
//       move: null,
//       eval: evaluatePosition(
//         endNode,
//         squareValMatrix,
//         maxEvalFactors,
//         evalFactorWeights
//       ),
//     };
//   }

//   const enemyColour = getEnemyColour(activeColour);
//   const searchOptimizedMoves = getSearchOptimizedMoves(
//     endNode.pieceData[activeColour],
//     endNode.pieceData[enemyColour],
//     squareValMatrix,
//     true
//   );

//   let bestMoves: Move[] = [];
//   let bestEval = 0;
//   let newAlpha = alpha;
//   let newBeta = beta;
//   const transpositionMapRef = transpositionMap;

//   if (activeColour === "white") {
//     bestEval = Number.NEGATIVE_INFINITY;
//     searchOptimizedMoves.some((bMove) => {
//       const gameDataAfterMove = movePieceAndGetGameData(
//         endNode,
//         bMove.piece,
//         bMove.newPosition.rank,
//         bMove.newPosition.file,
//         numRanks,
//         numFiles,
//         false
//       );

//       const fenPos = getFENPosFromFullString(gameDataAfterMove.FEN);
//       const currentEval: MoveWithEval =
//         fenPos in transpositionMapRef
//           ? { move: bMove, eval: transpositionMapRef[fenPos] }
//           : miniMaxUntilNoneHanging(
//               gameDataAfterMove,
//               newAlpha,
//               newBeta,
//               numRanks,
//               numFiles,
//               squareValMatrix,
//               maxEvalFactors,
//               evalFactorWeights,
//               transpositionMapRef
//             );
//       transpositionMapRef[fenPos] = currentEval.eval;

//       if (currentEval.eval > bestEval) {
//         bestEval = currentEval.eval;
//         bestMoves = [bMove];
//       } else if (currentEval.eval === bestEval) {
//         bestMoves.push(bMove);
//       }
//       newAlpha = Math.max(newAlpha, bestEval);
//       return newAlpha >= newBeta;
//     });
//   }

//   if (activeColour === "black") {
//     bestEval = Number.POSITIVE_INFINITY;
//     searchOptimizedMoves.some((wMove) => {
//       const gameDataAfterMove = movePieceAndGetGameData(
//         endNode,
//         wMove.piece,
//         wMove.newPosition.rank,
//         wMove.newPosition.file,
//         numRanks,
//         numFiles,
//         false
//       );

//       const fenPos = getFENPosFromFullString(gameDataAfterMove.FEN);
//       const currentEval: MoveWithEval =
//         fenPos in transpositionMapRef
//           ? { move: wMove, eval: transpositionMapRef[fenPos] }
//           : miniMaxUntilNoneHanging(
//               gameDataAfterMove,
//               newAlpha,
//               newBeta,
//               numRanks,
//               numFiles,
//               squareValMatrix,
//               maxEvalFactors,
//               evalFactorWeights,
//               transpositionMapRef
//             );
//       transpositionMapRef[fenPos] = currentEval.eval;

//       if (currentEval.eval < bestEval) {
//         bestEval = currentEval.eval;
//         bestMoves = [wMove];
//       } else if (currentEval.eval === bestEval) {
//         bestMoves.push(wMove);
//       }
//       newBeta = Math.min(newBeta, bestEval);
//       return newBeta <= newAlpha;
//     });
//   }

//   return { move: selectRandomMove(bestMoves), eval: bestEval };
// };

export const miniMax = (
  curGameData: GameData,
  depthRemaining: number,
  maxDepthSearched: number,
  terminationType: MiniMaxTerminationType,
  alpha: number,
  beta: number,
  numRanks: number,
  numFiles: number,
  squareValMatrix: number[][],
  maxEvalFactors: EvaluationFactorBalances,
  evalFactorWeights: EvaluationFactorBalances,
  transpositionMap: TranspositionMap,
  evalMetricsIncrementors: EvalMetricsIncrementors
): MoveWithEval => {
  const { activeColour } = curGameData;
  if (hasNoLegalMoves(curGameData.pieceData[activeColour])) {
    return {
      move: null,
      eval: evaluatePosition(
        curGameData,
        squareValMatrix,
        maxEvalFactors,
        evalFactorWeights
      ),
    };
  }
  const atTerminal = depthRemaining <= 0;
  if (miniMaxDepth - depthRemaining > maxDepthSearched) {
    evalMetricsIncrementors.maxDepthSearched(maxDepthSearched + 1);
  }
  if (atTerminal) {
    switch (terminationType) {
      case "none":
        return {
          move: null,
          eval: evaluatePosition(
            curGameData,
            squareValMatrix,
            maxEvalFactors,
            evalFactorWeights
          ),
        };
      case "captures":
        if (pieceCanBeCaptured(activeColour, curGameData.pieceData) === false) {
          return {
            move: null,
            eval: evaluatePosition(
              curGameData,
              squareValMatrix,
              maxEvalFactors,
              evalFactorWeights
            ),
          };
        }
        break;
      case "winningExchanges":
        if (
          enemyHasWinningExchange(
            activeColour,
            curGameData,
            numRanks,
            numFiles
          ) === false
        ) {
          return {
            move: null,
            eval: evaluatePosition(
              curGameData,
              squareValMatrix,
              maxEvalFactors,
              evalFactorWeights
            ),
          };
        }
        break;
      case "hanging":
        // TODO: Implement hanging termination type conditional.
        return {
          move: null,
          eval: evaluatePosition(
            curGameData,
            squareValMatrix,
            maxEvalFactors,
            evalFactorWeights
          ),
        };
      default:
        throw Error(`Invalid termination type: ${terminationType}.`);
    }
  }

  const enemyColour = getEnemyColour(activeColour);
  const searchOptimizedMoves = getSearchOptimizedMoves(
    curGameData.pieceData[activeColour],
    curGameData.pieceData[enemyColour],
    squareValMatrix,
    atTerminal
  );

  let bestMoves: Move[] = [];
  let bestEval = 0;
  let newAlpha = alpha;
  let newBeta = beta;
  const transpositionMapRef = transpositionMap;

  if (activeColour === "white") {
    bestEval = Number.NEGATIVE_INFINITY;
    searchOptimizedMoves.some((bMove) => {
      const gameDataAfterMove = movePieceAndGetGameData(
        curGameData,
        bMove.piece,
        bMove.newPosition.rank,
        bMove.newPosition.file,
        numRanks,
        numFiles,
        false
      );

      evalMetricsIncrementors.positionsAnalyzed();

      const fenPos = getFENPosFromFullString(gameDataAfterMove.FEN);
      let currentEval: MoveWithEval;
      if (fenPos in transpositionMapRef) {
        currentEval = { move: bMove, eval: transpositionMapRef[fenPos] };
      } else {
        currentEval = miniMax(
          gameDataAfterMove,
          depthRemaining - 1,
          maxDepthSearched,
          terminationType,
          newAlpha,
          newBeta,
          numRanks,
          numFiles,
          squareValMatrix,
          maxEvalFactors,
          evalFactorWeights,
          transpositionMapRef,
          evalMetricsIncrementors
        );
        transpositionMapRef[fenPos] = currentEval.eval;
        evalMetricsIncrementors.transpositionsAnalyzed();
      }

      if (currentEval.eval > bestEval) {
        bestEval = currentEval.eval;
        bestMoves = [bMove];
      } else if (currentEval.eval === bestEval) {
        bestMoves.push(bMove);
      }
      newAlpha = Math.max(newAlpha, bestEval);
      return newAlpha >= newBeta;
    });
  }

  if (activeColour === "black") {
    bestEval = Number.POSITIVE_INFINITY;
    searchOptimizedMoves.some((wMove) => {
      const gameDataAfterMove = movePieceAndGetGameData(
        curGameData,
        wMove.piece,
        wMove.newPosition.rank,
        wMove.newPosition.file,
        numRanks,
        numFiles,
        false
      );

      evalMetricsIncrementors.positionsAnalyzed();

      const fenPos = getFENPosFromFullString(gameDataAfterMove.FEN);
      let currentEval: MoveWithEval;
      if (fenPos in transpositionMapRef) {
        currentEval = { move: wMove, eval: transpositionMapRef[fenPos] };
      } else {
        currentEval = miniMax(
          gameDataAfterMove,
          depthRemaining - 1,
          maxDepthSearched,
          terminationType,
          newAlpha,
          newBeta,
          numRanks,
          numFiles,
          squareValMatrix,
          maxEvalFactors,
          evalFactorWeights,
          transpositionMapRef,
          evalMetricsIncrementors
        );
        transpositionMapRef[fenPos] = currentEval.eval;
        evalMetricsIncrementors.transpositionsAnalyzed();
      }

      if (currentEval.eval < bestEval) {
        bestEval = currentEval.eval;
        bestMoves = [wMove];
      } else if (currentEval.eval === bestEval) {
        bestMoves.push(wMove);
      }
      newBeta = Math.min(newBeta, bestEval);
      return newBeta <= newAlpha;
    });
  }

  return { move: selectRandomMove(bestMoves), eval: bestEval };
};

export const cherryBotSelectMove = (
  gameData: GameData,
  colour: PieceColour,
  availableMoves: Move[],
  numRanks: number,
  numFiles: number,
  squareValMatrix: number[][],
  maxEvalFactors: EvaluationFactorBalances,
  evalFactorWeights: EvaluationFactorBalances,
  maxDepthSearched: number,
  evalMetricsIncrementors: EvalMetricsIncrementors
): Move => {
  if (availableMoves.length === 0) {
    throw Error(`No available moves for colour ${colour}.`);
  }
  const initTranspositionMap: TranspositionMap = {};
  const bestMoveAndEval = miniMax(
    gameData,
    miniMaxDepth - 1,
    maxDepthSearched,
    miniMaxTerminationType,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    numRanks,
    numFiles,
    squareValMatrix,
    maxEvalFactors,
    evalFactorWeights,
    initTranspositionMap,
    evalMetricsIncrementors
  );
  if (bestMoveAndEval.move === null) {
    throw Error("Minimax did not return a move.");
  }
  return bestMoveAndEval.move;
};

export const botSelectMove = (
  engine: BotEngine,
  colour: PieceColour,
  gameData: GameData,
  numRanks: number,
  numFiles: number,
  squareValMatrix: number[][],
  maxEvalFactors: EvaluationFactorBalances,
  evalFactorWeights: EvaluationFactorBalances,
  maxDepthSearched: number,
  evalMetricsIncrementors: EvalMetricsIncrementors
): Move => {
  const availableMoves = gameData.pieceData[colour].reduce<Move[]>(
    (prev, cur) => {
      const pieceMoves: Move[] = cur.attacks.map((a) => ({
        piece: cur,
        newPosition: a,
      }));
      return prev.concat(pieceMoves);
    },
    []
  );
  if (availableMoves.length === 0) {
    throw Error(`No legal moves for ${colour} bot.`);
  }
  switch (engine) {
    case "random":
      return selectRandomMove(availableMoves);
    case "cherry":
      return cherryBotSelectMove(
        gameData,
        colour,
        availableMoves,
        numRanks,
        numFiles,
        squareValMatrix,
        maxEvalFactors,
        evalFactorWeights,
        maxDepthSearched,
        evalMetricsIncrementors
      );
    default:
      throw Error(`Invalid bot engine: ${engine}.`);
  }
};

export default botSelectMove;
