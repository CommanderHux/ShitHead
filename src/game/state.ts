export type GameMode = "local" | "online";
export type ZoneName = "hand" | "up" | "down";

export interface SeatSetup {
  name: string;
  isAI: boolean;
  isLocal: boolean;
}

export interface MatchConfig {
  mode: GameMode;
  seed: number;
  roomCode: string;
  targetPlayers: number;
  aiFill: boolean;
}

export interface SeatState {
  name: string;
  isAI: boolean;
  isLocal: boolean;
  hand: number[];
  up: number[];
  down: number[];
}

export interface GameState {
  config: MatchConfig;
  players: SeatState[];
  drawPile: number[];
  discardPile: number[];
  turn: number;
  phase: "swap" | "play";
  swapReady: boolean[];
  selected: number[];
  winner: number | null;
  status: "playing" | "finished";
}

export interface CreateGameOptions {
  config: MatchConfig;
  seats: SeatSetup[];
}

export type GameAction =
  | { type: "selectCard"; cardID: number }
  | { type: "sortHand" }
  | { type: "swapSelected" }
  | { type: "readySwap" }
  | { type: "playSelected" }
  | { type: "drawFromPile" }
  | { type: "pickupDiscard" }
  | { type: "aiTurn" };
