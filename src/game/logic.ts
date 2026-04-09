import {
  type CreateGameOptions,
  type GameAction,
  type GameState,
  type SeatState,
  type ZoneName,
} from "./state.js";

const RNG_A = 1664525;
const RNG_C = 1013904223;
const RNG_M = 0x100000000;

function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, RNG_A) + RNG_C) >>> 0;
    return state / RNG_M;
  };
}

export function getIdValue(id: number | undefined): number {
  if (id == null) return -1;
  return id % 13;
}

export function getCurrentZone(player: SeatState): ZoneName {
  if (player.hand.length > 0) return "hand";
  if (player.up.length > 0) return "up";
  return "down";
}

function getZoneCards(player: SeatState, zone: ZoneName): number[] {
  if (zone === "hand") return player.hand;
  if (zone === "up") return player.up;
  return player.down;
}

function canPlace(value: number, lastValue: number): boolean {
  if (lastValue < 0) return true;
  if (value === 0) return true; // 2
  if (value === 8) return true; // 10
  if (lastValue === 5) return value <= lastValue; // on 7 play under
  return value >= lastValue;
}

function shouldBurn(ids: number[]): boolean {
  if (ids.length === 0) return false;
  if (getIdValue(ids.at(-1)) === 8) return true;
  if (ids.length < 4) return false;
  return new Set(ids.slice(-4).map((id) => getIdValue(id))).size === 1;
}

function cloneState(state: GameState): GameState {
  return {
    config: { ...state.config },
    players: state.players.map((player) => ({
      ...player,
      hand: [...player.hand],
      up: [...player.up],
      down: [...player.down],
    })),
    drawPile: [...state.drawPile],
    discardPile: [...state.discardPile],
    turn: state.turn,
    phase: state.phase,
    swapReady: [...state.swapReady],
    selected: [...state.selected],
    winner: state.winner,
    status: state.status,
  };
}

function shuffleDeck(seed: number): number[] {
  const rng = makeRng(seed);
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j] ?? -1, deck[i] ?? -1];
  }
  return deck;
}

function drawCard(drawPile: number[]): number {
  const id = drawPile.pop();
  if (id == null) throw new Error("draw pile empty");
  return id;
}

function advanceTurn(state: GameState) {
  if (state.status !== "playing") return;
  state.selected = [];
  state.turn = (state.turn + 1) % state.players.length;
}

function refillHandToThree(state: GameState, seatIndex: number) {
  const player = state.players[seatIndex];
  if (!player) return;
  while (player.hand.length < 3 && state.drawPile.length > 0) {
    player.hand.push(drawCard(state.drawPile));
  }
}

function playerHasWon(player: SeatState): boolean {
  return player.hand.length === 0 && player.up.length === 0 && player.down.length === 0;
}

function clearSelection(state: GameState) {
  state.selected = [];
}

function pickupDiscard(state: GameState, seatIndex: number) {
  const player = state.players[seatIndex];
  if (!player) return;
  player.hand.push(...state.discardPile);
  state.discardPile = [];
}

function applyPlayedCards(state: GameState): GameState {
  const seatIndex = state.turn;
  const player = state.players[seatIndex];
  if (!player || state.selected.length === 0) return state;

  const zone = getCurrentZone(player);
  const zoneCards = getZoneCards(player, zone);
  const selectedSet = new Set(state.selected);
  const selectedValid = state.selected.every((id) => zoneCards.includes(id));
  if (!selectedValid) {
    clearSelection(state);
    return state;
  }

  const value = getIdValue(state.selected[0]);
  const lastValue = getIdValue(state.discardPile.at(-1));

  state.discardPile.push(...state.selected);
  const remaining = zoneCards.filter((id) => !selectedSet.has(id));
  if (zone === "hand") player.hand = remaining;
  else if (zone === "up") player.up = remaining;
  else player.down = remaining;

  clearSelection(state);

  let burned = false;
  if (!canPlace(value, lastValue)) {
    pickupDiscard(state, seatIndex);
  } else if (shouldBurn(state.discardPile)) {
    state.discardPile = [];
    burned = true;
  }

  refillHandToThree(state, seatIndex);

  if (playerHasWon(player)) {
    state.status = "finished";
    state.winner = seatIndex;
    return state;
  }

  if (!burned) {
    advanceTurn(state);
  }
  return state;
}

function applyDrawFromPile(state: GameState): GameState {
  const seatIndex = state.turn;
  if (state.drawPile.length === 0) {
    advanceTurn(state);
    return state;
  }
  const id = drawCard(state.drawPile);
  const value = getIdValue(id);
  const lastValue = getIdValue(state.discardPile.at(-1));

  state.discardPile.push(id);
  let burned = false;
  if (!canPlace(value, lastValue)) {
    pickupDiscard(state, seatIndex);
  } else if (shouldBurn(state.discardPile)) {
    state.discardPile = [];
    burned = true;
  }
  clearSelection(state);
  if (!burned) {
    advanceTurn(state);
  }
  return state;
}

function applyPickupDiscard(state: GameState): GameState {
  pickupDiscard(state, state.turn);
  clearSelection(state);
  advanceTurn(state);
  return state;
}

function applySwapSelected(state: GameState): GameState {
  const player = state.players[state.turn];
  if (!player) return state;
  const handCard = state.selected.find((id) => player.hand.includes(id));
  const upCard = state.selected.find((id) => player.up.includes(id));
  if (handCard == null || upCard == null) return state;

  const handIndex = player.hand.indexOf(handCard);
  const upIndex = player.up.indexOf(upCard);
  if (handIndex < 0 || upIndex < 0) return state;

  player.hand[handIndex] = upCard;
  player.up[upIndex] = handCard;
  clearSelection(state);
  return state;
}

function applyReadySwap(state: GameState): GameState {
  clearSelection(state);
  state.swapReady[state.turn] = true;
  if (state.swapReady.every(Boolean)) {
    state.phase = "play";
    state.turn = 0;
    return state;
  }

  const total = state.players.length;
  for (let i = 0; i < total; i++) {
    const nextTurn = (state.turn + i + 1) % total;
    if (!state.swapReady[nextTurn]) {
      state.turn = nextTurn;
      break;
    }
  }
  return state;
}

function scoreOption(
  ids: number[],
  value: number,
  count: number,
  lastValue: number,
  discardPile: number[],
  hasNonWildPlayable: boolean,
): number {
  const nextDiscard = [...discardPile, ...Array.from({ length: count }, () => value)];
  const burn = shouldBurn(nextDiscard);
  const nextTop = burn ? -1 : value;

  const remaining = ids.filter((id) => getIdValue(id) !== value);
  const remainingGroups = new Map<number, number>();
  for (const id of remaining) {
    const v = getIdValue(id);
    remainingGroups.set(v, (remainingGroups.get(v) ?? 0) + 1);
  }

  let futurePlayableGroups = 0;
  let futurePlayableCards = 0;
  for (const [v, amount] of remainingGroups) {
    if (!canPlace(v, nextTop)) continue;
    futurePlayableGroups += 1;
    futurePlayableCards += amount;
  }

  const wildPenalty = (value === 0 || value === 8) && hasNonWildPlayable ? 1.5 : 0;
  const tenBonus = value === 8 ? 1.25 : 0;
  const immediateValue = count * 3;
  const burnValue = burn ? 4 : 0;
  const futureValue = futurePlayableGroups * 1.5 + futurePlayableCards * 0.5;
  const openPenalty = lastValue < 0 && (value === 0 || value === 8) ? 1 : 0;
  return immediateValue + burnValue + tenBonus + futureValue - wildPenalty - openPenalty;
}

function chooseStrongest(ids: number[], discardPile: number[]): number[] {
  if (ids.length === 0) return [];
  const grouped = new Map<number, number[]>();
  for (const id of ids) {
    const value = getIdValue(id);
    const group = grouped.get(value);
    if (group == null) grouped.set(value, [id]);
    else group.push(id);
  }

  const lastValue = getIdValue(discardPile.at(-1));
  const playableValues = [...grouped.keys()].filter((value) => canPlace(value, lastValue));
  if (playableValues.length === 0) return [];
  const hasNonWildPlayable = playableValues.some((value) => value !== 0 && value !== 8);

  let bestScore = -Infinity;
  let bestIds: number[] = [];
  for (const value of playableValues) {
    const option = grouped.get(value) ?? [];
    const score = scoreOption(
      ids,
      value,
      option.length,
      lastValue,
      discardPile,
      hasNonWildPlayable,
    );
    if (
      score > bestScore ||
      (score === bestScore && option.length > bestIds.length) ||
      (score === bestScore &&
        option.length === bestIds.length &&
        value > getIdValue(bestIds[0]))
    ) {
      bestScore = score;
      bestIds = [...option];
    }
  }
  return bestIds;
}

function applyAiTurn(state: GameState): GameState {
  const player = state.players[state.turn];
  if (!player) return state;
  if (state.phase === "swap") {
    const handCount = player.hand.length;
    const upCount = player.up.length;
    const sorted = [...player.hand, ...player.up].sort((a, b) => getIdValue(b) - getIdValue(a));
    player.hand = sorted.slice(0, handCount);
    player.up = sorted.slice(handCount, handCount + upCount);
    clearSelection(state);
    return applyReadySwap(state);
  }
  const zone = getCurrentZone(player);
  const ids = [...getZoneCards(player, zone)];
  const best = chooseStrongest(ids, state.discardPile);
  if (best.length > 0) {
    state.selected = [...best];
    return applyPlayedCards(state);
  }
  if (state.drawPile.length > 0) return applyDrawFromPile(state);
  return applyPickupDiscard(state);
}

export function createInitialGameState(options: CreateGameOptions): GameState {
  const drawPile = shuffleDeck(options.config.seed);
  const players: SeatState[] = options.seats.map((seat) => ({
    name: seat.name,
    isAI: seat.isAI,
    isLocal: seat.isLocal,
    hand: [],
    up: [],
    down: [],
  }));

  for (let i = 0; i < 3; i++) {
    players.forEach((player) => player.down.push(drawCard(drawPile)));
  }
  for (let i = 0; i < 3; i++) {
    players.forEach((player) => player.up.push(drawCard(drawPile)));
  }
  for (let i = 0; i < 3; i++) {
    players.forEach((player) => player.hand.push(drawCard(drawPile)));
  }

  return {
    config: { ...options.config },
    players,
    drawPile,
    discardPile: [],
    turn: 0,
    phase: "swap",
    swapReady: players.map(() => false),
    selected: [],
    winner: null,
    status: "playing",
  };
}

export function reduceGameState(state: GameState, action: GameAction): GameState {
  if (state.status !== "playing") return state;
  const next = cloneState(state);
  const currentPlayer = next.players[next.turn];
  if (!currentPlayer) return state;

  if (action.type === "selectCard") {
    if (next.phase === "swap") {
      const inHand = currentPlayer.hand.includes(action.cardID);
      const inUp = currentPlayer.up.includes(action.cardID);
      if (!inHand && !inUp) return state;

      if (next.selected.includes(action.cardID)) {
        next.selected = next.selected.filter((id) => id !== action.cardID);
        return next;
      }

      const selectedHand = next.selected.find((id) => currentPlayer.hand.includes(id));
      const selectedUp = next.selected.find((id) => currentPlayer.up.includes(id));

      if (inHand && selectedHand != null) {
        next.selected = next.selected.filter((id) => id !== selectedHand);
      }
      if (inUp && selectedUp != null) {
        next.selected = next.selected.filter((id) => id !== selectedUp);
      }

      next.selected.push(action.cardID);
      return next;
    }

    const zone = getCurrentZone(currentPlayer);
    const cards = getZoneCards(currentPlayer, zone);
    if (!cards.includes(action.cardID)) return state;
    if (zone === "down") {
      if (next.selected.includes(action.cardID)) next.selected = [];
      else next.selected = [action.cardID];
      return next;
    }
    if (next.selected.includes(action.cardID)) {
      next.selected = next.selected.filter((id) => id !== action.cardID);
      return next;
    }
    if (next.selected.length === 0) {
      next.selected.push(action.cardID);
      return next;
    }
    const activeValue = getIdValue(next.selected[0]);
    if (getIdValue(action.cardID) !== activeValue) return state;
    next.selected.push(action.cardID);
    return next;
  }

  if (action.type === "sortHand") {
    currentPlayer.hand.sort((a, b) => getIdValue(b) - getIdValue(a));
    clearSelection(next);
    return next;
  }

  if (action.type === "swapSelected") {
    if (next.phase !== "swap") return state;
    return applySwapSelected(next);
  }

  if (action.type === "readySwap") {
    if (next.phase !== "swap") return state;
    return applyReadySwap(next);
  }

  if (action.type === "playSelected") {
    if (next.phase !== "play") return state;
    return applyPlayedCards(next);
  }

  if (action.type === "drawFromPile") {
    if (next.phase !== "play") return state;
    return applyDrawFromPile(next);
  }

  if (action.type === "pickupDiscard") {
    if (next.phase !== "play") return state;
    return applyPickupDiscard(next);
  }

  if (action.type === "aiTurn") {
    return applyAiTurn(next);
  }

  return state;
}

export function canLocalSeatAct(state: GameState, localSeat: number, mode: "local" | "online"): boolean {
  if (state.status !== "playing") return false;
  const turnPlayer = state.players[state.turn];
  if (!turnPlayer || turnPlayer.isAI) return false;
  if (mode === "local") return true;
  return state.turn === localSeat;
}
