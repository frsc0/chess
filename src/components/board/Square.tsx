import React, { useEffect, useState } from "react";
import { useDrop } from "react-dnd";
import { createUseStyles } from "react-jss";
import { moveTrailLength } from "../../config";
import {
  colourTemplateSplitChar,
  maxMoveTrailOpacity,
  minMoveTrailOpacity,
  pieceTypeArray,
} from "../../globalConstants";
import { themeConstants } from "../../theme";
import { Piece as PieceType, PieceColour, Position } from "../../typings";
import {
  getMoveTrailColour,
  getSquareColour,
  isSamePosition,
} from "../../utils/game.utils";
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
  checkIndicator: {
    position: "absolute",
    height: "100%",
    width: "100%",
    backgroundColor: "rgba(219, 68, 55, 0.5)",
  },
  moveTrailIndicator: {
    position: "absolute",
    height: "100%",
    width: "100%",
    backgroundColor: "rgba(219, 68, 55, 0.5)",
  },
  droppableIcon: {
    position: "absolute",
    left: `${(0.5 - droppableIconWidth / 2) * 100}%`,
    top: `${(0.5 - droppableIconWidth / 2) * 100}%`,
    height: `${droppableIconWidth * 100}%`,
    width: `${droppableIconWidth * 100}%`,
    backgroundColor: "rgba(15, 159, 89, 0.5)",
    borderRadius: "50%",
    zIndex: 2,
  },
}));

interface SquareProps {
  rankIndex: number;
  fileIndex: number;
  piece: PieceType | null;
  activeColour: PieceColour;
  droppable: boolean;
  checkingSquare: boolean;
  moveTrailIndex: number;
  movePiece: (piece: PieceType, newRank: number, newFile: number) => void;
  setDroppableSquares: (newSquares: Position[]) => void;
}

export default function Square(props: SquareProps): JSX.Element {
  const {
    rankIndex,
    fileIndex,
    piece,
    activeColour,
    droppable,
    checkingSquare,
    moveTrailIndex,
    movePiece,
    setDroppableSquares,
  } = props;
  const classes = useStyles();
  const [colour, setColour] = useState<string>(() =>
    getSquareColour(rankIndex, fileIndex)
  );
  const [moveTrailColour, setMoveTrailColour] = useState<string | null>(() =>
    getMoveTrailColour(
      moveTrailIndex,
      moveTrailLength,
      themeConstants.moveTrail,
      colourTemplateSplitChar,
      maxMoveTrailOpacity,
      minMoveTrailOpacity
    )
  );

  useEffect(() => {
    setColour(getSquareColour(rankIndex, fileIndex));
  }, [rankIndex, fileIndex]);

  useEffect(() => {
    setMoveTrailColour(
      getMoveTrailColour(
        moveTrailIndex,
        moveTrailLength,
        themeConstants.moveTrail,
        colourTemplateSplitChar,
        maxMoveTrailOpacity,
        minMoveTrailOpacity
      )
    );
  }, [moveTrailIndex]);

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: [...pieceTypeArray],
      drop: (item: PieceType) => movePiece(item, rankIndex, fileIndex),
      canDrop: (item: PieceType) =>
        item.attacks.some((p) =>
          isSamePosition(p, { rank: rankIndex, file: fileIndex })
        ),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [rankIndex, fileIndex]
  );

  return (
    <div
      className={classes.root}
      style={{ backgroundColor: colour }}
      ref={drop}
    >
      {droppable && <div className={classes.droppableIcon} />}
      {checkingSquare && <div className={classes.checkIndicator} />}
      {moveTrailColour && (
        <div
          className={classes.moveTrailIndicator}
          style={{ backgroundColor: moveTrailColour }}
        />
      )}
      {piece && (
        <Piece
          piece={piece}
          activeColour={activeColour}
          setDroppableSquares={setDroppableSquares}
        />
      )}
    </div>
  );
}
