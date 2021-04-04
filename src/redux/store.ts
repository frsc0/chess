import { createStore } from "redux";
import {
  CastlingAvailabilities,
  PieceColour,
  PieceData,
  Position,
} from "../typings";
import rootReducer from "./reducers";

export interface AppStore {
  gameData: GameStore;
  interfaceData: InterfaceStore;
}

export interface GameStore {
  activeColour: PieceColour;
  castlingAvailabilities: CastlingAvailabilities;
  enPassantTarget: Position | null;
  /**
   * This is the number of halfmoves since the last capture or pawn advance. Used for the fifty-move rule.
   */
  halfmoveClock: number;
  /**
   * The number of full moves. It starts at 1 and is incremented after Black's move.
   */
  fullmoveNumber: number;
  pieceData: PieceData;
}

export interface InterfaceStore {
  droppableSquares: Position[];
}

const store = createStore(rootReducer);

export default store;
