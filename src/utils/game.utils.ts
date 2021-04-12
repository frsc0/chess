import { format } from "date-fns";
import { pieceValues } from "../config";
import {
  blankCastlingAvailability,
  botPGNName,
  humanPGNName,
  pgnDateFormat,
  pieceColourArray,
  pieceFENMapping,
} from "../globalConstants";
import {
  BotPlayers,
  CastlingAvailabilities,
  CastlingAvailability,
  CastlingSide,
  GameData,
  GameResult,
  Move,
  Piece,
  PieceColour,
  PieceCount,
  PieceCounts,
  PieceData,
  PieceMovement,
  PieceMoveType,
  PieceType,
  Position,
} from "../typings";
import { hasNoLegalMoves } from "./bot.utils";

export const initialPieceCount: PieceCount = {
  pawn: 0,
  knight: 0,
  bishop: 0,
  rook: 0,
  queen: 0,
  king: 0,
};

export const generateBlankGameData = (): GameData => ({
  activeColour: "white",
  castlingAvailabilities: {
    white: { ...blankCastlingAvailability },
    black: { ...blankCastlingAvailability },
  },
  enPassantTarget: null,
  halfmoveClock: 0,
  fullmoveNumber: 1,
  pieceData: {
    white: [],
    black: [],
  },
  FEN: "",
});

export const generatePieceId = (
  colour: PieceColour,
  type: PieceType,
  curPieceCount: number
): string => `${colour}-${type}-${curPieceCount}`;

export const pieceIsOnSquare = (
  rank: number,
  file: number,
  piece: Piece
): boolean =>
  piece.position !== null &&
  piece.position.rank === rank &&
  piece.position.file === file;

export const getPieceOnSquareOfColour = (
  position: Position,
  pieces: Piece[]
): Piece | null =>
  pieces.find((p) => pieceIsOnSquare(position.rank, position.file, p)) || null;

export const getPieceOnSquare = (
  rank: number,
  file: number,
  pieceData: PieceData
): Piece | null =>
  getPieceOnSquareOfColour({ rank, file }, pieceData.white) ||
  getPieceOnSquareOfColour({ rank, file }, pieceData.black) ||
  null;

export const getPieceMovementForPiece = (
  type: PieceType,
  isPawnAndHasMoved: boolean,
  castlingAvailability: CastlingAvailability
): PieceMovement => {
  const initial: PieceMovement = {
    pawnForward: null,
    pawnDiagonalAttack: null,
    vertical: null,
    horizontal: null,
    diagonal: null,
    lJump: null,
    castleKingside: null,
    castleQueenside: null,
  };
  switch (type) {
    case "pawn":
      return {
        ...initial,
        pawnForward: isPawnAndHasMoved ? 1 : 2,
        pawnDiagonalAttack: 1,
      };
    case "knight":
      return {
        ...initial,
        lJump: 1,
      };
    case "bishop":
      return {
        ...initial,
        diagonal: Number.POSITIVE_INFINITY,
      };
    case "rook":
      return {
        ...initial,
        vertical: Number.POSITIVE_INFINITY,
        horizontal: Number.POSITIVE_INFINITY,
      };
    case "queen":
      return {
        ...initial,
        vertical: Number.POSITIVE_INFINITY,
        horizontal: Number.POSITIVE_INFINITY,
        diagonal: Number.POSITIVE_INFINITY,
      };
    case "king":
      return {
        ...initial,
        vertical: 1,
        horizontal: 1,
        diagonal: 1,
        castleKingside: castlingAvailability.kingside ? 1 : null,
        castleQueenside: castlingAvailability.queenside ? 1 : null,
      };
    default:
      throw Error(`Invalid piece type: ${type}.`);
  }
};

export const getLinearPositionsUntilCollision = (
  pieceColour: PieceColour,
  start: Position,
  rankIncrement: number,
  fileIncrement: number,
  range: number,
  includeCollisionIfEnemy: boolean,
  pieceData: PieceData,
  numRanks: number,
  numFiles: number
): Position[] => {
  const validPositions: Position[] = [];
  let collision = false;
  let numMoves = 0;
  const newPosition: Position = {
    rank: start.rank,
    file: start.file,
  };
  while (collision === false) {
    newPosition.rank += rankIncrement;
    newPosition.file += fileIncrement;
    if (
      newPosition.rank < 0 ||
      newPosition.rank >= numRanks ||
      newPosition.file < 0 ||
      newPosition.file >= numFiles
    ) {
      collision = true;
      break;
    }
    numMoves += 1;
    const pieceOnNewPosition = getPieceOnSquare(
      newPosition.rank,
      newPosition.file,
      pieceData
    );
    if (pieceOnNewPosition === null) {
      validPositions.push({ ...newPosition });
    } else {
      if (
        pieceOnNewPosition.colour !== pieceColour &&
        includeCollisionIfEnemy
      ) {
        validPositions.push({ ...newPosition });
      }
      collision = true;
      break;
    }
    if (numMoves >= range) {
      collision = true;
      break;
    }
  }
  return validPositions;
};

export const generatePawnForwardAttacks = (
  pieceColour: PieceColour,
  start: Position,
  range: number,
  pieceData: PieceData,
  numRanks: number,
  numFiles: number
): Position[] =>
  getLinearPositionsUntilCollision(
    pieceColour,
    start,
    pieceColour === "white" ? 1 : -1,
    0,
    range,
    false,
    pieceData,
    numRanks,
    numFiles
  );

/**
 * Returns false is either position is null.
 */
export const isSamePosition = (
  a: Position | null,
  b: Position | null
): boolean =>
  a !== null && b !== null && a.rank === b.rank && a.file === b.file;

export const isValidPawnDiagonalAttack = (
  target: Position,
  pieceColour: PieceColour,
  enPassantTarget: Position | null,
  pieceData: PieceData
): boolean => {
  if (isSamePosition(enPassantTarget, target)) {
    return true;
  }
  const targetPiece = getPieceOnSquare(target.rank, target.file, pieceData);
  if (targetPiece && targetPiece.colour !== pieceColour) {
    return true;
  }
  return false;
};

export const generatePawnDiagonalAttacks = (
  pieceColour: PieceColour,
  start: Position,
  enPassantTarget: Position | null,
  pieceData: PieceData,
  numRanks: number,
  numFiles: number
): Position[] => {
  const newRank = start.rank + (pieceColour === "white" ? 1 : -1);
  if (newRank < 0 || newRank >= numRanks) {
    return [];
  }
  const newFileLeft = start.file - 1;
  const newFileRight = start.file + 1;
  const forwardWestPosition: Position | null =
    newFileLeft < 0 || newFileLeft >= numFiles
      ? null
      : {
          rank: newRank,
          file: newFileLeft,
        };
  const forwardEastPosition: Position | null =
    newFileRight < 0 || newFileRight >= numFiles
      ? null
      : {
          rank: newRank,
          file: newFileRight,
        };
  if (!forwardWestPosition && !forwardEastPosition) {
    return [];
  }
  const diagonalAttacks: Position[] = [];
  if (forwardWestPosition) {
    if (
      isValidPawnDiagonalAttack(
        forwardWestPosition,
        pieceColour,
        enPassantTarget,
        pieceData
      )
    ) {
      diagonalAttacks.push(forwardWestPosition);
    }
  }
  if (forwardEastPosition) {
    if (
      isValidPawnDiagonalAttack(
        forwardEastPosition,
        pieceColour,
        enPassantTarget,
        pieceData
      )
    ) {
      diagonalAttacks.push(forwardEastPosition);
    }
  }
  return diagonalAttacks;
};

export const generateVerticalAttacks = (
  pieceColour: PieceColour,
  start: Position,
  range: number,
  pieceData: PieceData,
  numRanks: number,
  numFiles: number
): Position[] => {
  const northPositions = getLinearPositionsUntilCollision(
    pieceColour,
    start,
    1,
    0,
    range,
    true,
    pieceData,
    numRanks,
    numFiles
  );
  const southPositions = getLinearPositionsUntilCollision(
    pieceColour,
    start,
    -1,
    0,
    range,
    true,
    pieceData,
    numRanks,
    numFiles
  );
  return [...northPositions, ...southPositions];
};

export const generateHorizontalAttacks = (
  pieceColour: PieceColour,
  start: Position,
  range: number,
  pieceData: PieceData,
  numRanks: number,
  numFiles: number
): Position[] => {
  const eastPositions = getLinearPositionsUntilCollision(
    pieceColour,
    start,
    0,
    1,
    range,
    true,
    pieceData,
    numRanks,
    numFiles
  );
  const westPositions = getLinearPositionsUntilCollision(
    pieceColour,
    start,
    0,
    -1,
    range,
    true,
    pieceData,
    numRanks,
    numFiles
  );
  return [...eastPositions, ...westPositions];
};

export const generateDiagonalAttacks = (
  pieceColour: PieceColour,
  start: Position,
  range: number,
  pieceData: PieceData,
  numRanks: number,
  numFiles: number
): Position[] => {
  const northEastPositions = getLinearPositionsUntilCollision(
    pieceColour,
    start,
    1,
    1,
    range,
    true,
    pieceData,
    numRanks,
    numFiles
  );
  const southEastPositions = getLinearPositionsUntilCollision(
    pieceColour,
    start,
    -1,
    1,
    range,
    true,
    pieceData,
    numRanks,
    numFiles
  );
  const southWestPositions = getLinearPositionsUntilCollision(
    pieceColour,
    start,
    -1,
    -1,
    range,
    true,
    pieceData,
    numRanks,
    numFiles
  );
  const northWestPositions = getLinearPositionsUntilCollision(
    pieceColour,
    start,
    1,
    -1,
    range,
    true,
    pieceData,
    numRanks,
    numFiles
  );
  return [
    ...northEastPositions,
    ...southEastPositions,
    ...southWestPositions,
    ...northWestPositions,
  ];
};

export const isValidLJumpAttack = (
  target: Position,
  pieceColour: PieceColour,
  pieceData: PieceData,
  numRanks: number,
  numFiles: number
): boolean => {
  if (target.rank < 0 || target.rank >= numRanks) return false;
  if (target.file < 0 || target.file >= numFiles) return false;
  const pieceOnTarget = getPieceOnSquare(target.rank, target.file, pieceData);
  if (!pieceOnTarget || pieceOnTarget.colour !== pieceColour) return true;
  return false;
};

export const generateLJumpAttacks = (
  pieceColour: PieceColour,
  start: Position,
  pieceData: PieceData,
  numRanks: number,
  numFiles: number
): Position[] => {
  const northNorthEastPos: Position = {
    rank: start.rank + 2,
    file: start.file + 1,
  };
  const eastNorthEastPos: Position = {
    rank: start.rank + 1,
    file: start.file + 2,
  };

  const eastSouthEastPos: Position = {
    rank: start.rank - 1,
    file: start.file + 2,
  };
  const southSouthEastPos: Position = {
    rank: start.rank - 2,
    file: start.file + 1,
  };

  const southSouthWestPos: Position = {
    rank: start.rank - 2,
    file: start.file - 1,
  };
  const westSouthWestPos: Position = {
    rank: start.rank - 1,
    file: start.file - 2,
  };

  const westNorthWestPos: Position = {
    rank: start.rank + 1,
    file: start.file - 2,
  };
  const northNorthWestPos: Position = {
    rank: start.rank + 2,
    file: start.file - 1,
  };

  const allPossibleAttacks: Position[] = [
    northNorthEastPos,
    eastNorthEastPos,
    eastSouthEastPos,
    southSouthEastPos,
    southSouthWestPos,
    westSouthWestPos,
    westNorthWestPos,
    northNorthWestPos,
  ];

  const validAttacks = allPossibleAttacks.filter((p) =>
    isValidLJumpAttack(p, pieceColour, pieceData, numRanks, numFiles)
  );
  return validAttacks;
};

export const getCastlingSquare = (
  pieceColour: PieceColour,
  side: CastlingSide,
  numRanks: number,
  numFiles: number
): Position => {
  const whiteRank = 0;
  const blackRank = numRanks - 1;
  const kingsideFile = numFiles - 2;
  const queensideFile = 2;
  if (pieceColour === "white" && side === "kingside") {
    return {
      rank: whiteRank,
      file: kingsideFile,
    };
  }
  if (pieceColour === "white" && side === "queenside") {
    return {
      rank: whiteRank,
      file: queensideFile,
    };
  }
  if (pieceColour === "black" && side === "kingside") {
    return {
      rank: blackRank,
      file: kingsideFile,
    };
  }
  if (pieceColour === "black" && side === "queenside") {
    return {
      rank: blackRank,
      file: queensideFile,
    };
  }
  throw Error(
    `Invalid piece colour (${pieceColour}) or castling side (${side}).`
  );
};

export const isKingInCheck = (
  colour: PieceColour,
  pieceData: PieceData
): boolean => {
  const friendlyPieces = pieceData[colour];
  const enemyPieces = pieceData[colour === "white" ? "black" : "white"];
  const friendlyKing = friendlyPieces.find((p) => p.type === "king");
  if (friendlyKing === undefined) {
    throw Error(`Could not find a ${colour} king.`);
  }

  return enemyPieces.some((piece) =>
    piece.attacks.some((attack) =>
      isSamePosition(attack, friendlyKing.position)
    )
  );
};

export const moveAvoidsCheck = (
  piece: Piece,
  move: Position,
  gameData: GameData,
  numRanks: number,
  numFiles: number
): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const nextGameData = movePieceAndGetGameData(
    gameData,
    piece,
    move.rank,
    move.file,
    numRanks,
    numFiles,
    false
  );
  return !isKingInCheck(piece.colour, nextGameData.pieceData);
};

export const generateAttacksForPiece = (
  piece: Piece,
  gameData: GameData,
  numRanks: number,
  numFiles: number,
  isPawnAndHasMoved: boolean,
  filterChecks: boolean
): Position[] => {
  if (piece.position === null) {
    return [];
  }
  const castlingAvailability: CastlingAvailability =
    gameData.castlingAvailabilities[piece.colour];
  const movement = getPieceMovementForPiece(
    piece.type,
    isPawnAndHasMoved,
    castlingAvailability
  );
  let attacks: Position[] = [];
  Object.entries(movement).forEach(([type, range]) => {
    const typeTyped = type as PieceMoveType;
    switch (typeTyped) {
      case "pawnForward":
        if (range !== null) {
          attacks = attacks.concat(
            generatePawnForwardAttacks(
              piece.colour,
              piece.position as Position,
              range,
              gameData.pieceData,
              numRanks,
              numFiles
            )
          );
        }
        break;
      case "pawnDiagonalAttack":
        if (range !== null) {
          attacks = attacks.concat(
            generatePawnDiagonalAttacks(
              piece.colour,
              piece.position as Position,
              gameData.enPassantTarget,
              gameData.pieceData,
              numRanks,
              numFiles
            )
          );
        }
        break;
      case "vertical":
        if (range !== null) {
          attacks = attacks.concat(
            generateVerticalAttacks(
              piece.colour,
              piece.position as Position,
              range,
              gameData.pieceData,
              numRanks,
              numFiles
            )
          );
        }
        break;
      case "horizontal":
        if (range !== null) {
          attacks = attacks.concat(
            generateHorizontalAttacks(
              piece.colour,
              piece.position as Position,
              range,
              gameData.pieceData,
              numRanks,
              numFiles
            )
          );
        }
        break;
      case "diagonal":
        if (range !== null) {
          attacks = attacks.concat(
            generateDiagonalAttacks(
              piece.colour,
              piece.position as Position,
              range,
              gameData.pieceData,
              numRanks,
              numFiles
            )
          );
        }
        break;
      case "lJump":
        if (range !== null) {
          attacks = attacks.concat(
            generateLJumpAttacks(
              piece.colour,
              piece.position as Position,
              gameData.pieceData,
              numRanks,
              numFiles
            )
          );
        }
        break;
      case "castleKingside":
        if (range !== null && castlingAvailability.kingside) {
          attacks = attacks.concat(
            getCastlingSquare(piece.colour, "kingside", numRanks, numFiles)
          );
        }
        break;
      case "castleQueenside":
        if (range !== null && castlingAvailability.queenside) {
          attacks = attacks.concat(
            getCastlingSquare(piece.colour, "queenside", numRanks, numFiles)
          );
        }
        break;
      default:
        throw Error(`Type ${type} is not a valid movement type.`);
    }
  });
  if (filterChecks === true) {
    // Whether the King is currently in check, or not, the next move needs to avoid it.
    attacks = attacks.filter((attack) =>
      moveAvoidsCheck(piece, attack, gameData, numRanks, numFiles)
    );
  }
  return attacks;
};

export const pawnHasMoved = (
  position: Position | null,
  colour: PieceColour,
  numRanks: number
): boolean =>
  position === null ||
  (colour === "white" && position.rank !== 1) ||
  (colour === "black" && position.rank !== numRanks - 2);

export const getSquaresAlongRankOrFile = (
  along: keyof Position,
  alongIndex: number,
  numRanks: number,
  numFiles: number,
  start?: number,
  end?: number
): Position[] => {
  const maxAlongIndex = (along === "rank" ? numRanks : numFiles) - 1;
  if (alongIndex < 0 || alongIndex > maxAlongIndex) {
    throw Error(
      `alongIndex value of ${alongIndex} is out of bounds (min: 0, max: ${maxAlongIndex}).`
    );
  }

  const maxStartOrEnd = (along === "rank" ? numFiles : numRanks) - 1;
  const startToUse =
    (start !== undefined && end !== undefined ? Math.min(start, end) : start) ||
    0;
  const endToUse =
    (start !== undefined && end !== undefined ? Math.max(start, end) : end) ||
    maxStartOrEnd;
  if (startToUse < 0 || startToUse > maxStartOrEnd) {
    throw Error(
      `start value of ${startToUse} is out of bounds (min: 0, max: ${maxStartOrEnd}).`
    );
  }
  if (endToUse < 0 || endToUse > maxStartOrEnd) {
    throw Error(
      `end value of ${endToUse} is out of bounds (min: 0, max: ${maxStartOrEnd}).`
    );
  }
  if (startToUse >= endToUse) {
    throw Error(
      `start value of ${startToUse} is greater than or equal to the end value of ${endToUse}`
    );
  }

  const positions: Position[] = [];
  for (let i = startToUse; i <= endToUse; i += 1) {
    positions.push({
      rank: along === "rank" ? alongIndex : i,
      file: along === "file" ? alongIndex : i,
    });
  }
  return positions;
};

export const getEnemyColour = (friendlyColour: PieceColour): PieceColour =>
  friendlyColour === "white" ? "black" : "white";

export const isLegalCastle = (
  colour: PieceColour,
  rookCurrentPosition: Position,
  kingCurrentPosition: Position,
  pieceData: PieceData,
  numRanks: number,
  numFiles: number
): boolean => {
  /**
   * If the king or rook has moved, this will be filtered out by setting castlingAvailabilities.
   * So, don't need to worry about that here.
   */
  if (kingCurrentPosition.rank !== rookCurrentPosition.rank) {
    throw Error(
      `King is on rank ${kingCurrentPosition.rank} and the rook is on rank ${rookCurrentPosition.rank}.`
    );
  }
  const squaresBetween = getSquaresAlongRankOrFile(
    "rank",
    rookCurrentPosition.rank,
    numRanks,
    numFiles,
    kingCurrentPosition.file,
    rookCurrentPosition.file
  ).filter(
    (sq) =>
      !isSamePosition(sq, kingCurrentPosition) &&
      !isSamePosition(sq, rookCurrentPosition)
  );
  return (
    !pieceData[colour].some((fP) =>
      squaresBetween.some((sq) => isSamePosition(sq, fP.position))
    ) &&
    !pieceData[getEnemyColour(colour)].some((eP) =>
      eP.attacks.some((a) => squaresBetween.some((sq) => isSamePosition(sq, a)))
    )
  );
};

export const getRookIndexForSide = (
  side: CastlingSide,
  rank: number,
  numFiles: number,
  pieces: Piece[]
): number => {
  const targetFile = side === "queenside" ? 0 : numFiles - 1;
  const rookPosition: Position = { rank, file: targetFile };
  const rook = pieces.findIndex((p) =>
    isSamePosition(p.position, rookPosition)
  );
  if (rook === -1) {
    throw Error(
      `Expected to find rook in position { rank: ${rookPosition.rank}, file: ${rookPosition.file} } but did not find one.`
    );
  }
  return rook;
};

export const filterIllegalCastles = (
  gameData: GameData,
  pieceData: PieceData,
  numRanks: number,
  numFiles: number
): PieceData => {
  const newPieceData = { ...pieceData };

  Object.entries(pieceData).forEach(([colour, pieces]) => {
    const colourTyped = colour as PieceColour;
    const castlingAvailability = gameData.castlingAvailabilities[colourTyped];
    if (!castlingAvailability.kingside && !castlingAvailability.queenside) {
      // Assume generateAttacksForPieceData did not erroneously add castling moves.
      return;
    }

    const kingIndex = pieces.findIndex((p) => p.type === "king");
    if (kingIndex === -1) {
      throw Error(`Unable to find a ${colourTyped} king.`);
    }
    const king = pieces[kingIndex];
    if (king.position === null) {
      throw Error("King's position cannot be null");
    }

    const castlingSquares: Position[] = [
      castlingAvailability.kingside
        ? getCastlingSquare(colourTyped, "kingside", numRanks, numFiles)
        : null,
      castlingAvailability.queenside
        ? getCastlingSquare(colourTyped, "queenside", numRanks, numFiles)
        : null,
    ].filter((p) => p !== null) as Position[];
    if (castlingSquares.length === 0) {
      throw Error(`Found no legal castling squares for ${colourTyped}.`);
    }

    const rooks: { [side in CastlingSide]: Position | null } = {
      kingside: castlingAvailability.kingside
        ? pieces[
            getRookIndexForSide(
              "kingside",
              king.position.rank,
              numFiles,
              pieces
            )
          ].position
        : null,
      queenside: castlingAvailability.queenside
        ? pieces[
            getRookIndexForSide(
              "queenside",
              king.position.rank,
              numFiles,
              pieces
            )
          ].position
        : null,
    };

    const newKingAttacks = king.attacks.filter((a) => {
      if (!castlingSquares.some((sq) => isSamePosition(sq, a))) {
        // Not a castling move, keep.
        return true;
      }

      if (king.position === null) {
        throw Error("Cannot castle a captured king.");
      }
      const castlingSide: CastlingSide =
        a.file > king.position.file ? "kingside" : "queenside";

      const rookPosition = rooks[castlingSide];
      if (rookPosition === null) {
        throw Error(`Missing rook on ${castlingSide} for castling.`);
      }

      return isLegalCastle(
        colourTyped,
        rookPosition,
        king.position,
        pieceData,
        numRanks,
        numFiles
      );
    });

    const newPieces = [...pieces];
    newPieces[kingIndex] = {
      ...newPieces[kingIndex],
      attacks: newKingAttacks,
    };
    newPieceData[colourTyped] = newPieces;
  });
  return newPieceData;
};

export const generateAttacksForPieceData = (
  gameData: GameData,
  numRanks: number,
  numFiles: number,
  filterChecks: boolean
): PieceData => {
  let newPieceData: PieceData = {
    ...gameData.pieceData,
  };
  Object.entries(gameData.pieceData).forEach(([colour, pieces]) => {
    const colourTyped = colour as PieceColour;
    const newPieces: Piece[] = pieces.map((piece) => {
      const newPiece = { ...piece };
      const isPawnAndHasMoved =
        newPiece.type === "pawn" &&
        pawnHasMoved(piece.position, piece.colour, numRanks);
      newPiece.attacks = generateAttacksForPiece(
        newPiece,
        gameData,
        numRanks,
        numFiles,
        isPawnAndHasMoved,
        filterChecks
      );
      return newPiece;
    });
    newPieceData[colourTyped] = newPieces;
  });
  newPieceData = filterIllegalCastles(
    gameData,
    newPieceData,
    numRanks,
    numFiles
  );

  return newPieceData;
};

export const initializePieceData = (
  gameData: GameData,
  fenPiecePositions: string,
  numRanks: number,
  numFiles: number
): PieceData => {
  const ranks = fenPiecePositions.split("/");
  if (ranks.length !== numRanks) {
    throw Error(`Invalid piece placement in FEN string: ${fenPiecePositions}`);
  }

  const pieceCounts: PieceCounts = {
    white: { ...initialPieceCount },
    black: { ...initialPieceCount },
  };
  const pieceData: PieceData = {
    white: [],
    black: [],
  };

  ranks.forEach((rank, i) => {
    let j = 0;
    rank.split("").forEach((char) => {
      const position = {
        rank: numRanks - 1 - i,
        file: j,
      };
      // We'll calculate the attacking squares once all the pieces are on the board.
      const attacks: Position[] = [];
      switch (char) {
        case "p":
          pieceData.black.push({
            id: generatePieceId("black", "pawn", pieceCounts.black.pawn),
            colour: "black",
            type: "pawn",
            position,
            attacks,
          });
          pieceCounts.black.pawn += 1;
          j += 1;
          break;
        case "n":
          pieceData.black.push({
            id: generatePieceId("black", "knight", pieceCounts.black.knight),
            colour: "black",
            type: "knight",
            position,
            attacks,
          });
          pieceCounts.black.knight += 1;
          j += 1;
          break;
        case "b":
          pieceData.black.push({
            id: generatePieceId("black", "bishop", pieceCounts.black.bishop),
            colour: "black",
            type: "bishop",
            position,
            attacks,
          });
          pieceCounts.black.bishop += 1;
          j += 1;
          break;
        case "r":
          pieceData.black.push({
            id: generatePieceId("black", "rook", pieceCounts.black.rook),
            colour: "black",
            type: "rook",
            position,
            attacks,
          });
          pieceCounts.black.rook += 1;
          j += 1;
          break;
        case "q":
          pieceData.black.push({
            id: generatePieceId("black", "queen", pieceCounts.black.queen),
            colour: "black",
            type: "queen",
            position,
            attacks,
          });
          pieceCounts.black.queen += 1;
          j += 1;
          break;
        case "k":
          pieceData.black.push({
            id: generatePieceId("black", "king", pieceCounts.black.king),
            colour: "black",
            type: "king",
            position,
            attacks,
          });
          pieceCounts.black.king += 1;
          j += 1;
          break;
        case "P":
          pieceData.white.push({
            id: generatePieceId("white", "pawn", pieceCounts.white.pawn),
            colour: "white",
            type: "pawn",
            position,
            attacks,
          });
          pieceCounts.white.pawn += 1;
          j += 1;
          break;
        case "N":
          pieceData.white.push({
            id: generatePieceId("white", "knight", pieceCounts.white.knight),
            colour: "white",
            type: "knight",
            position,
            attacks,
          });
          pieceCounts.white.knight += 1;
          j += 1;
          break;
        case "B":
          pieceData.white.push({
            id: generatePieceId("white", "bishop", pieceCounts.white.bishop),
            colour: "white",
            type: "bishop",
            position,
            attacks,
          });
          pieceCounts.white.bishop += 1;
          j += 1;
          break;
        case "R":
          pieceData.white.push({
            id: generatePieceId("white", "rook", pieceCounts.white.rook),
            colour: "white",
            type: "rook",
            position,
            attacks,
          });
          pieceCounts.white.rook += 1;
          j += 1;
          break;
        case "Q":
          pieceData.white.push({
            id: generatePieceId("white", "queen", pieceCounts.white.queen),
            colour: "white",
            type: "queen",
            position,
            attacks,
          });
          pieceCounts.white.queen += 1;
          j += 1;
          break;
        case "K":
          pieceData.white.push({
            id: generatePieceId("white", "king", pieceCounts.white.king),
            colour: "white",
            type: "king",
            position,
            attacks,
          });
          pieceCounts.white.king += 1;
          j += 1;
          break;
        default: {
          const parsed = parseInt(char, 10);
          if (Number.isNaN(parsed))
            throw Error(`Invalid char in FEN string: "${char}"`);
          j += parsed;
        }
      }
    });
  });
  const newGameData = {
    ...gameData,
    pieceData,
  };
  const pieceDataWithAttackingSquares = generateAttacksForPieceData(
    newGameData,
    numRanks,
    numFiles,
    true
  );
  return pieceDataWithAttackingSquares;
};

export const initializeActiveColour = (
  fenActiveColour: string
): PieceColour => {
  switch (fenActiveColour) {
    case "w":
      return "white";
    case "b":
      return "black";
    default:
      throw Error(`Invallid FEN active colour: ${fenActiveColour}.`);
  }
};

export const initializeCastlingAvailabilities = (
  fenCastlingAvailabilites: string
): CastlingAvailabilities => {
  if (fenCastlingAvailabilites.length > 4) {
    throw Error(`Invalid FEN castling string: ${fenCastlingAvailabilites}.`);
  }
  const cA: CastlingAvailabilities = {
    white: {
      kingside: false,
      queenside: false,
    },
    black: {
      kingside: false,
      queenside: false,
    },
  };
  fenCastlingAvailabilites.split("").forEach((c) => {
    switch (c) {
      case "K":
        cA.white.kingside = true;
        break;
      case "Q":
        cA.white.queenside = true;
        break;
      case "k":
        cA.black.kingside = true;
        break;
      case "q":
        cA.black.queenside = true;
        break;
      default:
        throw Error(`Invalid char in FEN castling string: ${c}.`);
    }
  });
  return cA;
};

const charCodeOffset = 97;

export const getFileNumberFromLetter = (
  fileLetter: string,
  numFiles: number
): number => {
  if (fileLetter.length !== 1) {
    throw Error(`Invalid file letter index: ${fileLetter}.`);
  }
  const fileNum = fileLetter.charCodeAt(0) - charCodeOffset;
  if (fileNum < 0 || fileNum > numFiles - 1) {
    throw Error(
      `File letter ${fileLetter} corresponds to file index ${fileNum} which is out of range of the number of files (${numFiles}).`
    );
  }
  return fileNum;
};

export const getFileLetterFromNumber = (fileNum: number): string =>
  String.fromCharCode(fileNum + "a".charCodeAt(0));

export const initializeEnPassantTarget = (
  fenEnPassantTarget: string,
  numRanks: number,
  numFiles: number
): Position | null => {
  if (fenEnPassantTarget.length > 2) {
    throw Error(`Invalid FEN en passant target string: ${fenEnPassantTarget}`);
  }
  if (fenEnPassantTarget === "-") {
    return null;
  }
  const coordinates = fenEnPassantTarget.split("");
  const file = getFileNumberFromLetter(coordinates[0], numFiles);
  const rank = parseInt(coordinates[1], 10);
  if (Number.isNaN(rank) || rank < 0 || rank > numRanks - 1) {
    throw Error(
      `Rank ${rank} is out of range of the number of ranks (${numRanks}).`
    );
  }
  const initialTarget: Position = {
    rank,
    file,
  };
  return initialTarget;
};

const maxMoves = 5949;

export const initializeHalfmoveClock = (fenHalfmoveClock: string): number => {
  const parsed = parseInt(fenHalfmoveClock, 10);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > maxMoves * 2) {
    throw Error(`Invalid FEN halfmove clock: ${fenHalfmoveClock}`);
  }
  return parsed;
};

export const initializeFullmoveNumber = (fenFullmoveNumber: string): number => {
  const parsed = parseInt(fenFullmoveNumber, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > maxMoves) {
    throw Error(`Invalid FEN fullmove number: ${fenFullmoveNumber}`);
  }
  return parsed;
};

export const initializeGameData = (
  fenString: string,
  numRanks: number,
  numFiles: number
): GameData => {
  const sections = fenString.split(" ");
  if (sections.length !== 6) {
    throw Error(`Invalid FEN string: ${fenString}`);
  }
  const placeholderPieceData: PieceData = {
    white: [],
    black: [],
  };
  const gameData: GameData = {
    pieceData: placeholderPieceData,
    activeColour: initializeActiveColour(sections[1]),
    castlingAvailabilities: initializeCastlingAvailabilities(sections[2]),
    enPassantTarget: initializeEnPassantTarget(sections[3], numRanks, numFiles),
    halfmoveClock: initializeHalfmoveClock(sections[4]),
    fullmoveNumber: initializeFullmoveNumber(sections[5]),
    FEN: fenString,
  };
  gameData.pieceData = initializePieceData(
    gameData,
    sections[0],
    numRanks,
    numFiles
  );
  return gameData;
};

/**
 * @returns If the move is a castling move, returns the side. Otherwise, returns null.
 */
export const isCastlingMove = (
  king: Piece,
  castlingAvailability: CastlingAvailability,
  kingNewPosition: Position,
  numRanks: number,
  numFiles: number
): CastlingSide | null => {
  if (king.type !== "king") {
    throw Error("Must pass a king to isCastlingMove.");
  }
  if (!castlingAvailability.kingside && !castlingAvailability.queenside) {
    return null;
  }
  const castlingSquares: { [side in CastlingSide]: Position } = {
    kingside: getCastlingSquare(king.colour, "kingside", numRanks, numFiles),
    queenside: getCastlingSquare(king.colour, "queenside", numRanks, numFiles),
  };
  if (isSamePosition(castlingSquares.kingside, kingNewPosition)) {
    return "kingside";
  }
  if (isSamePosition(castlingSquares.queenside, kingNewPosition)) {
    return "queenside";
  }
  return null;
};

export const pawnShouldPromote = (
  pawn: Piece,
  newPosition: Position,
  numRanks: number
): boolean => {
  if (pawn.type !== "pawn") {
    throw Error(`Piece ${pawn.id} is not a pawn.`);
  }
  const promotionRank = pawn.colour === "white" ? numRanks - 1 : 0;
  return newPosition.rank === promotionRank;
};

export const updatePiecePosition = (
  pieces: Piece[],
  movingPiece: Piece,
  newRank: number,
  newFile: number,
  numRanks: number,
  numFiles: number,
  castlingAvailability: CastlingAvailability
): Piece[] => {
  if (newRank < 0 || newRank > numRanks - 1)
    throw Error(
      `Cannot move piece ${movingPiece.id} to rank ${newRank} as it is outside the number of ranks (${numRanks}).`
    );
  if (newFile < 0 || newFile > numFiles - 1)
    throw Error(
      `Cannot move piece ${movingPiece.id} to file ${newFile} as it is outside the number of files (${numFiles}).`
    );
  const pieceIndex = pieces.findIndex((p) => p.id === movingPiece.id);
  if (pieceIndex === -1)
    throw Error(`Piece ${movingPiece.id} was not found in the pieces array.`);
  const newPiece = { ...pieces[pieceIndex] };
  if (newPiece.position === null)
    throw Error(`Piece ${movingPiece.id} has been captured and cannot move.`);
  newPiece.position = {
    rank: newRank,
    file: newFile,
  };
  const newPieces = [...pieces];

  if (newPiece.type === "king") {
    /**
     * Check if this is a castling move.
     * If yes, move rook.
     */
    const castlingSide = isCastlingMove(
      newPiece,
      castlingAvailability,
      newPiece.position,
      numRanks,
      numFiles
    );
    if (castlingSide !== null) {
      const rookIndex = getRookIndexForSide(
        castlingSide,
        newPiece.position.rank,
        numFiles,
        pieces
      );
      const rookNewFile =
        newPiece.position.file + (castlingSide === "queenside" ? 1 : -1);
      const newRook = { ...pieces[rookIndex] };
      if (newRook.position === null) {
        throw Error(`Rook ${newRook.id} has been captured and cannot castle.`);
      }
      newRook.position = {
        ...newRook.position,
        file: rookNewFile,
      };
      newPieces[rookIndex] = newRook;
    }
  } else if (newPiece.type === "pawn") {
    // Check if pawn promoted.
    // TODO: Support under-promoting.
    if (pawnShouldPromote(newPiece, newPiece.position, numRanks)) {
      newPiece.type = "queen";
    }
  }

  newPieces[pieceIndex] = newPiece;
  return newPieces;
};

export const moveEnablesEnPassant = (piece: Piece, newRank: number): boolean =>
  piece.type === "pawn" &&
  piece.position !== null &&
  Math.abs(newRank - piece.position.rank) === 2;

export const getEnPassantTargetForMove = (
  piece: Piece,
  newRank: number,
  newFile: number
): Position | null => {
  if (!moveEnablesEnPassant(piece, newRank)) {
    return null;
  }
  switch (piece.colour) {
    case "white":
      return {
        rank: newRank - 1,
        file: newFile,
      };
    case "black":
      return {
        rank: newRank + 1,
        file: newFile,
      };
    default:
      throw Error(`Invalid piece colour: ${piece.colour}.`);
  }
};

export const makeCaptures = (
  newEnemyPosition: Position,
  friendlyPieces: Piece[]
): Piece[] => {
  const capturedPieceIndex = friendlyPieces.findIndex(
    (p) =>
      p.position &&
      isSamePosition(
        {
          rank: newEnemyPosition.rank,
          file: newEnemyPosition.file,
        },
        {
          rank: p.position.rank,
          file: p.position.file,
        }
      )
  );
  const newPieces = [...friendlyPieces];
  if (capturedPieceIndex === -1) {
    return newPieces;
  }
  const newPiece: Piece = { ...friendlyPieces[capturedPieceIndex] };
  newPiece.position = null;
  newPieces[capturedPieceIndex] = newPiece;
  return newPieces;
};

export const getNewCastlingAvailabilitiesForMove = (
  piece: Piece,
  newPosition: Position,
  pieceData: PieceData,
  currentCastlingAvailabilities: CastlingAvailabilities,
  numFiles: number
): CastlingAvailabilities => {
  const newCastlingAvailabilites = { ...currentCastlingAvailabilities };
  const pieceCaptured = getPieceOnSquare(
    newPosition.rank,
    newPosition.file,
    pieceData
  );
  const enemyColour = getEnemyColour(piece.colour);
  if (
    pieceCaptured !== null &&
    pieceCaptured.colour === enemyColour &&
    (pieceCaptured.type === "king" || pieceCaptured.type === "rook")
  ) {
    if (pieceCaptured.type === "king") {
      // This should never be reached but we'll set just in case.
      newCastlingAvailabilites[enemyColour] = {
        kingside: false,
        queenside: false,
      };
    } else if (pieceCaptured.type === "rook") {
      /**
       * If the rook has moved off its originating file the castling availability should be set to false.
       * So we just need to worry about when the rook is captured on its home square.
       */
      if (pieceCaptured.position === null) {
        throw Error(
          `The rook ${pieceCaptured.id} has been prematurely captured.`
        );
      }
      if (pieceCaptured.position.file === 0) {
        // Queenside rook captured.
        newCastlingAvailabilites[enemyColour] = {
          ...newCastlingAvailabilites[enemyColour],
          queenside: false,
        };
      } else if (pieceCaptured.position.file === numFiles - 1) {
        // Kingside rook captured.
        newCastlingAvailabilites[enemyColour] = {
          ...newCastlingAvailabilites[enemyColour],
          kingside: false,
        };
      }
    }
  }
  if (piece.type === "king") {
    return {
      ...newCastlingAvailabilites,
      [piece.colour]: {
        kingside: false,
        queenside: false,
      },
    };
  }
  if (piece.type === "rook") {
    if (piece.position === null) {
      return newCastlingAvailabilites;
    }
    if (piece.position.file === 0) {
      // Queenside
      return {
        ...newCastlingAvailabilites,
        [piece.colour]: {
          ...newCastlingAvailabilites[piece.colour],
          queenside: false,
        },
      };
    }
    if (piece.position.file === numFiles - 1) {
      // Kingside
      return {
        ...newCastlingAvailabilites,
        [piece.colour]: {
          ...newCastlingAvailabilites[piece.colour],
          kingside: false,
        },
      };
    }
  }
  return newCastlingAvailabilites;
};

export const generateFENEnPassantTarget = (
  enPassantTarget: Position | null
): string => {
  if (enPassantTarget === null) {
    return "-";
  }
  const rank = enPassantTarget.rank + 1;
  const file = getFileLetterFromNumber(enPassantTarget.file);
  return file + rank;
};

export const generateFENCastlingAvailabilities = (
  castlingAvailabilities: CastlingAvailabilities
): string => {
  let string = "";

  if (castlingAvailabilities.white.kingside === true) {
    string += "K";
  }
  if (castlingAvailabilities.white.queenside === true) {
    string += "Q";
  }

  if (castlingAvailabilities.black.kingside === true) {
    string += "k";
  }
  if (castlingAvailabilities.black.queenside === true) {
    string += "q";
  }

  if (string.length === 0) {
    string = "-";
  }

  return string;
};

export const generateFENActiveColour = (activeColour: PieceColour): string =>
  activeColour === "white" ? "w" : "b";

export const generateFENPiecePlacement = (
  pieceData: PieceData,
  numRanks: number,
  numFiles: number
): string => {
  let string = "";
  for (let i = 0; i <= numRanks - 1; i += 1) {
    let numEmptySquares = 0;

    for (let j = 0; j <= numFiles - 1; j += 1) {
      const pieceOnSquare = getPieceOnSquare(i, j, pieceData);

      if (pieceOnSquare !== null) {
        if (numEmptySquares > 0) {
          string += numEmptySquares;
        }
        string += pieceFENMapping[pieceOnSquare.colour][pieceOnSquare.type];
        numEmptySquares = 0;
      } else {
        numEmptySquares += 1;
      }

      if (j === numFiles - 1 && numEmptySquares > 0) {
        string += numEmptySquares;
      }
    }

    if (i < numRanks - 1) {
      string += "/";
    }
  }

  return string;
};

export const generateFENForPosition = (
  gameData: GameData,
  numRanks: number,
  numFiles: number
): string =>
  `${generateFENPiecePlacement(
    gameData.pieceData,
    numRanks,
    numFiles
  )} ${generateFENActiveColour(
    gameData.activeColour
  )} ${generateFENCastlingAvailabilities(
    gameData.castlingAvailabilities
  )} ${generateFENEnPassantTarget(gameData.enPassantTarget)} ${
    gameData.halfmoveClock
  } ${gameData.fullmoveNumber}`;

export const movePieceAndGetGameData = (
  gameData: GameData,
  piece: Piece,
  newRank: number,
  newFile: number,
  numRanks: number,
  numFiles: number,
  /**
   * This variable prevents infinite looping.
   * It should be set to "true" on all top-level calls...
   * and "false" on any recursive calls.
   */
  filterChecks: boolean
): GameData => {
  const newGameData: GameData = {
    ...gameData,
    activeColour: gameData.activeColour === "white" ? "black" : "white",
    enPassantTarget: getEnPassantTargetForMove(piece, newRank, newFile),
    pieceData: {
      white:
        piece.colour === "white"
          ? updatePiecePosition(
              gameData.pieceData.white,
              piece,
              newRank,
              newFile,
              numRanks,
              numFiles,
              gameData.castlingAvailabilities[piece.colour]
            )
          : makeCaptures(
              { rank: newRank, file: newFile },
              gameData.pieceData.white
            ),
      black:
        piece.colour === "black"
          ? updatePiecePosition(
              gameData.pieceData.black,
              piece,
              newRank,
              newFile,
              numRanks,
              numFiles,
              gameData.castlingAvailabilities[piece.colour]
            )
          : makeCaptures(
              { rank: newRank, file: newFile },
              gameData.pieceData.black
            ),
    },
    halfmoveClock: gameData.halfmoveClock + 1,
    fullmoveNumber:
      piece.colour === pieceColourArray[pieceColourArray.length - 1]
        ? gameData.fullmoveNumber + 1
        : gameData.fullmoveNumber,
    castlingAvailabilities: getNewCastlingAvailabilitiesForMove(
      piece,
      { rank: newRank, file: newFile },
      gameData.pieceData,
      gameData.castlingAvailabilities,
      numFiles
    ),
  };
  newGameData.FEN = generateFENForPosition(newGameData, numRanks, numFiles);
  newGameData.pieceData = generateAttacksForPieceData(
    newGameData,
    numRanks,
    numFiles,
    filterChecks
  );
  return newGameData;
};

export const getSquareInCheck = (pieceData: PieceData): Position | null => {
  for (let i = 0; i <= pieceColourArray.length - 1; i += 1) {
    const colour = pieceColourArray[i] as PieceColour;
    const king = pieceData[colour].find((p) => p.type === "king");
    if (king === undefined) {
      throw Error(`Could not find a ${colour} king.`);
    }
    if (isKingInCheck(colour, pieceData)) {
      return king.position;
    }
  }
  return null;
};

export const getAllAvailableMoves = (pieces: Piece[]): Move[] =>
  pieces.reduce<Move[]>((prev, cur) => {
    const pieceMoves: Move[] = cur.attacks.map((a) => ({
      piece: cur,
      newPosition: a,
    }));
    return prev.concat(pieceMoves);
  }, []);

export const getGameResult = (gameData: GameData): GameResult | null => {
  // TODO: Other game over conditions.
  const activePieces = gameData.pieceData[gameData.activeColour];
  const enemyColour = getEnemyColour(gameData.activeColour);
  if (getAllAvailableMoves(activePieces).length === 0) {
    if (isKingInCheck(gameData.activeColour, gameData.pieceData)) {
      // Checkmate
      return {
        [enemyColour]: 1,
        [gameData.activeColour]: 0,
      } as GameResult;
    }
    // Stalemate
    return {
      white: 0.5,
      black: 0.5,
    };
  }
  return null;
};

export const getPGNResult = (result: GameResult | null): string => {
  if (result === null) {
    return "*";
  }
  if (result.white === 1) {
    return "1-0";
  }
  if (result.black === 1) {
    return "0-1";
  }
  return "1/2-1/2";
};

export const initializePGN = (
  round: number,
  botPlayers: BotPlayers,
  result: GameResult | null
): string =>
  `[Event "Cherry Chess Exhibition"]\n[Site "Cherry Chess"]\n[Date "${format(
    new Date(),
    pgnDateFormat
  )}"]\n[Round "${round}"]\n[White "${
    botPlayers.white === true ? botPGNName : humanPGNName
  }"]\n[Black "${
    botPlayers.black === true ? botPGNName : humanPGNName
  }"]\n[Result "${getPGNResult(result)}"]\n\n`;

export const moveIsCapture = (move: Move, enemyPieces: Piece[]): boolean =>
  enemyPieces.some((p) => isSamePosition(p.position, move.newPosition));

export const getPGNForMove = (
  fullMoveNumber: number,
  move: Move,
  castlingAvailabilities: CastlingAvailabilities,
  oldEnemyPieces: Piece[],
  newPieceData: PieceData,
  numRanks: number,
  numFiles: number
): string => {
  // TODO: Ambiguous moves
  // TODO: Promotions

  let string = "";
  const isWhite = move.piece.colour === "white";
  if (isWhite) {
    // New fullmove. Add fullmove number.
    string += `${fullMoveNumber > 1 ? " " : ""}${fullMoveNumber}. `;
  } else {
    string += " ";
  }

  let isCastle = false;
  if (move.piece.type === "king") {
    const castlingMove = isCastlingMove(
      move.piece,
      castlingAvailabilities[move.piece.colour],
      move.newPosition,
      numRanks,
      numFiles
    );
    if (castlingMove !== null) {
      isCastle = true;
      switch (castlingMove) {
        case "kingside":
          string += "O-O";
          break;
        case "queenside":
          string += "O-O-O";
          break;
        default:
          throw Error(`Invalid castling side: ${castlingMove}.`);
      }
    }
  }
  if (!isCastle) {
    let pieceAbbreviation = "";
    const isCapture = moveIsCapture(move, oldEnemyPieces);

    if (move.piece.type === "pawn") {
      if (isCapture) {
        if (move.piece.position === null) {
          throw Error(`Captured piece ${move.piece.id} was moved.`);
        }
        pieceAbbreviation = getFileLetterFromNumber(move.piece.position.file);
      }
    } else {
      pieceAbbreviation = pieceFENMapping.white[move.piece.type];
    }

    const capture = isCapture ? "x" : "";
    const newFile = getFileLetterFromNumber(move.newPosition.file);
    const newRank = move.newPosition.rank + 1;

    string += pieceAbbreviation + capture + newFile + newRank;
  }

  const enemyColour = getEnemyColour(move.piece.colour);
  if (isKingInCheck(enemyColour, newPieceData)) {
    if (hasNoLegalMoves(newPieceData[enemyColour])) {
      string += "#";
    } else {
      string += "+";
    }
  }

  return string;
};

export const getFENPosFromFullString = (fullFENString: string): string =>
  fullFENString.split(" ")[0];

export const sortPiecesByValue = (
  ascending: boolean,
  a: Piece,
  b: Piece
): number => {
  if (ascending) {
    return pieceValues[a.type] - pieceValues[b.type];
  }
  return pieceValues[b.type] - pieceValues[a.type];
};

export const getExchangeValueForEnemy = (
  piece: Piece,
  gameData: GameData,
  numRanks: number,
  numFiles: number
): number => {
  // Remove the piece in question so that we can see the defenders attacks on this square.
  const xRayDefenders = gameData.pieceData[piece.colour].filter(
    (p) => p.id !== piece.id
  );
  const falseCastlingAvailability: CastlingAvailability = {
    kingside: false,
    queenside: false,
  };
  const newGameData: GameData = {
    ...gameData,
    castlingAvailabilities: {
      white: { ...falseCastlingAvailability },
      black: { ...falseCastlingAvailability },
    },
    pieceData: {
      ...gameData.pieceData,
      [piece.colour]: xRayDefenders,
    },
  };
  const newPieceData = generateAttacksForPieceData(
    newGameData,
    numRanks,
    numFiles,
    false
  );

  const enemyColour = getEnemyColour(piece.colour);

  const attackers = newPieceData[enemyColour]
    .filter((enemy) =>
      enemy.attacks.some((a) => isSamePosition(a, piece.position))
    )
    .sort((a, b) => sortPiecesByValue(true, a, b));
  const defenders = newPieceData[piece.colour]
    .filter((friendly) =>
      friendly.attacks.some((a) => isSamePosition(a, piece.position))
    )
    .sort((a, b) => sortPiecesByValue(true, a, b));

  let materialWon = attackers.length > 0 ? pieceValues[piece.type] : 0;

  while (attackers.length > 0 && defenders.length > 0) {
    if (defenders.length > 0) {
      materialWon -= pieceValues[attackers[0].type];
      attackers.shift();
    }

    if (attackers.length > 0) {
      materialWon += pieceValues[defenders[0].type];
      defenders.shift();
    }
  }

  return materialWon;
};

export const isWinningExchange = (
  piece: Piece,
  gameData: GameData,
  numRanks: number,
  numFiles: number
): boolean => getExchangeValueForEnemy(piece, gameData, numRanks, numFiles) > 0;

export const enemyHasWinningExchange = (
  colour: PieceColour,
  gameData: GameData,
  numRanks: number,
  numFiles: number
): boolean =>
  gameData.pieceData[colour].some((p) =>
    isWinningExchange(p, gameData, numRanks, numFiles)
  );

export const pieceCanBeCaptured = (
  colour: PieceColour,
  pieceData: PieceData
): boolean => {
  const enemyColour = getEnemyColour(colour);
  const enemyMoves = getAllAvailableMoves(pieceData[enemyColour]);
  return enemyMoves.some((m) => moveIsCapture(m, pieceData[colour]));
};
