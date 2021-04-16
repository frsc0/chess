import { MoveWithEval, PieceColour } from "../typings";

export const getNewEvalIndex = (
  moves: MoveWithEval[],
  newValue: MoveWithEval,
  ascending: boolean
): number => {
  let low = 0;
  let high = moves.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (
      (ascending === true && moves[mid].eval < newValue.eval) ||
      (ascending === false && moves[mid].eval > newValue.eval)
    )
      low = mid + 1;
    else high = mid;
  }
  return low;
};

export const insertEval = (
  moves: MoveWithEval[],
  newValue: MoveWithEval,
  colour: PieceColour
): MoveWithEval[] => {
  if (moves.length === 0) {
    return [newValue];
  }
  moves.splice(
    getNewEvalIndex(moves, newValue, colour === "black"),
    0,
    newValue
  );
  return moves;
};
