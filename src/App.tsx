import { ThemeProvider } from "@material-ui/core";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import useSound from "use-sound";
import Board from "./components/board/Board";
import HUD from "./components/hud/HUD";
import {
  boardSpaceUtilization,
  botEngine,
  botMoveDelay,
  bots,
  evalFactorWeights,
  evalFunction,
  moveTrailLength,
  numFiles,
  numRanks,
  pieceSquareMultiplier,
  squareValueMatrixType,
  startingFEN,
} from "./config";
import { initialEvalMetrics } from "./globalConstants";
import captureSound from "./resources/sound/capture.mp3";
import moveSound from "./resources/sound/move.mp3";
import theme from "./theme";
import {
  EvalMetrics,
  EvalMetricsIncrementors,
  EvaluationFactorBalances,
  GameData,
  GamePhase,
  GameResult,
  Move,
  Piece,
  PieceSquarePhaseTables,
  Position,
} from "./typings";
import botSelectMove, {
  calculateEvaluationFactorMaxes,
  evaluatePosition,
  generateSquareValueMatrix,
  initializePieceSquarePhaseTables,
  simpleEval,
} from "./utils/bot.utils";
import {
  getEnemyColour,
  getGameResult,
  getNewMoveTrail,
  getPGNForMove,
  getPGNResult,
  getSoundForMove,
  getSquareInCheck,
  initializeGameData,
  initializePGN,
  movePieceAndGetGameData,
} from "./utils/game.utils";

const getBoardDimension = (
  parentWidth: number,
  parentHeight: number
): number => {
  if (parentWidth >= parentHeight) {
    return parentHeight * boardSpaceUtilization;
  }
  return parentWidth * boardSpaceUtilization;
};

const useStyles = createUseStyles(() => ({
  root: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  verticalDivider: {
    width: theme.spacing(2),
  },
}));

function App(): JSX.Element {
  const classes = useStyles();
  const [gameData, setGameData] = useState<GameData>(() =>
    initializeGameData(startingFEN, numRanks, numFiles)
  );
  const gameDataRef = useRef(gameData);

  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [positionEval, setPositionEval] = useState<number>(0);
  // TODO: Implement game phase.
  const [gamePhase, setGamePhase] = useState<GamePhase>("opening");
  const [droppableSquares, setDroppableSquares] = useState<Position[]>([]);
  const [squareValueMatrix, setSquareValueMatrix] = useState<number[][]>(() =>
    generateSquareValueMatrix(numRanks, numFiles, squareValueMatrixType)
  );
  const [
    pieceSquarePhaseTables,
    setPieceSquarePhaseTables,
  ] = useState<PieceSquarePhaseTables>(() =>
    initializePieceSquarePhaseTables(numRanks, numFiles, pieceSquareMultiplier)
  );
  const [
    evaluationFactorMaxes,
    setEvaluationFactorMaxes,
  ] = useState<EvaluationFactorBalances>(() =>
    calculateEvaluationFactorMaxes(
      gameData.pieceData,
      squareValueMatrix,
      numRanks,
      numFiles
    )
  );
  const [PGN, setPGN] = useState<string>(() =>
    initializePGN(1, bots, gameResult)
  );
  const [moveTrail, setMoveTrail] = useState<Position[]>([]);
  const moveTrailRef = useRef(moveTrail);

  const [evalMetrics, setEvalMetrics] = useState<EvalMetrics>({
    ...initialEvalMetrics,
  });
  const evalMetricsRef = useRef(evalMetrics);

  // Credit for resize solution: https://stackoverflow.com/a/66791524
  const [boardDimension, setBoardDimension] = useState<number>();
  const resizeObserver = useRef<ResizeObserver>(
    new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      setBoardDimension(
        getBoardDimension(entry.contentRect.width, entry.contentRect.height)
      );
    })
  );
  const resizedContainerRef = useCallback(
    (container: HTMLDivElement) => {
      if (container !== null) {
        resizeObserver.current.observe(container);
      }
      // When element is unmounted, ref callback is called with a null argument
      // => best time to cleanup the observer
      else if (resizeObserver.current) resizeObserver.current.disconnect();
    },
    [resizeObserver.current]
  );

  const [playMove] = useSound(moveSound);
  const [playCapture] = useSound(captureSound);
  const playMoveRef = useRef(playMove);
  const playCaptureRef = useRef(playCapture);
  useEffect(() => {
    playMoveRef.current = playMove;
  }, [playMove]);
  useEffect(() => {
    playCaptureRef.current = playCapture;
  }, [playCapture]);

  const setGameDataAndRef = (newGameData: GameData) => {
    gameDataRef.current = newGameData;
    setGameData(newGameData);
  };

  const setEvalMetricsAndRef = (newEvalMetrics: EvalMetrics) => {
    evalMetricsRef.current = newEvalMetrics;
    setEvalMetrics(newEvalMetrics);
  };

  const setMoveTrailAndRef = (newMoveTrail: Position[]) => {
    moveTrailRef.current = newMoveTrail;
    setMoveTrail(newMoveTrail);
  };

  const playSoundForMove = (move: Move, prevGameData: GameData) => {
    const sound = getSoundForMove(move, prevGameData);
    switch (sound) {
      case "move":
        playMoveRef.current();
        break;
      case "capture":
        playCaptureRef.current();
        break;
      default:
        throw Error(`Invalid sound type: ${sound}.`);
    }
  };

  const movePiece = (piece: Piece, newRank: number, newFile: number) => {
    setMoveTrailAndRef(
      getNewMoveTrail(
        piece.position,
        { rank: newRank, file: newFile },
        moveTrail,
        moveTrailLength
      )
    );
    const move = { piece, newPosition: { rank: newRank, file: newFile } };
    playSoundForMove(move, gameDataRef.current);

    const enemyColour = getEnemyColour(piece.colour);
    const newGameData = movePieceAndGetGameData(
      gameDataRef.current,
      piece,
      newRank,
      newFile,
      numRanks,
      numFiles,
      true
    );

    setPGN(
      PGN +
        getPGNForMove(
          gameData.fullmoveNumber,
          move,
          gameData.castlingAvailabilities,
          gameData.pieceData[enemyColour],
          newGameData.pieceData,
          numRanks,
          numFiles
        )
    );

    setGameDataAndRef(newGameData);
  };

  const evalMetricsIncrementPositionsAnalyzed = () => {
    setEvalMetricsAndRef({
      ...evalMetricsRef.current,
      positionsAnalyzed: evalMetricsRef.current.positionsAnalyzed + 1,
    });
  };

  const evalMetricsIncrementTranspositionsAnalyzed = () => {
    setEvalMetricsAndRef({
      ...evalMetricsRef.current,
      transpositionsAnalyzed: evalMetricsRef.current.transpositionsAnalyzed + 1,
    });
  };

  const evalMetricsIncrementMaxDepthSearched = (curValue: number) => {
    setEvalMetricsAndRef({
      ...evalMetricsRef.current,
      maxDepthSearched: curValue + 1,
    });
  };

  const evalMetricsIncrementors: EvalMetricsIncrementors = {
    positionsAnalyzed: evalMetricsIncrementPositionsAnalyzed,
    transpositionsAnalyzed: evalMetricsIncrementTranspositionsAnalyzed,
    maxDepthSearched: evalMetricsIncrementMaxDepthSearched,
    duration: () => {
      throw Error("Duration incrementor should not be called");
    },
  };

  const updateEval = (newEval: number) => {
    setPositionEval(newEval);
  };

  useEffect(() => {
    console.log("FEN", gameData.FEN);
    if (gameResult !== null) {
      return;
    }
    if (bots.white === false && bots.black === false) {
      // No bots are running so we'll use heuristic evaluations of the position.
      setPositionEval(
        evalFunction === "simple"
          ? simpleEval(gameData, pieceSquarePhaseTables, gamePhase, numRanks)
          : evaluatePosition(
              gameData,
              squareValueMatrix,
              evaluationFactorMaxes,
              evalFactorWeights
            )
      );
    }
    const newGameResult = getGameResult(gameData);
    if (newGameResult !== null) {
      setGameResult(newGameResult);
      return;
    }
    const { activeColour } = gameData;
    if (bots[activeColour]) {
      setEvalMetricsAndRef({ ...initialEvalMetrics });
      const botMove = botSelectMove(
        botEngine[activeColour],
        activeColour,
        gameData,
        numRanks,
        numFiles,
        squareValueMatrix,
        evaluationFactorMaxes,
        evalFactorWeights,
        evalMetricsIncrementors,
        evalFunction,
        pieceSquarePhaseTables,
        gamePhase,
        updateEval
      );
      setTimeout(() => {
        movePiece(
          botMove.piece,
          botMove.newPosition.rank,
          botMove.newPosition.file
        );
      }, botMoveDelay);
    }
  }, [gameData]);

  useEffect(() => {
    setSquareValueMatrix(
      generateSquareValueMatrix(numRanks, numFiles, squareValueMatrixType)
    );
  }, [numRanks, numFiles]);

  useEffect(() => {
    setEvaluationFactorMaxes(
      calculateEvaluationFactorMaxes(
        gameData.pieceData,
        squareValueMatrix,
        numRanks,
        numFiles
      )
    );
  }, [squareValueMatrix, numRanks, numFiles]);

  useEffect(() => {
    if (gameResult !== null) {
      const pgnResult = getPGNResult(gameResult);
      setPGN(`${PGN.replace("*", pgnResult)} ${pgnResult}`);
    }
  }, [gameResult]);

  useEffect(() => {
    console.log("PGN", PGN);
  }, [PGN]);

  useEffect(() => {
    setPieceSquarePhaseTables(
      initializePieceSquarePhaseTables(
        numRanks,
        numFiles,
        pieceSquareMultiplier
      )
    );
  }, [numRanks, numFiles, pieceSquareMultiplier]);

  const handleSetDroppableSquares = (newSquares: Position[]): void => {
    setDroppableSquares(newSquares);
  };

  return (
    <ThemeProvider theme={theme}>
      <div className={classes.root} ref={resizedContainerRef} style={{}}>
        <HUD
          activeColour={gameData.activeColour}
          positionEval={positionEval}
          evalMetrics={evalMetrics}
        />
        <div className={classes.verticalDivider} />
        <div style={{ height: boardDimension, width: boardDimension }}>
          <Board
            numRanks={numRanks}
            numFiles={numFiles}
            pieceData={gameData.pieceData}
            activeColour={gameData.activeColour}
            droppableSquares={droppableSquares}
            moveTrail={moveTrail}
            squareInCheck={getSquareInCheck(gameData.pieceData)}
            setDroppableSquares={handleSetDroppableSquares}
            movePiece={movePiece}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
