import React from "react";
import { useDrop } from "react-dnd";
import { createUseStyles } from "react-jss";
import pieceTypeArray from "../../globalConstants";
import theme from "../../theme";
import { Piece as PieceType, Position } from "../../typings";
import Piece from "../pieces/Piece";

const droppableIconWidth = 0.33;

const useStyles = createUseStyles(() => ({
  root: {
    display: "flex",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  droppableIcon: {
    position: "absolute",
    left: `${(0.5 - droppableIconWidth / 2) * 100}%`,
    top: `${(0.5 - droppableIconWidth / 2) * 100}%`,
    height: `${droppableIconWidth * 100}%`,
    width: `${droppableIconWidth * 100}%`,
    backgroundColor: "rgba(15, 159, 89, 0.5)",
    borderRadius: "50%",
  },
}));

interface SquareProps {
  rankIndex: number;
  fileIndex: number;
  piece: PieceType | null;
  droppable: boolean;
  movePiece: (piece: PieceType, newRank: number, newFile: number) => void;
  setDroppableSquares: (newSquares: Position[]) => void;
}

export default function Square(props: SquareProps): JSX.Element {
  const {
    rankIndex,
    fileIndex,
    piece,
    droppable,
    movePiece,
    setDroppableSquares,
  } = props;
  const classes = useStyles();

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: [...pieceTypeArray],
      drop: (item: PieceType) => movePiece(item, rankIndex, fileIndex),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [rankIndex, fileIndex]
  );

  const color =
    (fileIndex - rankIndex) % 2 === 0
      ? theme.palette.board.dark
      : theme.palette.board.light;

  return (
    <div className={classes.root} style={{ backgroundColor: color }} ref={drop}>
      {piece && (
        <Piece piece={piece} setDroppableSquares={setDroppableSquares} />
      )}
      {droppable && <div className={classes.droppableIcon} />}
    </div>
  );
}
