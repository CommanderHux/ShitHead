import { canLocalSeatAct, createInitialGameState, getCurrentZone, reduceGameState } from "./game/logic.js";
import type { GameAction, GameMode, GameState, SeatSetup } from "./game/state.js";
import { OnlineSession } from "./netplay/online.js";
import {
  ACTION_BUTTON_H,
  ACTION_BUTTON_PRIMARY_Y_FROM_BOTTOM,
  ACTION_BUTTON_SECONDARY_Y_FROM_BOTTOM,
  ACTION_BUTTON_W,
  ACTION_BUTTON_X,
  CARD_COUNT_LABEL_OFFSET_Y,
  CARD_H,
  CARD_SELECTED_OFFSET_Y,
  CARD_STACK_X_GAP,
  CARD_STACK_Y_GAP,
  CARD_W,
  COLOR_BUTTON_BG,
  COLOR_BUTTON_BG_PRESSED,
  COLOR_GAME_BACKGROUND,
  COLOR_OVERLAY,
  COLOR_SETUP_BACKGROUND,
  COLOR_TEXT_BLACK,
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
  COLOR_TEXT_WHITE,
  COLOR_TURN_HIGHLIGHT,
  DISCARD_PILE_LABEL_X,
  DISCARD_PILE_LABEL_Y,
  DISCARD_PILE_X,
  DISCARD_PILE_Y,
  DRAW_PILE_LABEL_X,
  DRAW_PILE_LABEL_Y,
  DRAW_PILE_X,
  DRAW_PILE_Y,
  FONT_BODY,
  FONT_TITLE,
  MENU_BUTTON_H,
  MENU_BUTTON_W,
  MENU_BUTTON_X,
  MENU_BUTTON_Y_FROM_BOTTOM,
  PLAYER_NAME_OFFSET_Y,
  PLAYER_ZONE_HAND_OFFSET_Y,
  PLAYER_ZONE_LABEL_OFFSET_Y,
  PLAYER_ZONE_UP_OFFSET_Y,
  SEAT_LAYOUT,
  SETUP_AI_FILL_H,
  SETUP_AI_FILL_W,
  SETUP_AI_FILL_X,
  SETUP_AI_FILL_Y,
  SETUP_CANCEL_ONLINE_H,
  SETUP_CANCEL_ONLINE_W,
  SETUP_CANCEL_ONLINE_X,
  SETUP_CANCEL_ONLINE_Y,
  SETUP_MODE_LOCAL_H,
  SETUP_MODE_LOCAL_W,
  SETUP_MODE_LOCAL_X,
  SETUP_MODE_LOCAL_Y,
  SETUP_MODE_ONLINE_H,
  SETUP_MODE_ONLINE_W,
  SETUP_MODE_ONLINE_X,
  SETUP_MODE_ONLINE_Y,
  SETUP_NAME_H,
  SETUP_NAME_W,
  SETUP_NAME_X,
  SETUP_NAME_Y,
  SETUP_PLAYERS_H,
  SETUP_PLAYERS_W,
  SETUP_PLAYERS_X,
  SETUP_PLAYERS_Y,
  SETUP_ROLE_HOST_H,
  SETUP_ROLE_HOST_W,
  SETUP_ROLE_HOST_X,
  SETUP_ROLE_HOST_Y,
  SETUP_ROLE_JOIN_H,
  SETUP_ROLE_JOIN_W,
  SETUP_ROLE_JOIN_X,
  SETUP_ROLE_JOIN_Y,
  SETUP_ROOM_H,
  SETUP_ROOM_W,
  SETUP_ROOM_X,
  SETUP_ROOM_Y,
  SETUP_START_H,
  SETUP_START_W,
  SETUP_START_X,
  SETUP_START_Y,
  SETUP_STATUS_X,
  SETUP_STATUS_Y_FROM_BOTTOM,
  SETUP_TITLE_Y,
  STATUS_LINE_X,
  STATUS_LINE_Y,
  TURN_HIGHLIGHT_H,
  TURN_HIGHLIGHT_W,
  TURN_HIGHLIGHT_X_OFFSET,
  TURN_HIGHLIGHT_Y_OFFSET,
} from "./visuals/cardSize.js";
import { CARD_BACK_ID, getCachedUnicodeCardImage, preloadUnicodeCardImages } from "./visuals/unicodeCards.js";

export const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const cxt = canvas.getContext("2d");
if (!cxt) throw new Error("couldn't find canvas context");
export const context = cxt;

let dpr = window.devicePixelRatio || 1;

// Legacy exports kept so older modules still typecheck.
export let stack: Set<any> = new Set();
export let drawPile: { cardIDs: number[] } = { cardIDs: [] };
export let discardPile: { cardIDs: number[] } = { cardIDs: [] };

export function getPlayer(): any {
  if (!gameState) return null;
  return gameState.players[gameState.turn] ?? null;
}

export function getElement<T>(set: Set<T>): T {
  const v = set.values().next().value;
  if (v == null) throw Error(`Expected element in Set, ${set}, found ${v}`);
  return v;
}

export function nextPlayer() {
  if (!gameState || gameState.status !== "playing") return;
  gameState = {
    ...gameState,
    selected: [],
    turn: (gameState.turn + 1) % gameState.players.length,
  };
  syncLegacyPiles(gameState);
  scheduleAiTurn();
}

type SetupRole = "host" | "join";
interface SetupState {
  mode: GameMode;
  role: SetupRole;
  roomCode: string;
  name: string;
  playerCount: number;
  aiFill: boolean;
}

interface HitTarget {
  x: number;
  y: number;
  w: number;
  h: number;
  key?: string;
  onDown: () => void;
}

const setupState: SetupState = {
  mode: "local",
  role: "host",
  roomCode: "SHITHEAD",
  name: "Player",
  playerCount: 2,
  aiFill: true,
};

let scene: "setup" | "game" = "setup";
let statusLine = "Select mode and start.";
let gameState: GameState | null = null;
let localSeat = 0;
let onlineSession: OnlineSession | null = null;
let aiTimer: number | null = null;
let hitTargets: HitTarget[] = [];
const pressedKeys = new Set<string>();

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
}

function setupCanvas() {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("blur", onMouseUp);
}

setupCanvas();

void boot();
async function boot() {
  await preloadUnicodeCardImages();
  requestAnimationFrame(update);
}

function resetOnlineSession() {
  if (onlineSession) {
    onlineSession.dispose();
    onlineSession = null;
  }
}

function clearAiTimer() {
  if (aiTimer != null) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
}

function startLocalGame() {
  resetOnlineSession();
  clearAiTimer();

  const seats: SeatSetup[] = [];
  for (let i = 0; i < setupState.playerCount; i++) {
    if (i === 0) {
      seats.push({ name: setupState.name || "Player", isAI: false, isLocal: true });
      continue;
    }
    if (setupState.aiFill) {
      seats.push({ name: `AI ${i}`, isAI: true, isLocal: false });
    } else {
      seats.push({ name: `Player ${i + 1}`, isAI: false, isLocal: true });
    }
  }

  const seed = (Date.now() ^ hashString(setupState.name)) >>> 0;
  gameState = createInitialGameState({
    config: {
      mode: "local",
      seed,
      roomCode: setupState.roomCode,
      targetPlayers: setupState.playerCount,
      aiFill: setupState.aiFill,
    },
    seats,
  });
  localSeat = 0;
  scene = "game";
  statusLine = "Swap phase: choose a hand card and an up card, then press Swap or Ready.";
  syncLegacyPiles(gameState);
  scheduleAiTurn();
}

function buildHostSeats(remotes: Array<{ name: string }>): SeatSetup[] {
  const seats: SeatSetup[] = [{ name: setupState.name || "Host", isAI: false, isLocal: true }];
  remotes.forEach((remote, idx) => {
    seats.push({ name: remote.name || `Player ${idx + 2}`, isAI: false, isLocal: false });
  });

  const humanCount = seats.length;
  const target = Math.min(4, Math.max(2, setupState.playerCount));
  const aiCount = setupState.aiFill ? Math.max(0, target - humanCount) : 0;
  for (let i = 0; i < aiCount; i++) {
    seats.push({ name: `AI ${i + 1}`, isAI: true, isLocal: false });
  }
  return seats;
}

function startOnlineGame() {
  resetOnlineSession();
  clearAiTimer();
  statusLine = "Starting online session...";

  const isHost = setupState.role === "host";
  const session = new OnlineSession(isHost, {
    roomCode: setupState.roomCode,
    displayName: setupState.name || "Player",
    maxPlayers: setupState.playerCount,
    onStatus: (message) => {
      statusLine = message;
    },
    onClientStarted: (state, seat) => {
      gameState = state;
      localSeat = seat;
      scene = "game";
      syncLegacyPiles(state);
      statusLine = `Connected as seat ${seat + 1}. Swap phase started.`;
    },
    onClientState: (state) => {
      gameState = state;
      syncLegacyPiles(state);
    },
    onHostBuildInitialState: (remotes) => {
      const seats = buildHostSeats(remotes);
      const seed = (Date.now() ^ hashString(setupState.roomCode) ^ hashString(setupState.name)) >>> 0;
      const initial = createInitialGameState({
        config: {
          mode: "online",
          seed,
          roomCode: setupState.roomCode,
          targetPlayers: setupState.playerCount,
          aiFill: setupState.aiFill,
        },
        seats,
      });
      gameState = initial;
      localSeat = 0;
      scene = "game";
      syncLegacyPiles(initial);
      statusLine = "Swap phase started.";
      scheduleAiTurn();
      return initial;
    },
    onHostAction: (seat, action) => {
      applyHostAction(seat, action);
    },
  });

  session.start();
  onlineSession = session;
}

function applyState(nextState: GameState, broadcast = false) {
  const previousPhase = gameState?.phase;
  gameState = nextState;
  syncLegacyPiles(nextState);

  if (previousPhase === "swap" && nextState.phase === "play" && nextState.status === "playing") {
    statusLine = "Play phase started.";
  }

  if (nextState.status === "finished") {
    const winnerName = nextState.players[nextState.winner ?? 0]?.name ?? "Unknown";
    statusLine = `${winnerName} wins.`;
  }

  if (broadcast && onlineSession?.isHost) {
    onlineSession.broadcastState(nextState);
  }

  scheduleAiTurn();
}

function applyHostAction(seat: number, action: GameAction) {
  if (!gameState || gameState.status !== "playing") return;
  if (gameState.turn !== seat) return;
  const current = gameState.players[seat];
  if (!current || current.isAI) return;
  const nextState = reduceGameState(gameState, action);
  applyState(nextState, true);
}

function dispatchAction(action: GameAction) {
  if (!gameState || gameState.status !== "playing") return;
  if (!canActLocally()) return;

  if (setupState.mode === "online") {
    if (!onlineSession) return;
    if (onlineSession.isHost) {
      applyHostAction(localSeat, action);
    } else {
      onlineSession.sendAction(action);
    }
    return;
  }

  const nextState = reduceGameState(gameState, action);
  applyState(nextState, false);
}

function scheduleAiTurn() {
  if (aiTimer != null) return;
  if (!gameState || gameState.status !== "playing") return;

  const current = gameState.players[gameState.turn];
  if (!current?.isAI) return;

  if (setupState.mode === "online" && !onlineSession?.isHost) return;

  aiTimer = window.setTimeout(() => {
    aiTimer = null;
    if (!gameState || gameState.status !== "playing") return;
    const currentAgain = gameState.players[gameState.turn];
    if (!currentAgain?.isAI) return;

    const nextState = reduceGameState(gameState, { type: "aiTurn" });
    applyState(nextState, setupState.mode === "online" && !!onlineSession?.isHost);
  }, 360);
}

function syncLegacyPiles(state: GameState) {
  drawPile.cardIDs = [...state.drawPile];
  discardPile.cardIDs = [...state.discardPile];
}

function canActLocally(): boolean {
  if (!gameState) return false;
  return canLocalSeatAct(gameState, localSeat, setupState.mode);
}

function getSeatDisplayIndex(realSeat: number): number {
  if (!gameState) return realSeat;
  const total = gameState.players.length;
  if (setupState.mode === "local") return realSeat;
  return (realSeat - localSeat + total) % total;
}

function getSeatAnchor(displaySeat: number, totalPlayers: number): { x: number; y: number } {
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;

  if (totalPlayers === 2) {
    if (displaySeat === 0) {
      return {
        x: width / 2 + SEAT_LAYOUT.two.bottomXCenterOffset,
        y: height - SEAT_LAYOUT.two.bottomYFromBottom,
      };
    }
    return { x: width / 2 + SEAT_LAYOUT.two.topXCenterOffset, y: SEAT_LAYOUT.two.topY };
  }

  if (totalPlayers === 3) {
    if (displaySeat === 0) {
      return {
        x: width / 2 + SEAT_LAYOUT.three.bottomXCenterOffset,
        y: height - SEAT_LAYOUT.three.bottomYFromBottom,
      };
    }
    if (displaySeat === 1) return { x: SEAT_LAYOUT.three.leftX, y: SEAT_LAYOUT.three.leftY };
    return { x: width - SEAT_LAYOUT.three.rightXFromRight, y: SEAT_LAYOUT.three.rightY };
  }

  if (displaySeat === 0) {
    return {
      x: width / 2 + SEAT_LAYOUT.four.bottomXCenterOffset,
      y: height - SEAT_LAYOUT.four.bottomYFromBottom,
    };
  }
  if (displaySeat === 1) return { x: width / 2 + SEAT_LAYOUT.four.topXCenterOffset, y: SEAT_LAYOUT.four.topY };
  if (displaySeat === 2) return { x: SEAT_LAYOUT.four.leftX, y: height / 2 + SEAT_LAYOUT.four.leftYFromCenter };
  return {
    x: width - SEAT_LAYOUT.four.rightXFromRight,
    y: height / 2 + SEAT_LAYOUT.four.rightYFromCenter,
  };
}

function drawCardImage(cardID: number, x: number, y: number) {
  const img = getCachedUnicodeCardImage(cardID);
  if (img) {
    context.drawImage(img, x, y, CARD_W, CARD_H);
    return;
  }
  context.fillStyle = COLOR_TEXT_WHITE;
  context.strokeStyle = COLOR_TEXT_BLACK;
  context.fillRect(x, y, CARD_W, CARD_H);
  context.strokeRect(x, y, CARD_W, CARD_H);
}

function drawDeckZone(
  seatIndex: number,
  zone: "down" | "up" | "hand",
  cards: number[],
  x: number,
  y: number,
) {
  const maxVisible = zone === "hand" ? cards.length : Math.min(3, cards.length);
  const isTurnSeat = gameState?.turn === seatIndex;
  const turnPlayer = gameState?.players[gameState.turn ?? 0];
  const currentTurnZone = turnPlayer ? getCurrentZone(turnPlayer) : "hand";
  const isSwapPhase = gameState?.phase === "swap";
  const canSelect = canActLocally() && isTurnSeat && (
    isSwapPhase ? zone === "hand" || zone === "up" : currentTurnZone === zone
  );

  for (let i = 0; i < maxVisible; i++) {
    const cardID = cards[cards.length - 1 - i];
    if (cardID == null) continue;

    const cardX = x + (i % 5) * CARD_STACK_X_GAP;
    const cardY = y + Math.floor(i / 5) * CARD_STACK_Y_GAP;
    const isSelected = !!gameState?.selected.includes(cardID);
    const drawY = isSelected ? cardY : cardY + CARD_SELECTED_OFFSET_Y;

    const seat = gameState?.players[seatIndex];
    const shouldHide =
      zone === "down" ||
      (zone === "hand" && (
        seat?.isAI === true ||
        (setupState.mode === "online" && seatIndex !== localSeat)
      ));

    drawCardImage(shouldHide ? CARD_BACK_ID : cardID, cardX, drawY);

    if (canSelect) {
      hitTargets.push({
        x: cardX,
        y: drawY,
        w: CARD_W,
        h: CARD_H,
        onDown: () => dispatchAction({ type: "selectCard", cardID }),
      });
    }
  }

  context.fillStyle = COLOR_TEXT_BLACK;
  context.textAlign = "right";
  context.textBaseline = "top";
  context.fillText(`${cards.length}`, x, y + CARD_COUNT_LABEL_OFFSET_Y);
}

function addButton(x: number, y: number, w: number, h: number, key: string, label: string, onDown: () => void) {
  const pressed = pressedKeys.has(key);
  context.fillStyle = pressed ? COLOR_BUTTON_BG_PRESSED : COLOR_BUTTON_BG;
  context.strokeStyle = COLOR_BUTTON_BG;
  context.fillRect(x, y, w, h);
  context.strokeRect(x, y, w, h);

  context.fillStyle = COLOR_TEXT_WHITE;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, x + w / 2, y + h / 2);

  hitTargets.push({
    x,
    y,
    w,
    h,
    key,
    onDown,
  });
}

function drawGameScene() {
  if (!gameState) return;
  const state = gameState;

  context.fillStyle = COLOR_GAME_BACKGROUND;
  context.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  // Piles
  if (state.drawPile.length > 0) {
    drawCardImage(CARD_BACK_ID, DRAW_PILE_X, DRAW_PILE_Y);
  }
  context.fillStyle = COLOR_TEXT_BLACK;
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText(`Draw: ${state.drawPile.length}`, DRAW_PILE_LABEL_X, DRAW_PILE_LABEL_Y);

  if (state.discardPile.length > 0) {
    drawCardImage(state.discardPile.at(-1) ?? CARD_BACK_ID, DISCARD_PILE_X, DISCARD_PILE_Y);
  } else {
    context.strokeStyle = COLOR_TEXT_BLACK;
    context.strokeRect(DISCARD_PILE_X, DISCARD_PILE_Y, CARD_W, CARD_H);
  }
  context.fillStyle = COLOR_TEXT_BLACK;
  context.fillText(`Discard: ${state.discardPile.length}`, DISCARD_PILE_LABEL_X, DISCARD_PILE_LABEL_Y);

  if (canActLocally() && state.phase === "play") {
    if (state.drawPile.length > 0) {
      hitTargets.push({
        x: DRAW_PILE_X,
        y: DRAW_PILE_Y,
        w: CARD_W,
        h: CARD_H,
        onDown: () => dispatchAction({ type: "drawFromPile" }),
      });
    }
    hitTargets.push({
      x: DISCARD_PILE_X,
      y: DISCARD_PILE_Y,
      w: CARD_W,
      h: CARD_H,
      onDown: () => dispatchAction({ type: "pickupDiscard" }),
    });
  }

  // Players
  state.players.forEach((player, seatIndex) => {
    const displaySeat = getSeatDisplayIndex(seatIndex);
    const anchor = getSeatAnchor(displaySeat, state.players.length);

    const zone = getCurrentZone(player);
    const isTurn = state.turn === seatIndex;

    context.fillStyle = COLOR_TEXT_BLACK;
    context.textAlign = "left";
    context.textBaseline = "top";
    const me = setupState.mode === "online" && seatIndex === localSeat ? " (You)" : "";
    const turnMark = isTurn ? " <- turn" : "";
    context.fillText(`${player.name}${me}${turnMark}`, anchor.x, anchor.y + PLAYER_NAME_OFFSET_Y);

    if (isTurn && state.status === "playing") {
      context.strokeStyle = COLOR_TURN_HIGHLIGHT;
      context.strokeRect(
        anchor.x + TURN_HIGHLIGHT_X_OFFSET,
        anchor.y + TURN_HIGHLIGHT_Y_OFFSET,
        TURN_HIGHLIGHT_W,
        TURN_HIGHLIGHT_H,
      );
    }

    drawDeckZone(seatIndex, "down", player.down, anchor.x, anchor.y);
    drawDeckZone(seatIndex, "up", player.up, anchor.x, anchor.y + PLAYER_ZONE_UP_OFFSET_Y);
    drawDeckZone(seatIndex, "hand", player.hand, anchor.x, anchor.y + PLAYER_ZONE_HAND_OFFSET_Y);

    context.fillStyle = COLOR_TEXT_SECONDARY;
    context.textAlign = "left";
    context.fillText(`Zone: ${zone}`, anchor.x, anchor.y + PLAYER_ZONE_LABEL_OFFSET_Y);
  });

  const h = canvas.height / dpr;
  if (state.phase === "swap") {
    addButton(
      ACTION_BUTTON_X,
      h - ACTION_BUTTON_PRIMARY_Y_FROM_BOTTOM,
      ACTION_BUTTON_W,
      ACTION_BUTTON_H,
      "swap",
      "Swap",
      () => dispatchAction({ type: "swapSelected" }),
    );
    addButton(
      ACTION_BUTTON_X,
      h - ACTION_BUTTON_SECONDARY_Y_FROM_BOTTOM,
      ACTION_BUTTON_W,
      ACTION_BUTTON_H,
      "ready",
      "Ready",
      () => dispatchAction({ type: "readySwap" }),
    );
  } else {
    addButton(
      ACTION_BUTTON_X,
      h - ACTION_BUTTON_PRIMARY_Y_FROM_BOTTOM,
      ACTION_BUTTON_W,
      ACTION_BUTTON_H,
      "play",
      "Play",
      () => dispatchAction({ type: "playSelected" }),
    );
    addButton(
      ACTION_BUTTON_X,
      h - ACTION_BUTTON_SECONDARY_Y_FROM_BOTTOM,
      ACTION_BUTTON_W,
      ACTION_BUTTON_H,
      "sort",
      "Sort",
      () => dispatchAction({ type: "sortHand" }),
    );
  }
  addButton(MENU_BUTTON_X, h - MENU_BUTTON_Y_FROM_BOTTOM, MENU_BUTTON_W, MENU_BUTTON_H, "menu", "Main Menu", () => {
    clearAiTimer();
    resetOnlineSession();
    scene = "setup";
    gameState = null;
    statusLine = "Returned to menu.";
  });

  context.fillStyle = COLOR_TEXT_BLACK;
  context.textAlign = "left";
  context.textBaseline = "top";
  const phaseLabel = state.phase === "swap" ? "Phase: Swap" : "Phase: Play";
  context.fillText(`${phaseLabel} | ${statusLine}`, STATUS_LINE_X, STATUS_LINE_Y);

  if (state.status === "finished") {
    context.fillStyle = COLOR_OVERLAY;
    context.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    context.fillStyle = COLOR_TEXT_WHITE;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const winnerName = state.players[state.winner ?? 0]?.name ?? "Unknown";
    context.fillText(`${winnerName} wins`, canvas.width / dpr / 2, canvas.height / dpr / 2);
  }
}

function drawSetupScene() {
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  context.fillStyle = COLOR_SETUP_BACKGROUND;
  context.fillRect(0, 0, width, height);

  context.fillStyle = COLOR_TEXT_PRIMARY;
  context.textAlign = "center";
  context.textBaseline = "top";
  context.font = FONT_TITLE;
  context.fillText("ShitHead - Setup", width / 2, SETUP_TITLE_Y);

  context.font = FONT_BODY;

  addButton(SETUP_MODE_LOCAL_X, SETUP_MODE_LOCAL_Y, SETUP_MODE_LOCAL_W, SETUP_MODE_LOCAL_H, "mode-local", `Mode: Local`, () => {
    setupState.mode = "local";
    statusLine = "Local mode selected.";
  });
  addButton(
    SETUP_MODE_ONLINE_X,
    SETUP_MODE_ONLINE_Y,
    SETUP_MODE_ONLINE_W,
    SETUP_MODE_ONLINE_H,
    "mode-online",
    `Mode: Online`,
    () => {
      setupState.mode = "online";
      statusLine = "Online mode selected.";
    },
  );

  if (setupState.mode === "online") {
    addButton(SETUP_ROLE_HOST_X, SETUP_ROLE_HOST_Y, SETUP_ROLE_HOST_W, SETUP_ROLE_HOST_H, "role-host", "Role: Host", () => {
      setupState.role = "host";
      statusLine = "Hosting selected.";
    });
    addButton(SETUP_ROLE_JOIN_X, SETUP_ROLE_JOIN_Y, SETUP_ROLE_JOIN_W, SETUP_ROLE_JOIN_H, "role-join", "Role: Join", () => {
      setupState.role = "join";
      statusLine = "Join selected.";
    });
  }

  addButton(SETUP_NAME_X, SETUP_NAME_Y, SETUP_NAME_W, SETUP_NAME_H, "name", `Name: ${setupState.name}`, () => {
    const next = window.prompt("Display name", setupState.name);
    if (next != null && next.trim().length > 0) setupState.name = next.trim();
  });

  addButton(SETUP_ROOM_X, SETUP_ROOM_Y, SETUP_ROOM_W, SETUP_ROOM_H, "room", `Room: ${setupState.roomCode}`, () => {
    const next = window.prompt("Room code", setupState.roomCode);
    if (next != null && next.trim().length > 0) setupState.roomCode = next.trim().toUpperCase();
  });

  addButton(
    SETUP_PLAYERS_X,
    SETUP_PLAYERS_Y,
    SETUP_PLAYERS_W,
    SETUP_PLAYERS_H,
    "players",
    `Players: ${setupState.playerCount}`,
    () => {
      setupState.playerCount += 1;
      if (setupState.playerCount > 4) setupState.playerCount = 2;
    },
  );

  addButton(SETUP_AI_FILL_X, SETUP_AI_FILL_Y, SETUP_AI_FILL_W, SETUP_AI_FILL_H, "ai-fill", `AI Fill: ${setupState.aiFill ? "On" : "Off"}`, () => {
    setupState.aiFill = !setupState.aiFill;
  });

  const startLabel =
    setupState.mode === "local"
      ? "Start Local"
      : setupState.role === "host"
        ? "Start Online Host"
        : "Start Online Join";

  addButton(SETUP_START_X, SETUP_START_Y, SETUP_START_W, SETUP_START_H, "start", startLabel, () => {
    if (setupState.mode === "local") startLocalGame();
    else startOnlineGame();
  });

  if (onlineSession && setupState.mode === "online") {
    addButton(
      SETUP_CANCEL_ONLINE_X,
      SETUP_CANCEL_ONLINE_Y,
      SETUP_CANCEL_ONLINE_W,
      SETUP_CANCEL_ONLINE_H,
      "cancel-online",
      "Cancel Online Session",
      () => {
        resetOnlineSession();
        statusLine = "Cancelled online session.";
      },
    );
  }

  context.fillStyle = COLOR_TEXT_PRIMARY;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(statusLine, SETUP_STATUS_X, height - SETUP_STATUS_Y_FROM_BOTTOM);
}

function update() {
  hitTargets = [];
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = FONT_BODY;

  if (scene === "setup") drawSetupScene();
  else drawGameScene();

  requestAnimationFrame(update);
}

function inRange(x: number, y: number, xi: number, yi: number, w: number, h: number): boolean {
  if (x < xi) return false;
  if (y < yi) return false;
  if (x > xi + w) return false;
  if (y > yi + h) return false;
  return true;
}

function getMousePositionInCanvasSpace(mouse: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }
  const logicalWidth = canvas.width / dpr;
  const logicalHeight = canvas.height / dpr;
  const x = ((mouse.clientX - rect.left) / rect.width) * logicalWidth;
  const y = ((mouse.clientY - rect.top) / rect.height) * logicalHeight;
  return { x, y };
}

export function onMouseDown(mouse: MouseEvent) {
  if (mouse.button !== 0) return;
  const { x, y } = getMousePositionInCanvasSpace(mouse);
  const targets = [...hitTargets].reverse();
  for (const target of targets) {
    if (!inRange(x, y, target.x, target.y, target.w, target.h)) continue;
    if (target.key) pressedKeys.add(target.key);
    target.onDown();
    break;
  }
}

export function onMouseUp(_mouse?: MouseEvent | Event) {
  pressedKeys.clear();
}
