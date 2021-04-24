import React, { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { createUseStyles } from "react-jss";
import { Piece, PieceColour, PieceData, Position } from "../../typings";
import { getPieceOnSquare, isSamePosition } from "../../utils/game.utils";
import Square from "./Square";

const useStyles = createUseStyles(() => ({
  root: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    height: "100%",
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
  moveTrail: Position[];
  movePiece: (piece: Piece, newRank: number, newFile: number) => void;
  setDroppableSquares: (newSquares: Position[]) => void;
}

const generateSquares = (numRanks: number, numFiles: number): null[][] => {
  const board: null[][] = [];
  for (let i = 0; i < numRanks; i += 1) {
    const rank: null[] = [];
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
    moveTrail,
    movePiece,
    setDroppableSquares,
  } = props;
  const classes = useStyles();
  const [squares, setSquares] = useState<null[][]>(
    generateSquares(numRanks, numFiles)
  );

  useEffect(() => {
    setSquares(generateSquares(numRanks, numFiles));
  }, [numRanks, numFiles]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={classes.root}>
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
              const moveTrailIndex = moveTrail.findIndex((p) =>
                isSamePosition(p, position)
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
                  moveTrailIndex={moveTrailIndex}
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
