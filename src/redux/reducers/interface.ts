import { InterfaceDataAction } from "../actions/types";
import { InterfaceStore } from "../store";

const intialState: InterfaceStore = {
  droppableSquares: [],
};

const interfaceData = (
  state = intialState,
  action: InterfaceDataAction
): InterfaceStore => {
  switch (action.type) {
    case "SET_DROPPABLE_SQUARES":
      return {
        ...state,
        droppableSquares: action.squares.slice(),
      };
    default:
      return state;
  }
};

export default interfaceData;
