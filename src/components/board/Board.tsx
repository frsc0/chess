import React, { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { createUseStyles } from "react-jss";
import { boardSpaceUtilization } from "../../config";
import { Piece, PieceColour, PieceData, Position } from "../../typings";
import { getPieceOnSquare, isSamePosition } from "../../utils/game.utils";
import Square from "./Square";

const useStyles = createUseStyles(() => ({
  root: {
    display: "flex",
    flexDirection: "column",
  },
  rank: {
    display: "flex",
    flexDirection: "row",
  },
}));

interface BoardProps {
  numRanks: number;
  numFiles: number;
  pieceData: PieceData;
  activeColour: PieceColour;
  droppableSquares: Position[];
  squareInCheck: Position | null;
  movePiece: (piece: Piece, newRank: number, newFile: number) => void;
  setDroppableSquares: (newSquares: Position[]) => void;
}

const getBoardDimension = (viewportWidth: number, viewportHeight: number) => {
  const spaceUtilizationPct = boardSpaceUtilization * 100;
  if (viewportWidth >= viewportHeight) {
    return `${spaceUtilizationPct}vh`;
  }
  return `${spaceUtilizationPct}vw`;
};

const generateSquares = (numRanks: number, numFiles: number): null[][] => {
  const board = [];
  for (let i = 0; i < numRanks; i += 1) {
    const rank = [];
    for (let j = 0; j < numFiles; j += 1) {
      rank.push(null);
    }
    board.push(rank);
  }
  return board;
};

export default function Board(props: BoardProps): JSX.Element {
  const {
    numRanks,
    numFiles,
    pieceData,
    activeColour,
    droppableSquares,
    squareInCheck,
    movePiece,
    setDroppableSquares,
  } = props;
  const classes = useStyles();
  const [boardDimension, setBoardDimension] = useState<string>(
    getBoardDimension(window.innerWidth, window.innerHeight)
  );
  const [squares, setSquares] = useState<null[][]>(
    generateSquares(numRanks, numFiles)
  );

  useEffect(() => {
    setSquares(generateSquares(numRanks, numFiles));
  }, [numRanks, numFiles]);

  const onResize = () => {
    setBoardDimension(getBoardDimension(window.innerWidth, window.innerHeight));
  };

  window.addEventListener("resize", onResize);

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className={classes.root}
        style={{ height: boardDimension, width: boardDimension }}
      >
        {squares.map((rank, i) => (
          <div
            className={classes.rank}
            style={{ height: `${100 / numRanks}%` }}
          >
            {rank.map((square, j) => {
              const rankIndex = numRanks - 1 - i;
              const position = {
                rank: rankIndex,
                file: j,
              };
              const pieceOnSquare = getPieceOnSquare(
                position.rank,
                position.file,
                pieceData
              );
              return (
                <Square
                  rankIndex={rankIndex}
                  fileIndex={j}
                  piece={pieceOnSquare}
                  activeColour={activeColour}
                  droppable={droppableSquares.some((sq) =>
                    isSamePosition(sq, position)
                  )}
                  checkingSquare={isSamePosition(squareInCheck, position)}
                  movePiece={movePiece}
                  setDroppableSquares={setDroppableSquares}
                />
              );
            })}
          </div>
        ))}
      </div>
    </DndProvider>
  );
}
