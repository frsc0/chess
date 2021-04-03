import { PieceType } from "../typings";

export const ItemTypes: { [char: string]: PieceType } = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

export default ItemTypes;
