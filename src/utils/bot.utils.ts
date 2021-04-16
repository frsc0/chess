import {
  maxSearchDepth,
  maxSearchTimeMs,
  miniMaxTerminationType,
  pieceValues,
} from "../config";
import { gamePhaseArray, pieceTypeArray } from "../globalConstants";
import {
  BotEngine,
  EvalFunction,
  EvalMetricsIncrementors,
  EvaluationFactor,
  EvaluationFactorBalances,
  EvaluationFactorScore,
  GameData,
  GamePhase,
  MiniMaxTerminationType,
  Move,
  MoveWithEval,
  Piece,
  PieceColour,
  PieceCount,
  PieceData,
  PieceSquarePhaseTables,
  PieceType,
  Position,
  SquarePhaseTables,
  SquareValueMatrixType,
  TranspositionMap,
} from "../typings";
import {
  enemyHasWinningExchange,
  generateAttacksForPiece,
  generateBlankGameData,
  getAllAvailableMoves,
  getCastlingSquare,
  getEnemyColour,
  getFENPosFromFullString,
  getNumberOfAttackersOfPosition,
  getPieceOnSquareOfColour,
  initialPieceCount,
  isKingInCheck,
  isSamePosition,
  moveIsCapture,
  movePieceAndGetGameData,
  pieceCanBeCaptured,
} from "./game.utils";
import { insertEval } from "./helper.utils";

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

export const calculateControlMaxValue = (
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
  control: calculateControlMaxValue(
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

export const calculateControlValueForColour = (
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

export const getControlScore = (
  pieceData: PieceData,
  squareValMatrix: number[][]
): EvaluationFactorScore => ({
  white: calculateControlValueForColour(pieceData.white, squareValMatrix),
  black: calculateControlValueForColour(pieceData.black, squareValMatrix),
});

export const calculateControlBalance = (
  pieceData: PieceData,
  squareValMatrix: number[][]
): number => {
  const controlScore = getControlScore(pieceData, squareValMatrix);
  return controlScore.white - controlScore.black;
};

export const getWeightedEvalFactorBalances = (
  rawValues: EvaluationFactorBalances,
  maxValues: EvaluationFactorBalances,
  weights: EvaluationFactorBalances
): EvaluationFactorBalances => {
  const weightedValues: EvaluationFactorBalances = {
    material: 0,
    control: 0,
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

export const getPositionScoreForColour = (
  pieces: Piece[],
  pieceSquarePhaseTables: PieceSquarePhaseTables,
  gamePhase: GamePhase,
  numRanks: number
): number => {
  const { colour } = pieces[0];
  return pieces.reduce<number>((curSum, piece) => {
    if (piece.position === null) {
      return curSum;
    }
    const rankToUse =
      colour === "white"
        ? piece.position.rank
        : numRanks - 1 - piece.position.rank;
    return (
      curSum +
      pieceSquarePhaseTables[piece.type][gamePhase][rankToUse][
        piece.position.file
      ]
    );
  }, 0);
};

export const getPositionScore = (
  pieceData: PieceData,
  pieceSquarePhaseTables: PieceSquarePhaseTables,
  gamePhase: GamePhase,
  numRanks: number
): EvaluationFactorScore => ({
  white: getPositionScoreForColour(
    pieceData.white,
    pieceSquarePhaseTables,
    gamePhase,
    numRanks
  ),
  black: getPositionScoreForColour(
    pieceData.black,
    pieceSquarePhaseTables,
    gamePhase,
    numRanks
  ),
});

export const calculatePositionBalance = (
  pieceData: PieceData,
  pieceSquarePhaseTables: PieceSquarePhaseTables,
  gamePhase: GamePhase,
  numRanks: number
): number => {
  const positionScore = getPositionScore(
    pieceData,
    pieceSquarePhaseTables,
    gamePhase,
    numRanks
  );
  return positionScore.white - positionScore.black;
};

export const simpleEval = (
  gameData: GameData,
  pieceSquarePhaseTables: PieceSquarePhaseTables,
  gamePhase: GamePhase,
  numRanks: number
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

  const material = calculateMaterialBalance(gameData.pieceData);
  const position = calculatePositionBalance(
    gameData.pieceData,
    pieceSquarePhaseTables,
    gamePhase,
    numRanks
  );

  return material + position;
};

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
    control: calculateControlBalance(gameData.pieceData, squareValMatrix),
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
    return -pieceValues.queen;
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

  // Sort criterion 2: Don't move to square attacked by many enemy pieces.
  const aAttackers = getNumberOfAttackersOfPosition(a.newPosition, enemyPieces);
  const bAttackers = getNumberOfAttackersOfPosition(b.newPosition, enemyPieces);
  if (aAttackers !== bAttackers) {
    return bAttackers - aAttackers;
  }

  // Sort criterion 3: Move to high value square.
  const aVal = squareValMatrix[a.newPosition.rank][a.newPosition.file];
  const bVal = squareValMatrix[b.newPosition.rank][b.newPosition.file];
  return bVal - aVal;
};

/**
 * Alternate search function that can be plugged in.
 * Considers all sort criteria before deciding on sort order.
 */
export const moveSearchSorterAggregate = (
  a: Move,
  b: Move,
  enemyPieces: Piece[],
  squareValMatrix: number[][]
): number => {
  let sortValue = 0;

  // Sort criterion 1: Capture value difference.
  const sort1Weight = 10;
  const aCVD = getCaptureValueDifference(a, enemyPieces);
  const bCVD = getCaptureValueDifference(b, enemyPieces);
  sortValue += sort1Weight * (bCVD - aCVD);

  // Sort criterion 2: Move to high value square.
  const sort2Weight = 5;
  sortValue +=
    sort2Weight *
    (squareValMatrix[b.newPosition.rank][b.newPosition.file] -
      squareValMatrix[a.newPosition.rank][a.newPosition.file]);

  // Sort criterion 3: Don't move to square attacked by many enemy pieces.
  const sort3Weight = 5;
  const aAttackers = getNumberOfAttackersOfPosition(a.newPosition, enemyPieces);
  const bAttackers = getNumberOfAttackersOfPosition(b.newPosition, enemyPieces);
  sortValue += sort3Weight * (aAttackers - bAttackers);

  return sortValue;
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

export const miniMax = (
  curGameData: GameData,
  preOrderedMoves: Move[] | null,
  depthRemaining: number,
  terminationType: MiniMaxTerminationType,
  alpha: number,
  beta: number,
  numRanks: number,
  numFiles: number,
  squareValMatrix: number[][],
  maxEvalFactors: EvaluationFactorBalances,
  evalFactorWeights: EvaluationFactorBalances,
  transpositionMap: TranspositionMap,
  evalMetricsIncrementors: EvalMetricsIncrementors,
  evalFunction: EvalFunction,
  pieceSquarePhaseTables: PieceSquarePhaseTables,
  gamePhase: GamePhase
): MoveWithEval[] => {
  const { activeColour } = curGameData;
  const enemyColour = getEnemyColour(activeColour);

  if (hasNoLegalMoves(curGameData.pieceData[activeColour])) {
    return [
      {
        move: null,
        eval:
          evalFunction === "simple"
            ? simpleEval(
                curGameData,
                pieceSquarePhaseTables,
                gamePhase,
                numRanks
              )
            : evaluatePosition(
                curGameData,
                squareValMatrix,
                maxEvalFactors,
                evalFactorWeights
              ),
      },
    ];
  }
  const atTerminal = depthRemaining <= 0;
  if (atTerminal) {
    switch (terminationType) {
      case "none":
        return [
          {
            move: null,
            eval:
              evalFunction === "simple"
                ? simpleEval(
                    curGameData,
                    pieceSquarePhaseTables,
                    gamePhase,
                    numRanks
                  )
                : evaluatePosition(
                    curGameData,
                    squareValMatrix,
                    maxEvalFactors,
                    evalFactorWeights
                  ),
          },
        ];
      case "captures":
        if (
          pieceCanBeCaptured(enemyColour, curGameData.pieceData) === false ||
          -depthRemaining > maxSearchDepth
        ) {
          return [
            {
              move: null,
              eval:
                evalFunction === "simple"
                  ? simpleEval(
                      curGameData,
                      pieceSquarePhaseTables,
                      gamePhase,
                      numRanks
                    )
                  : evaluatePosition(
                      curGameData,
                      squareValMatrix,
                      maxEvalFactors,
                      evalFactorWeights
                    ),
            },
          ];
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
          return [
            {
              move: null,
              eval:
                evalFunction === "simple"
                  ? simpleEval(
                      curGameData,
                      pieceSquarePhaseTables,
                      gamePhase,
                      numRanks
                    )
                  : evaluatePosition(
                      curGameData,
                      squareValMatrix,
                      maxEvalFactors,
                      evalFactorWeights
                    ),
            },
          ];
        }
        break;
      case "hanging":
        // TODO: Implement hanging termination type conditional.
        return [
          {
            move: null,
            eval:
              evalFunction === "simple"
                ? simpleEval(
                    curGameData,
                    pieceSquarePhaseTables,
                    gamePhase,
                    numRanks
                  )
                : evaluatePosition(
                    curGameData,
                    squareValMatrix,
                    maxEvalFactors,
                    evalFactorWeights
                  ),
          },
        ];
      default:
        throw Error(`Invalid termination type: ${terminationType}.`);
    }
  }

  const searchOptimizedMoves =
    preOrderedMoves ||
    getSearchOptimizedMoves(
      curGameData.pieceData[activeColour],
      curGameData.pieceData[enemyColour],
      squareValMatrix,
      atTerminal
    );

  let bestEval = 0;
  let orderedMoves: MoveWithEval[] = [];
  let newAlpha = alpha;
  let newBeta = beta;
  const transpositionMapRef = transpositionMap;

  if (activeColour === "white") {
    bestEval = Number.NEGATIVE_INFINITY;
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
        [currentEval] = miniMax(
          gameDataAfterMove,
          null,
          depthRemaining - 1,
          terminationType,
          newAlpha,
          newBeta,
          numRanks,
          numFiles,
          squareValMatrix,
          maxEvalFactors,
          evalFactorWeights,
          transpositionMapRef,
          evalMetricsIncrementors,
          evalFunction,
          pieceSquarePhaseTables,
          gamePhase
        );
        currentEval.move = wMove;
        transpositionMapRef[fenPos] = currentEval.eval;
        evalMetricsIncrementors.transpositionsAnalyzed();
      }

      orderedMoves = insertEval(orderedMoves, currentEval, activeColour);

      if (currentEval.eval > bestEval) {
        bestEval = currentEval.eval;
      }
      newAlpha = Math.max(newAlpha, bestEval);
      return newAlpha >= newBeta;
    });
  }

  if (activeColour === "black") {
    bestEval = Number.POSITIVE_INFINITY;
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
        [currentEval] = miniMax(
          gameDataAfterMove,
          null,
          depthRemaining - 1,
          terminationType,
          newAlpha,
          newBeta,
          numRanks,
          numFiles,
          squareValMatrix,
          maxEvalFactors,
          evalFactorWeights,
          transpositionMapRef,
          evalMetricsIncrementors,
          evalFunction,
          pieceSquarePhaseTables,
          gamePhase
        );
        currentEval.move = bMove;
        transpositionMapRef[fenPos] = currentEval.eval;
        evalMetricsIncrementors.transpositionsAnalyzed();
      }

      orderedMoves = insertEval(orderedMoves, currentEval, activeColour);

      if (currentEval.eval < bestEval) {
        bestEval = currentEval.eval;
      }
      newBeta = Math.min(newBeta, bestEval);
      return newBeta <= newAlpha;
    });
  }

  return orderedMoves;
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
  evalMetricsIncrementors: EvalMetricsIncrementors,
  evalFunction: EvalFunction,
  pieceSquarePhaseTables: PieceSquarePhaseTables,
  gamePhase: GamePhase,
  updateEval: (newEval: number) => void
): Move => {
  if (availableMoves.length === 0) {
    throw Error(`No available moves for colour ${colour}.`);
  }

  let transpositionMap: TranspositionMap = {};
  let timeOut = false;
  let depthToSearch = 1;
  let bestMoveAndEval: MoveWithEval | undefined;

  const enemyColour = getEnemyColour(colour);
  let moveOrder = getSearchOptimizedMoves(
    gameData.pieceData[colour],
    gameData.pieceData[enemyColour],
    squareValMatrix,
    false
  );

  const startTime = Date.now();

  while (timeOut === false && depthToSearch <= maxSearchDepth) {
    evalMetricsIncrementors.maxDepthSearched(depthToSearch);
    const newMoveOrder = miniMax(
      gameData,
      moveOrder,
      depthToSearch,
      miniMaxTerminationType,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      numRanks,
      numFiles,
      squareValMatrix,
      maxEvalFactors,
      evalFactorWeights,
      transpositionMap,
      evalMetricsIncrementors,
      evalFunction,
      pieceSquarePhaseTables,
      gamePhase
    );

    [bestMoveAndEval] = newMoveOrder;
    moveOrder = newMoveOrder.map((mWE) => {
      if (mWE.move === null) {
        throw Error("Unexpected null move");
      }
      return mWE.move;
    });
    transpositionMap = {};

    depthToSearch += 1;
    const iterationEndTime = Date.now();
    timeOut = iterationEndTime - startTime > maxSearchTimeMs;
  }

  if (bestMoveAndEval === undefined || bestMoveAndEval.move === null) {
    throw Error("Minimax did not return a move.");
  }
  updateEval(bestMoveAndEval.eval);
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
  evalMetricsIncrementors: EvalMetricsIncrementors,
  evalFunction: EvalFunction,
  pieceSquarePhaseTables: PieceSquarePhaseTables,
  gamePhase: GamePhase,
  updateEval: (newEval: number) => void
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
    case "cherrySimple":
      return cherryBotSelectMove(
        gameData,
        colour,
        availableMoves,
        numRanks,
        numFiles,
        squareValMatrix,
        maxEvalFactors,
        evalFactorWeights,
        evalMetricsIncrementors,
        "simple",
        pieceSquarePhaseTables,
        gamePhase,
        updateEval
      );
    case "cherryComplex":
      return cherryBotSelectMove(
        gameData,
        colour,
        availableMoves,
        numRanks,
        numFiles,
        squareValMatrix,
        maxEvalFactors,
        evalFactorWeights,
        evalMetricsIncrementors,
        "complex",
        pieceSquarePhaseTables,
        gamePhase,
        updateEval
      );
    default:
      throw Error(`Invalid bot engine: ${engine}.`);
  }
};

export const getKingSquareValue = (
  rank: number,
  file: number,
  numRanks: number,
  numFiles: number,
  multiplier: number
): number => {
  const numRanksFromStart = rank;

  const castlingSquares = [
    getCastlingSquare("white", "kingside", numRanks, numFiles),
    getCastlingSquare("white", "queenside", numRanks, numFiles),
  ];
  if (castlingSquares.some((sq) => isSamePosition(sq, { rank, file }))) {
    return multiplier * 5;
  }

  const filesQuartile = numFiles / 4;
  const numFilesFromEdge = Math.min(file, numFiles - 1 - file);
  const filesBonus = numFilesFromEdge - filesQuartile;
  return multiplier * (1 - numRanksFromStart) + (multiplier / 2) * filesBonus;
};

export const getQueenSquareValue = (
  rank: number,
  file: number,
  numRanks: number,
  numFiles: number,
  multiplier: number
): number => {
  const ranksQuartile = numRanks / 4;
  const filesQuartile = numFiles / 4;
  const numRanksFromEdge = Math.min(rank, numRanks - 1 - rank);
  const numFilesFromEdge = Math.min(file, numFiles - 1 - file);
  const ranksBonus = numRanksFromEdge - ranksQuartile;
  const filesBonus = numFilesFromEdge - filesQuartile;
  return (multiplier / 2) * (ranksBonus + filesBonus);
};

export const getRookSquareValue = (
  rank: number,
  file: number,
  numRanks: number,
  numFiles: number,
  multiplier: number
): number => {
  let ranksBonus = 0;
  let filesBonus = 0;
  if (rank === numRanks - 2) {
    ranksBonus = 4;
  }
  const centralFile = (numFiles - 1) / 2;
  if (file === Math.ceil(centralFile) || file === Math.floor(centralFile)) {
    filesBonus = 2;
  }
  return multiplier * (ranksBonus + filesBonus);
};

export const getBishopSquareValue = (
  rank: number,
  file: number,
  numRanks: number,
  numFiles: number,
  multiplier: number
): number => {
  const ranksBonusBoundary = numRanks / 8;
  const filesBonusBoundary = numFiles / 8;
  const numRanksFromEdge = Math.min(rank, numRanks - 1 - rank);
  const numFilesFromEdge = Math.min(file, numFiles - 1 - file);
  const ranksBonus = numRanksFromEdge - ranksBonusBoundary;
  const filesBonus = numFilesFromEdge - filesBonusBoundary;
  return (multiplier / 2) * (ranksBonus + filesBonus);
};

export const getKnightSquareValue = (
  rank: number,
  file: number,
  numRanks: number,
  numFiles: number,
  multiplier: number
): number => {
  const ranksBonusBoundary = numRanks / 8;
  const filesBonusBoundary = numFiles / 8;
  const numRanksFromEdge = Math.min(rank, numRanks - 1 - rank);
  const numFilesFromEdge = Math.min(file, numFiles - 1 - file);
  const ranksBonus = numRanksFromEdge - ranksBonusBoundary;
  const filesBonus = numFilesFromEdge - filesBonusBoundary;
  return multiplier * (ranksBonus + filesBonus);
};

export const getPawnSquareValue = (
  rank: number,
  file: number,
  numRanks: number,
  numFiles: number,
  multiplier: number
): number => {
  if (rank === 0 || rank === numRanks - 1) {
    return 0;
  }
  const numRanksFromStart = rank - 1;
  const filesQuartile = numFiles / 4;
  const numFilesFromEdge = Math.min(file, numFiles - 1 - file);
  const filesBonus = numFilesFromEdge - filesQuartile;
  return multiplier * (numRanksFromStart + filesBonus);
};

export const generatePieceSquarePhaseTable = (
  pieceType: PieceType,
  phase: GamePhase,
  numRanks: number,
  numFiles: number,
  multiplier: number
): number[][] => {
  // TODO: Phase-dependent piece-square tables.
  const board: number[][] = [];
  for (let i = 0; i <= numRanks - 1; i += 1) {
    const rank: number[] = [];

    for (let j = 0; j <= numFiles - 1; j += 1) {
      let value: number;
      switch (pieceType) {
        case "pawn":
          value = getPawnSquareValue(i, j, numRanks, numFiles, multiplier);
          break;
        case "knight":
          value = getKnightSquareValue(i, j, numRanks, numFiles, multiplier);
          break;
        case "bishop":
          value = getBishopSquareValue(i, j, numRanks, numFiles, multiplier);
          break;
        case "rook":
          value = getRookSquareValue(i, j, numRanks, numFiles, multiplier);
          break;
        case "queen":
          value = getQueenSquareValue(i, j, numRanks, numFiles, multiplier);
          break;
        case "king":
          value = getKingSquareValue(i, j, numRanks, numFiles, multiplier);
          break;
        default:
          throw Error(`Invalid piece type ${pieceType}.`);
      }
      rank.push(value);
    }

    board.push(rank);
  }
  return board;
};

export const initializePieceSquarePhaseTables = (
  numRanks: number,
  numFiles: number,
  multiplier: number
): PieceSquarePhaseTables => {
  const initTable: number[][] = [[]];
  const initSquareTable: SquarePhaseTables = {
    opening: [...initTable],
    middleGame: [...initTable],
    endGame: [...initTable],
  };
  const pST: PieceSquarePhaseTables = {
    pawn: { ...initSquareTable },
    knight: { ...initSquareTable },
    bishop: { ...initSquareTable },
    rook: { ...initSquareTable },
    queen: { ...initSquareTable },
    king: { ...initSquareTable },
  };

  pieceTypeArray.forEach((type) => {
    gamePhaseArray.forEach((phase) => {
      pST[type][phase] = generatePieceSquarePhaseTable(
        type,
        phase,
        numRanks,
        numFiles,
        multiplier
      );
    });
  });

  return pST;
};

export default botSelectMove;
