import { BotEngine, GameData, Move, PieceColour } from "../typings";

export const selectRandomMove = (moves: Move[]): Move =>
  moves[Math.floor(Math.random() * moves.length)];

export const botSelectMove = (
  engine: BotEngine,
  colour: PieceColour,
  gameData: GameData
): Move | null => {
  const availableMoves = gameData.pieceData[colour].reduce<Move[]>(
    (prev, cur) => {
      const pieceMoves: Move[] = cur.attacks.map((a) => ({
        piece: cur,
        newPosition: a,
      }));
      return prev.concat(pieceMoves);
    },
    []
  );
  if (availableMoves.length === null) {
    return null;
  }
  switch (engine) {
    case "random":
      return selectRandomMove(availableMoves);
    default:
      throw Error(`Invalid bot engine: ${engine}.`);
  }
};

export default botSelectMove;
