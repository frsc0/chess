import React, { useRef, useState } from "react";
import { createUseStyles, ThemeProvider } from "react-jss";
import Board from "./components/board/Board";
import { numFiles, numRanks, startingPos } from "./config";
import theme from "./theme";
import { GameData, Piece, Position } from "./typings";
import { initializeGameData, movePieceAndGetGameData } from "./utils";

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
  const [gameData, setGameData] = useState<GameData>(
    initializeGameData(startingPos, numRanks, numFiles)
  );
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
        numFiles
      )
    );
  };

  const handleSetDroppableSquares = (newSquares: Position[]): void => {
    setDroppableSquares(newSquares);
  };

  return (
    <div className={classes.root}>
      <ThemeProvider theme={theme}>
        <Board
          numRanks={numRanks}
          numFiles={numFiles}
          pieceData={gameDataRef.current.pieceData}
          droppableSquares={droppableSquares}
          setDroppableSquares={handleSetDroppableSquares}
          movePiece={movePiece}
        />
      </ThemeProvider>
    </div>
  );
}

export default App;
