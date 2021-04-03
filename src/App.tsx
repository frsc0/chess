import React, { useState } from "react";
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
  const [droppableSquares, setDroppableSquares] = useState<Position[]>([]);

  const movePiece = (piece: Piece, newRank: number, newFile: number) => {
    setGameData(
      movePieceAndGetGameData(
        gameData,
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
          pieceData={gameData.pieceData}
          droppableSquares={droppableSquares}
          setDroppableSquares={handleSetDroppableSquares}
          movePiece={movePiece}
        />
      </ThemeProvider>
    </div>
  );
}

export default App;
