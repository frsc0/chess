import React, { useEffect } from "react";
import { createUseStyles, ThemeProvider } from "react-jss";
import { connect, ConnectedProps } from "react-redux";
import Board from "./components/board/Board";
import { numFiles, numRanks, startingPos } from "./config";
import { pieceColourArray } from "./globalConstants";
import {
  incrementFullmoveNumber,
  incrementHalfmoveClock,
  setActiveColour,
  setCastlingAvailability,
  setEnPassantTarget,
  setFullmoveNumber,
  setHalfmoveClock,
  setPieces,
} from "./redux/actions/gameData";
import { setDroppableSquares } from "./redux/actions/interface";
import { AppStore } from "./redux/store";
import theme from "./theme";
import { PieceColour, Position } from "./typings";
import {
  generateAttacksForPieces,
  getEnPassantTargetForMove,
  initializeGameData,
  makeCaptures,
  updatePiecePosition,
} from "./utils";

const useStyles = createUseStyles(() => ({
  root: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
}));

function App(props: PropsFromRedux): JSX.Element {
  const {
    whitePieces,
    blackPieces,
    castlingAvailabilities,
    droppableSquares,
    setActiveColour,
    setCastlingAvailability,
    setEnPassantTarget,
    incrementHalfmoveClock,
    incrementFullmoveNumber,
    setFullmoveNumber,
    setHalfmoveClock,
    setPieces,
    setDroppableSquares,
  } = props;
  const classes = useStyles();

  useEffect(() => {
    const initialGameStore = initializeGameData(
      startingPos,
      numRanks,
      numFiles
    );
    setActiveColour(initialGameStore.activeColour);
    setCastlingAvailability(
      "white",
      "kingside",
      initialGameStore.castlingAvailabilities.white.kingside
    );
    setCastlingAvailability(
      "white",
      "queenside",
      initialGameStore.castlingAvailabilities.white.queenside
    );
    setCastlingAvailability(
      "black",
      "kingside",
      initialGameStore.castlingAvailabilities.black.kingside
    );
    setCastlingAvailability(
      "black",
      "kingside",
      initialGameStore.castlingAvailabilities.black.kingside
    );
    setEnPassantTarget(initialGameStore.enPassantTarget);
    setHalfmoveClock(initialGameStore.halfmoveClock);
    setFullmoveNumber(initialGameStore.fullmoveNumber);
    setPieces("white", initialGameStore.pieceData.white);
    setPieces("black", initialGameStore.pieceData.black);
  }, []);

  console.log("White pieces on render.");
  console.log(whitePieces);

  const movePiece = (
    pieceColour: PieceColour,
    pieceId: string,
    newRank: number,
    newFile: number
  ) => {
    console.log("White pieces in move piece.");
    console.log(whitePieces);
    const piece =
      pieceColour === "white"
        ? whitePieces.find((wP) => wP.id === pieceId)
        : blackPieces.find((bP) => bP.id === pieceId);
    if (piece === undefined) {
      throw Error(`Unable to find piece ${pieceId}`);
    }
    const newActiveColour: PieceColour =
      piece.colour === "white" ? "black" : "white";
    // TODO: Update castling availabilities.
    const newEnPassantTarget = getEnPassantTargetForMove(
      piece,
      newRank,
      newFile
    );
    const movedWhitePieces =
      piece.colour === "white"
        ? updatePiecePosition(
            whitePieces,
            piece,
            newRank,
            newFile,
            numRanks,
            numFiles
          )
        : makeCaptures({ rank: newRank, file: newFile }, whitePieces);
    const movedBlackPieces =
      piece.colour === "black"
        ? updatePiecePosition(
            blackPieces,
            piece,
            newRank,
            newFile,
            numRanks,
            numFiles
          )
        : makeCaptures({ rank: newRank, file: newFile }, blackPieces);
    const newWhitePieces = generateAttacksForPieces(
      "white",
      movedWhitePieces,
      numRanks,
      numFiles,
      castlingAvailabilities.white,
      { white: movedWhitePieces, black: movedBlackPieces },
      newEnPassantTarget
    );
    const newBlackPieces = generateAttacksForPieces(
      "black",
      movedWhitePieces,
      numRanks,
      numFiles,
      castlingAvailabilities.black,
      { white: movedWhitePieces, black: movedBlackPieces },
      newEnPassantTarget
    );

    setActiveColour(newActiveColour);
    setEnPassantTarget(newEnPassantTarget);
    incrementHalfmoveClock();
    if (piece.colour === pieceColourArray[pieceColour.length - 1]) {
      incrementFullmoveNumber();
    }
    setPieces("white", newWhitePieces);
    setPieces("black", newBlackPieces);
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
          pieceData={{ white: whitePieces, black: blackPieces }}
          droppableSquares={droppableSquares}
          setDroppableSquares={handleSetDroppableSquares}
          movePiece={movePiece}
        />
      </ThemeProvider>
    </div>
  );
}

const mapStateToProps = (state: AppStore) => ({
  whitePieces: state.gameData.pieceData.white,
  blackPieces: state.gameData.pieceData.black,
  castlingAvailabilities: state.gameData.castlingAvailabilities,
  droppableSquares: state.interfaceData.droppableSquares,
});

const actionCreators = {
  setActiveColour,
  setCastlingAvailability,
  setEnPassantTarget,
  incrementHalfmoveClock,
  incrementFullmoveNumber,
  setFullmoveNumber,
  setHalfmoveClock,
  setPieces,
  setDroppableSquares,
};

const connector = connect(mapStateToProps, actionCreators);

type PropsFromRedux = ConnectedProps<typeof connector>;

export default connector(App);
