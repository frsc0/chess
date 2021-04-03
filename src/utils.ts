import { pieceColourArray } from "./globalConstants";
import {
  CastlingAvailabilities,
  CastlingAvailability,
  CastlingSide,
  GameData,
  Piece,
  PieceColour,
  PieceCount,
  PieceCounts,
  PieceData,
  PieceMovement,
  PieceMoveType,
  PieceType,
  Position,
} from "./typings";

const initialPieceCount: PieceCount = {
  pawn: 0,
  knight: 0,
  bishop: 0,
  rook: 0,
  queen: 0,
  king: 0,
};

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

export const getPieceOnSquare = (
  rank: number,
  file: number,
  pieceData: PieceData
): Piece | null =>
  pieceData.black.find((piece) => pieceIsOnSquare(rank, file, piece)) ||
  pieceData.white.find((piece) => pieceIsOnSquare(rank, file, piece)) ||
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

export const generateAttacksForPiece = (
  piece: Piece,
  isPawnAndHasMoved: boolean,
  castlingAvailabilities: CastlingAvailabilities,
  pieceData: PieceData,
  numRanks: number,
  numFiles: number,
  enPassantTarget: Position | null
): Position[] => {
  if (piece.position === null) {
    return [];
  }
  const castlingAvailability: CastlingAvailability =
    castlingAvailabilities[piece.colour];
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
              pieceData,
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
              enPassantTarget,
              pieceData,
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
              pieceData,
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
              pieceData,
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
              pieceData,
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
              pieceData,
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

export const generateAttacksForPieceData = (
  pieceData: PieceData,
  castlingAvailabilities: CastlingAvailabilities,
  numRanks: number,
  numFiles: number,
  enPassantTarget: Position | null
): PieceData => {
  const newPieceData: PieceData = {
    ...pieceData,
  };
  Object.entries(pieceData).forEach(([colour, pieces]) => {
    const newPieces: Piece[] = pieces.map((piece) => {
      const newPiece = { ...piece };
      const isPawnAndHasMoved =
        newPiece.type === "pawn" &&
        pawnHasMoved(piece.position, piece.colour, numRanks);
      newPiece.attacks = generateAttacksForPiece(
        newPiece,
        isPawnAndHasMoved,
        castlingAvailabilities,
        pieceData,
        numRanks,
        numFiles,
        enPassantTarget
      );
      return newPiece;
    });
    newPieceData[colour as PieceColour] = newPieces;
  });
  return newPieceData;
};

export const initializePieceData = (
  fenPiecePositions: string,
  numRanks: number,
  numFiles: number,
  castlingAvailabilities: CastlingAvailabilities,
  enPassantTarget: Position | null
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
  const pieceDataWithAttackingSquares = generateAttacksForPieceData(
    pieceData,
    castlingAvailabilities,
    numRanks,
    numFiles,
    enPassantTarget
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

export const getFileLetterFromNumber = (fileNumber: number): string =>
  String.fromCharCode(charCodeOffset + fileNumber);

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
  };
  gameData.pieceData = initializePieceData(
    sections[0],
    numRanks,
    numFiles,
    gameData.castlingAvailabilities,
    gameData.enPassantTarget
  );
  return gameData;
};

export const updatePiecePosition = (
  pieces: Piece[],
  movingPiece: Piece,
  newRank: number,
  newFile: number,
  numRanks: number,
  numFiles: number
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
  newPiece.position.rank = newRank;
  newPiece.position.file = newFile;
  const newPieces = [...pieces];
  newPieces[pieceIndex] = newPiece;
  return newPieces;
};

export const movePieceAndGetGameData = (
  gameData: GameData,
  piece: Piece,
  newRank: number,
  newFile: number,
  numRanks: number,
  numFiles: number
): GameData => {
  // TODO: Update en passant target and castling availabilities.
  // TODO: Make sure the move is actually legal.
  const newGameData: GameData = {
    ...gameData,
    pieceData: {
      white:
        piece.colour === "white"
          ? updatePiecePosition(
              gameData.pieceData.white,
              piece,
              newRank,
              newFile,
              numRanks,
              numFiles
            )
          : gameData.pieceData.white,
      black:
        piece.colour === "black"
          ? updatePiecePosition(
              gameData.pieceData.black,
              piece,
              newRank,
              newFile,
              numRanks,
              numFiles
            )
          : gameData.pieceData.black,
    },
    halfmoveClock: gameData.halfmoveClock + 1,
    fullmoveNumber:
      piece.colour === pieceColourArray[pieceColourArray.length - 1]
        ? gameData.fullmoveNumber + 1
        : gameData.fullmoveNumber,
  };
  newGameData.pieceData = generateAttacksForPieceData(
    newGameData.pieceData,
    newGameData.castlingAvailabilities,
    numRanks,
    numFiles,
    newGameData.enPassantTarget
  );
  return newGameData;
};
