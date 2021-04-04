import { CastlingAvailability, Piece } from "../../typings";
import { GameDataAction } from "../actions/types";
import { GameStore } from "../store";

const initialCastlingAvailability: CastlingAvailability = {
  kingside: false,
  queenside: false,
};

const initialPieces: Piece[] = [];

const initialState: GameStore = {
  activeColour: "white",
  castlingAvailabilities: {
    white: {
      ...initialCastlingAvailability,
    },
    black: {
      ...initialCastlingAvailability,
    },
  },
  enPassantTarget: null,
  halfmoveClock: 0,
  fullmoveNumber: 1,
  pieceData: {
    white: initialPieces.slice(),
    black: initialPieces.slice(),
  },
};

const gameData = (state = initialState, action: GameDataAction): GameStore => {
  switch (action.type) {
    case "SET_ACTIVE_COLOUR": {
      return {
        ...state,
        activeColour: action.colour,
      };
    }
    case "SET_CASTLING_AVAILABILITY": {
      return {
        ...state,
        castlingAvailabilities: {
          ...state.castlingAvailabilities,
          [action.colour]: {
            ...state.castlingAvailabilities[action.colour],
            [action.side]: action.isAvailable,
          },
        },
      };
    }
    case "SET_EN_PASSANT_TARGET": {
      if (state.enPassantTarget === null || action.target === null) {
        return {
          ...state,
          enPassantTarget: action.target,
        };
      }
      return {
        ...state,
        enPassantTarget: {
          ...state.enPassantTarget,
          ...action.target,
        },
      };
    }
    case "INCREMENT_HALFMOVE_CLOCK": {
      return {
        ...state,
        halfmoveClock: state.halfmoveClock + 1,
      };
    }
    case "SET_HALFMOVE_CLOCK":
      return {
        ...state,
        halfmoveClock: action.value,
      };
    case "RESET_HALFMOVE_CLOCK": {
      return {
        ...state,
        halfmoveClock: initialState.halfmoveClock,
      };
    }
    case "INCREMENT_FULLMOVE_NUMBER": {
      return {
        ...state,
        fullmoveNumber: state.fullmoveNumber + 1,
      };
    }
    case "SET_FULLMOVE_NUMBER": {
      return {
        ...state,
        fullmoveNumber: action.value,
      };
    }
    case "RESET_FULLMOVE_NUMBER": {
      return {
        ...state,
        fullmoveNumber: initialState.fullmoveNumber,
      };
    }
    case "SET_PIECES": {
      return {
        ...state,
        pieceData: {
          ...state.pieceData,
          [action.colour]: action.pieces.slice(),
        },
      };
    }
    default:
      return state;
  }
};

export default gameData;
