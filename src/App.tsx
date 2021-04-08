import React, { useEffect, useRef, useState } from "react";
import { createUseStyles, ThemeProvider } from "react-jss";
import Board from "./components/board/Board";
import {
  botEngine,
  botMoveDelay,
  bots,
  numFiles,
  numRanks,
  startingFEN,
} from "./config";
import theme from "./theme";
import { GameData, Piece, Position } from "./typings";
import botSelectMove from "./utils/bot.utils";
import {
  getSquareInCheck,
  initializeGameData,
  movePieceAndGetGameData,
} from "./utils/game.utils";

const useStyles = createUseStyles(() => ({
  root: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
}));

function App(): JSX.Element {
  const classes = useStyles();
  const [gameData, setGameData] = useState<GameData>(() =>
    initializeGameData(startingFEN, numRanks, numFiles)
  );
  const [gameOver, setGameOver] = useState<boolean>(false);
  const gameDataRef = useRef(gameData);
  const [droppableSquares, setDroppableSquares] = useState<Position[]>([]);

  const setGameDataAndRef = (newGameData: GameData) => {
    gameDataRef.current = newGameData;
    setGameData(newGameData);
  };

  const movePiece = (piece: Piece, newRank: number, newFile: number) => {
    setGameDataAndRef(
      movePieceAndGetGameData(
        gameDataRef.current,
        piece,
        newRank,
        newFile,
        numRanks,
        numFiles,
        true
      )
    );
  };

  useEffect(() => {
    if (gameOver) {
      return;
    }
    const { activeColour } = gameData;
    if (bots[activeColour]) {
      const botMove = botSelectMove(
        botEngine[activeColour],
        activeColour,
        gameData
      );
      if (botMove === null) {
        setGameOver(true);
        return;
      }
      setTimeout(() => {
        movePiece(
          botMove.piece,
          botMove.newPosition.rank,
          botMove.newPosition.file
        );
      }, botMoveDelay);
    }
  }, [gameData]);

  const handleSetDroppableSquares = (newSquares: Position[]): void => {
    setDroppableSquares(newSquares);
  };

  return (
    <div className={classes.root}>
      <ThemeProvider theme={theme}>
        <Board
          numRanks={numRanks}
          numFiles={numFiles}
          pieceData={gameData.pieceData}
          activeColour={gameData.activeColour}
          droppableSquares={droppableSquares}
          squareInCheck={getSquareInCheck(gameData.pieceData)}
          setDroppableSquares={handleSetDroppableSquares}
          movePiece={movePiece}
        />
      </ThemeProvider>
    </div>
  );
}

export default App;
