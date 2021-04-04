import { Position } from "../../typings";
import { InterfaceDataAction } from "./types";

export const setDroppableSquares = (
  squares: Position[]
): InterfaceDataAction => ({
  type: "SET_DROPPABLE_SQUARES",
  squares,
});

export default setDroppableSquares;
