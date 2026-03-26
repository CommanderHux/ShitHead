//@ts-check

/**
 * p_Deck is a positive deck, if x :- p_Deck, it exists in that deck
 * @typedef {number[]} p_Deck
 * n_Deck is a negative deck, if x :- n_Deck, it does not exist in that deck
 * @typedef {number[]} n_Deck
 * @typedef {{up: p_Deck, down: p_Deck, play: p_Deck}} PlayerHand
 * @typedef {{token: string, name: string, hand: PlayerHand, isBot?: boolean, swapReady?: boolean}} PlayerState
 */

const SERVER_URL = "wss://demoserver.p5party.org";
const APP_NAME = "shithead-party-demo";
const RULES_URL = "play-rules.json";
const TOTAL_CARDS = 52;
const INITIAL_HAND_SIZE = 3;
const CARDS_PER_PLAYER = INITIAL_HAND_SIZE * 3;
const BOT_ACTION_DELAY_MS = 1600;
const BOT_TURN_HANDOFF_DELAY_MS = 300;
const OFFLINE_AI_COUNT = 3;

let shared;
let me;
let guests;
let isOfflineMode = false;

let playerName = "";
let roomName = "";
let playerToken = "";
let lastAppliedVersion = -1;
let statusMessage = "Waiting for room details...";
let localStatusMessage = "";
let localStatusExpiresAt = 0;
/** @type {{zone: "up" | "play", index: number} | null} */
let selectedSwap = null;
/** @type {number[]} */
let selectedPlayCardIDs = [];
let playRules = createDefaultPlayRules();
let lastBotActionAt = 0;

/** @type {n_Deck} */
let drawDeck;
/** @type {p_Deck} */
let discard;

/** @type {{setupScreen: HTMLElement | null, playScreen: HTMLElement | null, canvasShell: HTMLElement | null, roomLabel: HTMLElement | null, statusLabel: HTMLElement | null, playStatusLabel: HTMLElement | null, hostLabel: HTMLElement | null, returnButton: HTMLButtonElement | null, offlineButton: HTMLButtonElement | null, addAiButton: HTMLButtonElement | null, removeAiButton: HTMLButtonElement | null, startButton: HTMLButtonElement | null, resetButton: HTMLButtonElement | null, finishSwapButton: HTMLButtonElement | null, playSelectedButton: HTMLButtonElement | null, pickupDiscardButton: HTMLButtonElement | null}} */
let ui = {
  setupScreen: null,
  playScreen: null,
  canvasShell: null,
  roomLabel: null,
  statusLabel: null,
  playStatusLabel: null,
  hostLabel: null,
  returnButton: null,
  offlineButton: null,
  addAiButton: null,
  removeAiButton: null,
  startButton: null,
  resetButton: null,
  finishSwapButton: null,
  playSelectedButton: null,
  pickupDiscardButton: null,
};

function preload() {}

async function initGame() {
  let { roomID, nameID, mode } = await readRoomName();
  roomName = roomID;
  playerName = nameID;
  playerToken = createPlayerToken();
  playRules = await loadPlayRules();
  setScreenMode("play");

  isOfflineMode = mode === "offline";

  if (isOfflineMode) {
    initOfflineGame();
  } else {
    partyConnect(SERVER_URL, APP_NAME, roomName);

    shared = partyLoadShared("globals", {
      /** @type {n_Deck} */ draw: [],
      /** @type {p_Deck} */ discard: [],
      bots: [],
      hostToken: "",
      hostName: "",
      phase: "lobby",
      roundVersion: 0,
      playerOrder: [],
      currentPlayerToken: "",
      deckOrder: [],
      statusText: "Waiting for host to start the party.",
    });

    me = partyLoadMyShared({
      token: playerToken,
      name: playerName,
      syncedRoundVersion: -1,
      swapReady: false,
      hand: createEmptyHand(),
    });

    guests = partyLoadGuestShareds();
  }

  drawDeck = shared.draw;
  discard = shared.discard;

  ensureHostClaimed();
  updateUi();
}

function initOfflineGame() {
  roomName = "Offline Table";
  shared = {
    draw: [],
    discard: [],
    bots: [],
    hostToken: playerToken,
    hostName: playerName,
    phase: "lobby",
    roundVersion: 0,
    playerOrder: [],
    currentPlayerToken: playerToken,
    deckOrder: [],
    statusText: "Offline table ready. Deal when you are ready.",
  };

  me = {
    token: playerToken,
    name: playerName,
    syncedRoundVersion: -1,
    swapReady: false,
    hand: createEmptyHand(),
  };

  guests = [];
  for (let index = 1; index <= OFFLINE_AI_COUNT; index += 1) {
    shared.bots.push(createAiPlayer(index));
  }
}

function setup() {
  const canvas = createCanvas(960, 640);
  canvas.parent(document.getElementById("canvas-shell"));

  ui.setupScreen = document.getElementById("setup-screen");
  ui.playScreen = document.getElementById("play-screen");
  ui.canvasShell = document.getElementById("canvas-shell");
  ui.roomLabel = document.getElementById("room-label");
  ui.statusLabel = document.getElementById("status-label");
  ui.playStatusLabel = document.getElementById("play-status-label");
  ui.hostLabel = document.getElementById("host-label");
  ui.returnButton = /** @type {HTMLButtonElement | null} */ (document.getElementById("return-to-selection"));
  ui.offlineButton = /** @type {HTMLButtonElement | null} */ (document.getElementById("offline-game"));
  ui.addAiButton = /** @type {HTMLButtonElement | null} */ (document.getElementById("add-ai-player"));
  ui.removeAiButton = /** @type {HTMLButtonElement | null} */ (document.getElementById("remove-ai-player"));
  ui.startButton = /** @type {HTMLButtonElement | null} */ (document.getElementById("start-party"));
  ui.resetButton = /** @type {HTMLButtonElement | null} */ (document.getElementById("reset-party"));
  ui.finishSwapButton = /** @type {HTMLButtonElement | null} */ (document.getElementById("finish-swap"));
  ui.playSelectedButton = /** @type {HTMLButtonElement | null} */ (document.getElementById("play-selected"));
  ui.pickupDiscardButton = /** @type {HTMLButtonElement | null} */ (document.getElementById("pickup-discard"));

  if (ui.startButton) {
    ui.startButton.addEventListener("click", startPartyAsHost);
  }
  if (ui.resetButton) {
    ui.resetButton.addEventListener("click", resetPartyAsHost);
  }
  if (ui.finishSwapButton) {
    ui.finishSwapButton.addEventListener("click", lockSwapPhase);
  }
  if (ui.playSelectedButton) {
    ui.playSelectedButton.addEventListener("click", playSelectedCards);
  }
  if (ui.pickupDiscardButton) {
    ui.pickupDiscardButton.addEventListener("click", pickupDiscardPile);
  }
  if (ui.returnButton) {
    ui.returnButton.addEventListener("click", returnToSelection);
  }
  if (ui.addAiButton) {
    ui.addAiButton.addEventListener("click", addAiPlayerAsHost);
  }
  if (ui.removeAiButton) {
    ui.removeAiButton.addEventListener("click", removeAiPlayerAsHost);
  }

  updateUi();

  initGame().catch((error) => {
    statusMessage = `Setup error: ${error instanceof Error ? error.message : String(error)}`;
    updateUi();
  });
}

/**
 * @param {string} message
 */
function pushDebugTrace(message) {
  void message;
}

function draw() {
  background("#08121e");

  if (!shared || !me || !shared.draw || !shared.discard || !me.hand) {
    ensureCanvasSize(1);
    renderTablePlaceholder("Connecting to party server...");
    return;
  }

  normalizeSharedState();
  ensureHostClaimed();
  syncLocalHandWithRound();
  maybeRunBotAutomation();
  maybeAdvanceSwapPhase();
  if (isPlayPhase() && !isCurrentPlayersTurn() && selectedPlayCardIDs.length > 0) {
    clearPlaySelection();
  }
  updateUi();

  let players = buildRenderablePlayers();
  ensureCanvasSize(players);

  renderShitheadTable(
    players,
    {
      roomName,
      phase: shared.phase,
      drawCount: getDrawCount(),
      discardCount: deckSize(shared.discard),
      discardTop: deckSize(shared.discard) > 0 ? shared.discard[shared.discard.length - 1] : null,
      statusText: shared.statusText || statusMessage,
      hostName: getHostName(),
      currentTurnName: getCurrentTurnName(),
      isHost: isHostPlayer(),
      selectedSwap,
      selectedPlayIndices: getSelectedIndicesForActiveZone(),
    }
  );
}

/**
 * @param {"setup" | "play"} mode
 */
function setScreenMode(mode) {
  if (ui.setupScreen) {
    ui.setupScreen.classList.toggle("screen-hidden", mode !== "setup");
  }
  if (ui.playScreen) {
    ui.playScreen.classList.toggle("screen-hidden", mode !== "play");
  }
}

function returnToSelection() {
  window.location.reload();
}

/**
 * @param {string} message
 * @param {number} durationMs
 */
function setLocalStatus(message, durationMs = 2600) {
  localStatusMessage = message;
  localStatusExpiresAt = millis() + durationMs;
}

/**
 * @param {number} id
 * @returns {{suit: number, value: number}}
 */
function loadCard(id) {
  let suit = id % 4;
  let rankIndex = Math.floor(id / 4);
  let value = (rankIndex + 12) % 13;
  return { suit, value };
}

/** @returns {PlayerHand} */
function createEmptyHand() {
  return {
    /** @type {p_Deck} */ up: [],
    /** @type {p_Deck} */ down: [],
    /** @type {p_Deck} */ play: [],
  };
}

/** @returns {string} */
function createPlayerToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @returns {{rule: string[]}}
 */
function createDefaultPlayRules() {
  return {
    rule: [
      "lastValue == null",
      "lastValue === 6 && value <= 6",
      "lastValue !== 6 && value >= lastValue"
    ],
  };
}

/** @returns {Promise<{rule: string[]}>} */
async function loadPlayRules() {
  try {
    let response = await fetch(RULES_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    let loaded = await response.json();
    let fallback = createDefaultPlayRules().rule;
    let ruleParts = Array.isArray(loaded?.rule)
      ? loaded.rule.filter((part) => typeof part === "string" && part.trim().length > 0)
      : typeof loaded?.rule === "string" && loaded.rule.trim().length > 0
        ? [loaded.rule]
        : fallback;
    return {
      rule: ruleParts.length > 0 ? ruleParts : fallback,
    };
  } catch (error) {
    statusMessage = `Using fallback play rules: ${error instanceof Error ? error.message : String(error)}`;
    return createDefaultPlayRules();
  }
}

/**
 * Shared deck values must stay serializable in p5.party,
 * so we normalize everything to unique card-id arrays.
 * @param {unknown} value
 * @returns {number}
 */
function toCardID(value) {
  return Number(value);
}

/**
 * @param {number} cardID
 * @returns {boolean}
 */
function isValidCardID(cardID) {
  return Number.isInteger(cardID) && cardID >= 0 && cardID < TOTAL_CARDS;
}

/**
 * @param {unknown} deck
 * @returns {number[]}
 */
function deckToArray(deck) {
  /** @type {unknown[]} */
  let values;
  if (Array.isArray(deck)) {
    values = deck;
  } else if (deck && typeof deck === "object") {
    values = Object.values(/** @type {Record<string, unknown>} */ (deck));
  } else {
    values = [];
  }

  /** @type {number[]} */
  let normalized = [];
  let seen = new Set();

  for (let value of values) {
    let cardID = toCardID(value);
    if (!isValidCardID(cardID) || seen.has(cardID)) {
      continue;
    }
    seen.add(cardID);
    normalized.push(cardID);
  }

  return normalized;
}

/**
 * @param {number[]} target
 */
function normalizeDeckInPlace(target) {
  let normalized = deckToArray(target);
  target.length = 0;
  target.push(...normalized);
}

/**
 * @param {number[]} deck
 */
function sortDeckByID(deck) {
  if (!Array.isArray(deck)) {
    return;
  }
  deck.sort((left, right) => {
    let leftCard = loadCard(left);
    let rightCard = loadCard(right);

    if (leftCard.value !== rightCard.value) {
      return leftCard.value - rightCard.value;
    }

    if (leftCard.suit !== rightCard.suit) {
      return leftCard.suit - rightCard.suit;
    }

    return left - right;
  });
}

/**
 * @param {PlayerHand | undefined} hand
 */
function normalizeHand(hand) {
  if (!hand) {
    return;
  }
  hand.down = deckToArray(hand.down);
  hand.up = deckToArray(hand.up);
  hand.play = deckToArray(hand.play);
  sortDeckByID(hand.play);
}

function normalizeSharedState() {
  if (!shared || !me) {
    return;
  }

  shared.draw = deckToArray(shared.draw);
  shared.discard = deckToArray(shared.discard);
  shared.bots = Array.isArray(shared.bots) ? shared.bots : Object.values(shared.bots || {});
  shared.playerOrder = Array.isArray(shared.playerOrder) ? shared.playerOrder : Object.values(shared.playerOrder || {});
  shared.deckOrder = deckToArray(shared.deckOrder);
  shared.phase = typeof shared.phase === "string" ? shared.phase : "lobby";
  normalizeHand(me.hand);

  for (let bot of shared.bots) {
    if (!bot) {
      continue;
    }
    bot.token = typeof bot.token === "string" ? bot.token : "";
    bot.name = typeof bot.name === "string" && bot.name.length > 0 ? bot.name : "AI";
    bot.swapReady = Boolean(bot.swapReady);
    bot.hand = bot.hand || createEmptyHand();
    normalizeHand(bot.hand);
  }

  if (!Array.isArray(guests)) {
    return;
  }

  for (let guest of guests) {
    if (!guest || !guest.hand) {
      continue;
    }
    normalizeHand(guest.hand);
  }
}

/** @returns {PlayerState[]} */
function getSharedBots() {
  if (!shared) {
    return [];
  }
  normalizeSharedState();
  return Array.isArray(shared.bots) ? shared.bots : [];
}

/**
 * @param {string} token
 * @returns {PlayerState | null}
 */
function getBotByToken(token) {
  return getSharedBots().find((bot) => bot.token === token) || null;
}

/** @returns {string} */
function createBotToken() {
  return `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @param {number} index
 * @returns {PlayerState}
 */
function createAiPlayer(index) {
  return {
    token: createBotToken(),
    name: `AI ${index}`,
    isBot: true,
    swapReady: false,
    hand: createEmptyHand(),
  };
}

function ensureHostClaimed() {
  if (!shared || !me || !shared.draw || !shared.discard) {
    return;
  }

  if (typeof me.token !== "string" || me.token.length === 0) {
    return;
  }

  if (typeof me.name !== "string" || me.name.length === 0) {
    return;
  }

  if (isHostPlayer() && (shared.hostToken !== me.token || shared.hostName !== me.name)) {
    shared.hostToken = me.token;
    shared.hostName = me.name;
    if (!shared.currentPlayerToken) {
      shared.currentPlayerToken = me.token;
    }
    if (!shared.statusText || shared.phase === "lobby") {
      shared.statusText = `${me.name} is the host.`;
    }
  }
}

/** @returns {boolean} */
function isHostPlayer() {
  return Boolean(shared && me && (isOfflineMode || partyIsHost()));
}

/** @returns {PlayerState[]} */
function getConnectedPlayers() {
  if (!me) {
    return [];
  }

  normalizeSharedState();

  /** @type {Map<string, PlayerState>} */
  let playersByToken = new Map();

  /**
   * @param {PlayerState} player
   */
  let addPlayer = (player) => {
    if (!player.token) {
      return;
    }
    if (!playersByToken.has(player.token)) {
      playersByToken.set(player.token, player);
    }
  };

  let ownName = typeof me.name === "string" && me.name.length > 0 ? me.name : "You";
  if (typeof me.token === "string" && me.token.length > 0 && me.hand) {
    addPlayer({ token: me.token, name: ownName, hand: me.hand });
  }

  if (!Array.isArray(guests)) {
    let bots = getSharedBots();
    for (let bot of bots) {
      if (!bot.token || !bot.hand) {
        continue;
      }
      addPlayer({ token: bot.token, name: bot.name, hand: bot.hand, isBot: true, swapReady: bot.swapReady });
    }
    return Array.from(playersByToken.values());
  }

  for (let guest of guests) {
    if (!guest || typeof guest.token !== "string" || guest.token.length === 0 || !guest.hand) {
      continue;
    }
    addPlayer({
      token: guest.token,
      name: typeof guest.name === "string" && guest.name.length > 0 ? guest.name : "Guest",
      hand: guest.hand,
    });
  }

  for (let bot of getSharedBots()) {
    if (!bot || typeof bot.token !== "string" || bot.token.length === 0 || !bot.hand) {
      continue;
    }
    addPlayer({
      token: bot.token,
      name: bot.name,
      hand: bot.hand,
      isBot: true,
      swapReady: bot.swapReady,
    });
  }

  let players = Array.from(playersByToken.values());
  players.sort((left, right) => left.token.localeCompare(right.token));
  return players;
}

/** @returns {boolean} */
function isSwapPhase() {
  return Boolean(shared && shared.phase === "swap");
}

/** @returns {boolean} */
function isPlayPhase() {
  return Boolean(shared && shared.phase === "play");
}

/** @returns {boolean} */
function isCurrentPlayersTurn() {
  return Boolean(shared && me && shared.currentPlayerToken === me.token);
}

/** @returns {boolean} */
function allPlayersReadyToPlay() {
  let players = getConnectedPlayers();
  if (players.length === 0) {
    return Boolean(me?.swapReady);
  }

  if (!me?.swapReady) {
    return false;
  }

  for (let guest of guests) {
    if (!guest || typeof guest.token !== "string" || guest.token.length === 0) {
      continue;
    }
    if (!guest.swapReady) {
      return false;
    }
  }

  for (let bot of getSharedBots()) {
    if (!bot.swapReady) {
      return false;
    }
  }

  return true;
}

/**
 * @returns {"play" | "up" | "down" | null}
 */
function getActiveTurnZone() {
  return me?.hand ? getActiveZoneForHand(me.hand) : null;
}

/**
 * @param {"play" | "up" | "down"} zone
 * @returns {number[]}
 */
function getPlayableIndicesForZone(zone) {
  if (!me?.hand?.[zone]) {
    return [];
  }
  return getPlayableIndicesForHand(me.hand, me.token, zone);
}

/** @returns {boolean} */
function hasAnyPlayableCard() {
  let activeZone = getActiveTurnZone();
  if (!activeZone) {
    return false;
  }
  return getPlayableIndicesForZone(activeZone).length > 0;
}

/** @returns {number} */
function getDrawCount() {
  if (!shared || !shared.draw) {
    return TOTAL_CARDS;
  }
  return TOTAL_CARDS - deckSize(shared.draw);
}

/** @returns {number[]} */
function createShuffledDeck() {
  let cards = Array.from({ length: TOTAL_CARDS }, (_, index) => index);
  for (let index = cards.length - 1; index > 0; index -= 1) {
    let swapIndex = Math.floor(Math.random() * (index + 1));
    let temp = cards[index];
    cards[index] = cards[swapIndex];
    cards[swapIndex] = temp;
  }
  return cards;
}

/** @returns {number | null} */
function drawNextCardFromPile() {
  if (!shared || !Array.isArray(shared.deckOrder) || !Array.isArray(shared.draw)) {
    return null;
  }

  for (let cardID of shared.deckOrder) {
    if (!deckHas(shared.draw, cardID)) {
      deckAdd(shared.draw, cardID);
      return cardID;
    }
  }

  return null;
}

/**
 * @param {PlayerHand} hand
 * @returns {number}
 */
function refillPlayHandToInitialSize(hand) {
  let cardsDrawn = 0;
  while (hand.play.length < INITIAL_HAND_SIZE) {
    let nextCard = drawNextCardFromPile();
    if (nextCard == null) {
      break;
    }
    deckAdd(hand.play, nextCard);
    cardsDrawn += 1;
  }
  return cardsDrawn;
}

/**
 * @param {number[]} target
 */
function clearDeck(target) {
  normalizeDeckInPlace(target);
  target.length = 0;
}

/**
 * @param {number[]} deck
 * @param {number} cardID
 * @returns {boolean}
 */
function deckHas(deck, cardID) {
  return deckToArray(deck).includes(cardID);
}

/**
 * @param {number[]} deck
 * @param {number} cardID
 */
function deckAdd(deck, cardID) {
  if (!Array.isArray(deck)) {
    return;
  }
  if (!isValidCardID(cardID)) {
    return;
  }
  normalizeDeckInPlace(deck);
  if (!deckHas(deck, cardID)) {
    deck.push(cardID);
  }
}

/**
 * @param {number[]} deck
 * @param {number} index
 * @returns {number | null}
 */
function deckRemoveAt(deck, index) {
  if (!Array.isArray(deck) || index < 0 || index >= deck.length) {
    return null;
  }
  let removed = deck.splice(index, 1);
  return removed.length > 0 ? removed[0] : null;
}

/**
 * @param {number[]} deck
 * @returns {number}
 */
function deckSize(deck) {
  return deckToArray(deck).length;
}

/**
 * @param {PlayerHand} hand
 */
function clearHand(hand) {
  normalizeHand(hand);
  clearDeck(hand.down);
  clearDeck(hand.up);
  clearDeck(hand.play);
}

/**
 * @param {PlayerHand} hand
 * @param {"up" | "play"} fromZone
 * @param {number} fromIndex
 * @param {"up" | "play"} toZone
 * @param {number} toIndex
 */
function swapHandCards(hand, fromZone, fromIndex, toZone, toIndex) {
  if (fromZone === toZone) {
    return;
  }

  let fromDeck = hand[fromZone];
  let toDeck = hand[toZone];

  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= fromDeck.length ||
    toIndex >= toDeck.length
  ) {
    return;
  }

  let temp = fromDeck[fromIndex];
  fromDeck[fromIndex] = toDeck[toIndex];
  toDeck[toIndex] = temp;
  validateHand(hand);
}

/**
 * Ensures a single hand does not contain duplicates across its visible piles.
 * @param {PlayerHand} hand
 */
function validateHand(hand) {
  let allCards = [...hand.down, ...hand.up, ...hand.play];
  let uniqueCards = new Set(allCards);
  if (uniqueCards.size !== allCards.length) {
    throw new Error("A player hand contains duplicate cards.");
  }
}

/** @returns {number | null} */
function getTopDiscardCard() {
  if (!shared || !Array.isArray(shared.discard) || shared.discard.length === 0) {
    return null;
  }
  return shared.discard[shared.discard.length - 1];
}

/**
 * @param {number} cardID
 * @returns {boolean}
 */
function evaluateRule(cardID) {
  let topDiscard = getTopDiscardCard();
  let card = loadCard(cardID);
  let topCard = topDiscard == null ? null : loadCard(topDiscard);
  let value = card.value;
  let suit = card.suit;
  let lastValue = topCard?.value ?? null;
  let lastSuit = topCard?.suit ?? null;
  let expression = playRules.rule.join(" || ");

  try {
    let evaluator = new Function(
      "value",
      "suit",
      "lastValue",
      "lastSuit",
      `return (${expression});`
    );
    return Boolean(evaluator(value, suit, lastValue, lastSuit));
  } catch (error) {
    console.error("Failed to evaluate play rule:", error);
    return false;
  }
}

/**
 * @param {number} cardID
 * @returns {boolean}
 */
function shouldClearDiscardPile(cardID) {
  let card = loadCard(cardID);
  if (card.value === 8) {
    return true;
  }

  let discardCards = Array.isArray(shared?.discard) ? [...shared.discard] : [];
  let lastFourValues = discardCards
    .slice(-4)
    .map((id) => loadCard(id).value);

  return lastFourValues.length === 4 && lastFourValues.every((value) => value === lastFourValues[0]);
}

/**
 * Turn order is enforced here first, then card rules are resolved from
 * the editable JSON file using a default rule plus card-id overrides.
 * @param {number} cardID
 * @returns {{ok: boolean, reason: string}}
 */
function canPlayCardOnDiscard(cardID) {
  return me ? canPlayerTokenPlayCardOnDiscard(me.token, cardID) : { ok: false, reason: "Player unavailable." };
}

function resetSharedState() {
  if (!shared || !shared.draw || !shared.discard) {
    return;
  }
  normalizeSharedState();
  clearDeck(shared.draw);
  clearDeck(shared.discard);
  shared.playerOrder = [];
  shared.currentPlayerToken = shared.hostToken || "";
  shared.deckOrder = [];
  shared.phase = "lobby";
  shared.hostName = getHostName();
  shared.statusText = "Waiting for host to start the party.";
  for (let bot of getSharedBots()) {
    clearHand(bot.hand);
    bot.swapReady = false;
  }
  selectedSwap = null;
  clearPlaySelection();
}

function resetPartyAsHost() {
  if (!shared || !me || !shared.draw || !shared.discard || !isHostPlayer()) {
    statusMessage = "Only the host can reset the party.";
    updateUi();
    return;
  }

  resetSharedState();
  shared.roundVersion += 1;
  shared.statusText = `${me.name} reset the party.`;
  me.swapReady = false;
  syncLocalHandWithRound();
}

function startPartyAsHost() {
  if (!shared || !me || !shared.draw || !shared.discard || !isHostPlayer()) {
    statusMessage = "Only the host can start the party.";
    updateUi();
    return;
  }

  normalizeSharedState();

  let players = getConnectedPlayers();
  if (players.length === 0) {
    statusMessage = "No players connected yet.";
    updateUi();
    return;
  }

  let totalNeededCards = players.length * CARDS_PER_PLAYER;
  if (totalNeededCards > TOTAL_CARDS) {
    statusMessage = `Too many players for a 52-card deal: ${players.length}.`;
    updateUi();
    return;
  }

  let deckOrder = createShuffledDeck();
  let dealtCards = deckOrder.slice(0, totalNeededCards);

  clearDeck(shared.draw);
  for (let cardID of dealtCards) {
    deckAdd(shared.draw, cardID);
  }

  clearDeck(shared.discard);
  shared.playerOrder = players.map((player) => player.token);
  shared.currentPlayerToken = shared.hostToken;
  shared.deckOrder = deckOrder;
  shared.phase = "swap";
  shared.roundVersion += 1;
  shared.statusText = `${me.name} dealt ${players.length} hands. Swap your play and up cards, then lock in.`;

  validateAuthoritativeDeal(players.length);
  syncLocalHandWithRound();
}

function syncLocalHandWithRound() {
  if (!shared || !me || !me.hand || !shared.draw || !shared.discard) {
    return;
  }

  normalizeSharedState();

  if (me.syncedRoundVersion === shared.roundVersion && lastAppliedVersion === shared.roundVersion) {
    return;
  }

  clearHand(me.hand);
  me.swapReady = false;
  selectedSwap = null;
  clearPlaySelection();

  if (shared.phase === "swap" || shared.phase === "play") {
    applyRoundCardsToMe();
    if (isHostPlayer()) {
      for (let bot of getSharedBots()) {
        applyRoundCardsToBot(bot);
      }
    }
  }

  me.syncedRoundVersion = shared.roundVersion;
  lastAppliedVersion = shared.roundVersion;

  if (shared.phase === "swap" || shared.phase === "play") {
    validateAuthoritativeDeal(shared.playerOrder.length);
    validateHand(me.hand);
  }
}

function lockSwapPhase() {
  if (!shared || !me || !me.hand) {
    return;
  }
  if (!isSwapPhase()) {
    statusMessage = "Swaps are only available during the swap phase.";
    updateUi();
    return;
  }

  validateHand(me.hand);
  me.swapReady = true;
  selectedSwap = null;
  statusMessage = "Your swaps are locked in. Waiting for the other players.";
  updateUi();
}

function addAiPlayerAsHost() {
  if (!shared || !isHostPlayer()) {
    statusMessage = "Only the host can add AI players.";
    updateUi();
    return;
  }
  if (shared.phase !== "lobby") {
    statusMessage = "Add AI players before dealing a round.";
    updateUi();
    return;
  }

  normalizeSharedState();
  let aiCount = getSharedBots().length + 1;
  shared.bots.push(createAiPlayer(aiCount));
  shared.statusText = `Added AI ${aiCount} to the table.`;
  updateUi();
}

function removeAiPlayerAsHost() {
  if (!shared || !isHostPlayer()) {
    statusMessage = "Only the host can remove AI players.";
    updateUi();
    return;
  }
  if (shared.phase !== "lobby") {
    statusMessage = "Remove AI players before dealing a round.";
    updateUi();
    return;
  }

  normalizeSharedState();
  let bots = getSharedBots();
  if (bots.length === 0) {
    statusMessage = "There are no AI players to remove.";
    updateUi();
    return;
  }

  let removedBot = bots.pop();
  shared.statusText = `${removedBot?.name || "An AI player"} left the table.`;
  updateUi();
}

/**
 * @param {PlayerHand} hand
 * @returns {"play" | "up" | "down" | null}
 */
function getActiveZoneForHand(hand) {
  if (hand.play.length > 0) {
    return "play";
  }
  if (hand.up.length > 0) {
    return "up";
  }
  if (hand.down.length > 0) {
    return "down";
  }
  return null;
}

/**
 * @param {number | null} cardID
 * @returns {string}
 */
function describeCard(cardID) {
  if (cardID == null || !isValidCardID(cardID)) {
    return "none";
  }

  let card = loadCard(cardID);
  let ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  let suits = ["C", "D", "H", "S"];
  return `${ranks[card.value]}${suits[card.suit]}(${cardID})`;
}

/**
 * @param {string} token
 * @param {number} cardID
 * @returns {{ok: boolean, reason: string}}
 */
function canPlayerTokenPlayCardOnDiscard(token, cardID) {
  if (!shared || shared.currentPlayerToken !== token) {
    return { ok: false, reason: "It is not this player's turn." };
  }

  if (!evaluateRule(cardID)) {
    return {
      ok: false,
      reason: `Rule check failed: tried ${describeCard(cardID)} on ${describeCard(getTopDiscardCard())}.`,
    };
  }

  return { ok: true, reason: "" };
}

/**
 * @param {PlayerHand} hand
 * @param {string} token
 * @param {"play" | "up" | "down"} zone
 * @returns {number[]}
 */
function getPlayableIndicesForHand(hand, token, zone) {
  /** @type {number[]} */
  let playable = [];
  for (let index = 0; index < hand[zone].length; index += 1) {
    if (canPlayerTokenPlayCardOnDiscard(token, hand[zone][index]).ok) {
      playable.push(index);
    }
  }
  return playable;
}

/**
 * @param {PlayerHand} hand
 */
function chooseSwapLayoutForAi(hand) {
  let combined = [...hand.up, ...hand.play].sort((left, right) => {
    let leftCard = loadCard(left);
    let rightCard = loadCard(right);
    if (leftCard.value !== rightCard.value) {
      return leftCard.value - rightCard.value;
    }
    if (leftCard.suit !== rightCard.suit) {
      return leftCard.suit - rightCard.suit;
    }
    return left - right;
  });

  hand.play = combined.slice(0, INITIAL_HAND_SIZE);
  hand.up = combined.slice(INITIAL_HAND_SIZE);
}

/**
 * @param {PlayerState} bot
 * @returns {{zone: "play" | "up" | "down" | null, cardIDs: number[]}}
 */
function chooseBotAction(bot) {
  let zone = getActiveZoneForHand(bot.hand);
  if (!zone) {
    return { zone: null, cardIDs: [] };
  }

  if (zone === "down") {
    return { zone, cardIDs: bot.hand.down.length > 0 ? [bot.hand.down[0]] : [] };
  }

  let playableIndices = getPlayableIndicesForHand(bot.hand, bot.token, zone);
  if (playableIndices.length === 0) {
    return { zone, cardIDs: [] };
  }

  let chosenIndex = [...playableIndices].sort((leftIndex, rightIndex) => {
    let leftCardID = bot.hand[zone][leftIndex];
    let rightCardID = bot.hand[zone][rightIndex];
    let leftScore = getAiPlayPreferenceScore(leftCardID);
    let rightScore = getAiPlayPreferenceScore(rightCardID);

    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    let leftCard = loadCard(leftCardID);
    let rightCard = loadCard(rightCardID);

    if (leftCard.value !== rightCard.value) {
      return leftCard.value - rightCard.value;
    }

    if (leftCard.suit !== rightCard.suit) {
      return leftCard.suit - rightCard.suit;
    }

    return leftCardID - rightCardID;
  })[0];
  let chosenValue = loadCard(bot.hand[zone][chosenIndex]).value;
  let matching = playableIndices
    .filter((index) => loadCard(bot.hand[zone][index]).value === chosenValue)
    .map((index) => bot.hand[zone][index]);
  return { zone, cardIDs: matching };
}

/**
 * Lower score means "play this sooner".
 * Value mapping is 0=2, 5=7, 8=10.
 * @param {number} cardID
 * @returns {number}
 */
function getAiPlayPreferenceScore(cardID) {
  let { value } = loadCard(cardID);

  if (value === 5) {
    return 4.5;
  }
  if (value === 0) {
    return 30;
  }
  if (value === 8) {
    return 40;
  }
  if (value < 5) {
    return 10 + value;
  }

  return value;
}

/**
 * @param {string} token
 * @param {string} name
 * @param {PlayerHand} hand
 * @param {"play" | "up" | "down"} activeZone
 * @param {number[]} selectedCardIDs
 * @returns {boolean}
 */
function executeSelectedCards(token, name, hand, activeZone, selectedCardIDs) {
  normalizeHand(hand);
  let activeDeck = hand[activeZone];
  let selectedCards = selectedCardIDs.filter((cardID) =>
    isValidCardID(cardID) && activeDeck.includes(cardID)
  );
  let safeSelection = selectedCards
    .map((cardID) => activeDeck.indexOf(cardID))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right);
  pushDebugTrace(`${name} play attempt zone=${activeZone} cardIDs=[${selectedCardIDs.join(",")}] indices=[${safeSelection.join(",")}] cards=[${selectedCards.join(",")}] discard=${deckSize(shared?.discard || [])} turn=${shared?.currentPlayerToken || "-"}`);

  if (safeSelection.length === 0 || selectedCards.length === 0) {
    pushDebugTrace(`${name} play aborted invalid-selection zone=${activeZone} hand=[${activeDeck.join(",")}]`);
    return false;
  }

  if (activeZone === "down" && safeSelection.length > 1) {
    pushDebugTrace(`${name} play aborted down-multi-selection indices=[${safeSelection.join(",")}]`);
    return false;
  }

  if (activeZone !== "down") {
    let firstValue = loadCard(selectedCards[0]).value;
    let sameValue = selectedCards.every((cardID) => loadCard(cardID).value === firstValue);
    if (!sameValue) {
      pushDebugTrace(`${name} play aborted mixed-values cards=[${selectedCards.join(",")}]`);
      return false;
    }
  }

  let validation = canPlayerTokenPlayCardOnDiscard(token, selectedCards[0]);

  if (!validation.ok) {
    pushDebugTrace(`${name} play rejected reason="${validation.reason}"`);
    let cardsToPickUp = [...safeSelection].sort((left, right) => right - left);
    /** @type {number[]} */
    let removedCards = [];
    for (let index of cardsToPickUp) {
      let removed = deckRemoveAt(activeDeck, index);
      if (removed != null) {
        removedCards.push(removed);
      }
    }
    if (removedCards.length === 0) {
      return false;
    }

    removedCards.reverse();
    for (let cardID of removedCards) {
      deckAdd(shared.discard, cardID);
    }
    for (let cardID of [...shared.discard]) {
      deckAdd(hand.play, cardID);
    }
    clearDeck(shared.discard);
    shared.statusText = `${name} played ${removedCards.length} invalid ${activeZone} card${removedCards.length === 1 ? "" : "s"} and picked up the discard pile.`;
    pushDebugTrace(`${name} invalid-play pickup removed=[${removedCards.join(",")}] play=${hand.play.length} discard=${deckSize(shared?.discard || [])} next=${shared?.currentPlayerToken || "-"}`);
    advanceTurn();
    validateHand(hand);
    return true;
  }

  let cardsToPlay = [...safeSelection].sort((left, right) => right - left);
  /** @type {number[]} */
  let removedCards = [];
  for (let index of cardsToPlay) {
    let removed = deckRemoveAt(activeDeck, index);
    if (removed != null) {
      removedCards.push(removed);
    }
  }
  if (removedCards.length === 0) {
    return false;
  }

  removedCards.reverse();
  for (let cardID of removedCards) {
    deckAdd(shared.discard, cardID);
  }

  let lastPlayedCard = removedCards[removedCards.length - 1];
  let clearHappened = lastPlayedCard != null && shouldClearDiscardPile(lastPlayedCard);
  let cardsDrawn = refillPlayHandToInitialSize(hand);
  let playerFinished = removePlayerFromOrderIfFinished(token, hand);
  pushDebugTrace(`${name} resolved play removed=[${removedCards.join(",")}] clear=${clearHappened} drew=${cardsDrawn} finished=${playerFinished} discard=${deckSize(shared?.discard || [])} nextBeforeAdvance=${shared?.currentPlayerToken || "-"}`);

  if (playerFinished) {
    shared.statusText = `${name} has played their last card and is out of the round.`;
  } else if (clearHappened) {
    clearDeck(shared.discard);
    shared.statusText = `${name} played ${removedCards.length} ${activeZone} card${removedCards.length === 1 ? "" : "s"}, cleared the discard pile, and keeps the turn.${cardsDrawn > 0 ? ` Drew ${cardsDrawn} card${cardsDrawn === 1 ? "" : "s"}.` : ""}`;
  } else {
    shared.statusText = `${name} played ${removedCards.length} ${activeZone} card${removedCards.length === 1 ? "" : "s"} to the discard pile.${cardsDrawn > 0 ? ` Drew ${cardsDrawn} card${cardsDrawn === 1 ? "" : "s"}.` : ""}`;
    advanceTurn();
  }
  validateHand(hand);
  return true;
}

/**
 * @param {string} token
 * @param {string} name
 * @param {PlayerHand} hand
 */
function pickupDiscardPileForPlayer(token, name, hand) {
  if (!shared || shared.currentPlayerToken !== token) {
    pushDebugTrace(`${name} pickup blocked wrong-turn current=${shared?.currentPlayerToken || "-"}`);
    return false;
  }
  if (!Array.isArray(shared.discard) || shared.discard.length === 0) {
    pushDebugTrace(`${name} pickup blocked empty-discard`);
    return false;
  }

  let discardBefore = shared.discard.length;
  for (let cardID of [...shared.discard]) {
    deckAdd(hand.play, cardID);
  }
  clearDeck(shared.discard);
  shared.statusText = `${name} picked up the discard pile.`;
  advanceTurn();
  validateHand(hand);
  pushDebugTrace(`${name} pickup success took=${discardBefore} play=${hand.play.length} next=${shared?.currentPlayerToken || "-"}`);
  return true;
}

function maybeRunBotAutomation() {
  if (!shared || !isHostPlayer()) {
    return;
  }

  let bots = getSharedBots();
  if (bots.length === 0) {
    return;
  }

  if (millis() - lastBotActionAt < BOT_ACTION_DELAY_MS) {
    return;
  }

  if (shared.phase === "swap") {
    let pendingBot = bots.find((bot) => !bot.swapReady);
    if (!pendingBot) {
      return;
    }
    pushDebugTrace(`${pendingBot.name} swap start up=[${pendingBot.hand.up.join(",")}] play=[${pendingBot.hand.play.join(",")}]`);
    chooseSwapLayoutForAi(pendingBot.hand);
    pendingBot.swapReady = true;
    shared.statusText = `${pendingBot.name} locked in their swap.`;
    pushDebugTrace(`${pendingBot.name} swap locked up=[${pendingBot.hand.up.join(",")}] play=[${pendingBot.hand.play.join(",")}]`);
    lastBotActionAt = millis();
    return;
  }

  if (shared.phase !== "play") {
    return;
  }

  let currentBot = getBotByToken(shared.currentPlayerToken);
  if (!currentBot) {
    return;
  }

  let action = chooseBotAction(currentBot);
  pushDebugTrace(`${currentBot.name} decision zone=${action.zone || "none"} cards=[${action.cardIDs.join(",")}] play=${currentBot.hand.play.length} up=${currentBot.hand.up.length} down=${currentBot.hand.down.length} discard=${deckSize(shared?.discard || [])}`);
  if (!action.zone) {
    if (!removePlayerFromOrderIfFinished(currentBot.token, currentBot.hand)) {
      advanceTurn();
      shared.statusText = `${currentBot.name} had no valid zone to act from and passed the turn.`;
      pushDebugTrace(`${currentBot.name} no-zone fallback advanced turn=${shared?.currentPlayerToken || "-"}`);
    }
    lastBotActionAt = millis();
    return;
  }

  if (action.cardIDs.length === 0) {
    if (pickupDiscardPileForPlayer(currentBot.token, currentBot.name, currentBot.hand)) {
      lastBotActionAt = millis();
    } else if (shared.currentPlayerToken === currentBot.token) {
      let fallbackZone = getActiveZoneForHand(currentBot.hand);
      pushDebugTrace(`${currentBot.name} pickup failed fallbackZone=${fallbackZone || "none"}`);
      if (fallbackZone && currentBot.hand[fallbackZone].length > 0) {
        let fallbackPlayed = executeSelectedCards(
          currentBot.token,
          currentBot.name,
          currentBot.hand,
          fallbackZone,
          [currentBot.hand[fallbackZone][0]]
        );
        if (!fallbackPlayed && shared.currentPlayerToken === currentBot.token) {
          advanceTurn();
          shared.statusText = `${currentBot.name} could not resolve a fallback move and passed the turn.`;
          pushDebugTrace(`${currentBot.name} fallback play failed advance=${shared?.currentPlayerToken || "-"}`);
        }
      } else {
        advanceTurn();
        shared.statusText = `${currentBot.name} had no cards available and passed the turn.`;
        pushDebugTrace(`${currentBot.name} no-fallback-cards advance=${shared?.currentPlayerToken || "-"}`);
      }
      lastBotActionAt = millis();
    }
    return;
  }

  let played = executeSelectedCards(currentBot.token, currentBot.name, currentBot.hand, action.zone, action.cardIDs);
  if (!played && shared.currentPlayerToken === currentBot.token) {
    if (!pickupDiscardPileForPlayer(currentBot.token, currentBot.name, currentBot.hand)) {
      advanceTurn();
      shared.statusText = `${currentBot.name} could not resolve a move and passed the turn.`;
      pushDebugTrace(`${currentBot.name} action+pickup failed advance=${shared?.currentPlayerToken || "-"}`);
    }
  }
  lastBotActionAt = millis();
}

function maybeAdvanceSwapPhase() {
  if (!shared || !me || !isHostPlayer() || shared.phase !== "swap") {
    return;
  }
  if (!allPlayersReadyToPlay()) {
    return;
  }

  clearDeck(shared.discard);
  shared.phase = "play";
  shared.currentPlayerToken = shared.hostToken;
  shared.statusText = "All players locked swaps. Play phase has started.";
}

/**
 * @param {PlayerState} bot
 */
function applyRoundCardsToBot(bot) {
  if (!Array.isArray(shared.playerOrder) || !Array.isArray(shared.deckOrder)) {
    return;
  }

  let playerIndex = shared.playerOrder.indexOf(bot.token);
  if (playerIndex < 0) {
    return;
  }

  clearHand(bot.hand);
  bot.swapReady = false;

  let start = playerIndex * CARDS_PER_PLAYER;
  let neededCards = shared.deckOrder.slice(start, start + CARDS_PER_PLAYER);
  if (neededCards.length < CARDS_PER_PLAYER) {
    return;
  }

  for (let index = 0; index < INITIAL_HAND_SIZE; index += 1) {
    deckAdd(bot.hand.down, neededCards[index]);
    deckAdd(bot.hand.up, neededCards[index + INITIAL_HAND_SIZE]);
    deckAdd(bot.hand.play, neededCards[index + INITIAL_HAND_SIZE * 2]);
  }
}

function clearPlaySelection() {
  selectedPlayCardIDs = [];
}

function toggleSelectedPlayIndex(index) {
  let activeZone = getActiveTurnZone();
  if (!activeZone || !me?.hand?.[activeZone] || index < 0 || index >= me.hand[activeZone].length) {
    return;
  }

  let cardID = me.hand[activeZone][index];

  if (activeZone === "down") {
    selectedPlayCardIDs = selectedPlayCardIDs.includes(cardID) ? [] : [cardID];
    return;
  }

  let cardValue = loadCard(cardID).value;

  if (selectedPlayCardIDs.includes(cardID)) {
    selectedPlayCardIDs = selectedPlayCardIDs.filter((selectedCardID) => selectedCardID !== cardID);
    return;
  }

  if (selectedPlayCardIDs.length > 0) {
    let firstSelectedCard = selectedPlayCardIDs[0];
    let firstValue = loadCard(firstSelectedCard).value;
    if (firstValue !== cardValue) {
      selectedPlayCardIDs = [cardID];
      return;
    }
  }

  selectedPlayCardIDs = [...selectedPlayCardIDs, cardID].sort((left, right) => left - right);
}

function advanceTurn() {
  if (!shared || !Array.isArray(shared.playerOrder) || shared.playerOrder.length === 0) {
    if (shared) {
      shared.currentPlayerToken = "";
    }
    return;
  }

  let currentIndex = shared.playerOrder.indexOf(shared.currentPlayerToken);
  if (currentIndex < 0) {
    shared.currentPlayerToken = shared.playerOrder[0];
    if (getBotByToken(shared.currentPlayerToken)) {
      lastBotActionAt = Math.max(lastBotActionAt, millis() - BOT_ACTION_DELAY_MS + BOT_TURN_HANDOFF_DELAY_MS);
    }
    return;
  }

  let previousToken = shared.currentPlayerToken;
  let nextIndex = (currentIndex + 1) % shared.playerOrder.length;
  shared.currentPlayerToken = shared.playerOrder[nextIndex];
  if (!getBotByToken(previousToken) && getBotByToken(shared.currentPlayerToken)) {
    lastBotActionAt = Math.max(lastBotActionAt, millis() - BOT_ACTION_DELAY_MS + BOT_TURN_HANDOFF_DELAY_MS);
  }
}

/**
 * @param {PlayerHand} hand
 * @returns {boolean}
 */
function hasNoCardsLeft(hand) {
  return hand.play.length === 0 && hand.up.length === 0 && hand.down.length === 0;
}

/**
 * @returns {boolean}
 */
function removePlayerFromOrderIfFinished(token, hand) {
  if (!shared || !Array.isArray(shared.playerOrder)) {
    return false;
  }

  if (!hasNoCardsLeft(hand)) {
    return false;
  }

  let currentIndex = shared.playerOrder.indexOf(token);
  if (currentIndex < 0) {
    return false;
  }

  shared.playerOrder.splice(currentIndex, 1);
  if (shared.currentPlayerToken === token) {
    if (shared.playerOrder.length === 0) {
      shared.currentPlayerToken = "";
    } else {
      let nextIndex = currentIndex % shared.playerOrder.length;
      shared.currentPlayerToken = shared.playerOrder[nextIndex];
    }
  }
  return true;
}

/**
 * @param {number} playerCount
 * @returns {{x: number, y: number, w: number, h: number} | null}
 */
function getSelfPanelBounds(playerCount) {
  let players = buildRenderablePlayers();
  let selfIndex = players.findIndex((player) => player.isSelf);
  if (selfIndex < 0) {
    return null;
  }
  return getPlayerPanelBounds(selfIndex, playerCount);
}

/**
 * @param {"up" | "play" | "down"} zone
 * @returns {number}
 */
function getZoneYOffset(zone) {
  if (zone === "down") {
    return DOWN_ROW_Y_OFFSET;
  }
  return zone === "up" ? UP_ROW_Y_OFFSET : PLAY_ROW_Y_OFFSET;
}

/**
 * @param {"up" | "play" | "down"} zone
 * @returns {number | null}
 */
function getClickedCardIndex(zone) {
  let players = buildRenderablePlayers();
  let selfPlayer = players.find((player) => player.isSelf);
  if (!selfPlayer) {
    return null;
  }

  let bounds = getSelfPanelBounds(players.length);
  if (!bounds) {
    return null;
  }

  let cards = selfPlayer[zone];
  let rowX = bounds.x + PANEL_CARDS_X;
  let rowY = bounds.y + getZoneYOffset(zone);

  if (zone === "play") {
    for (let index = 0; index < cards.length; index += 1) {
      let position = getWrappedPlayCardPosition(rowX, rowY, index, cards.length);
      let cardX = position.x;
      let cardY = position.y;
      if (
        mouseX >= cardX &&
        mouseX <= cardX + CARD_W &&
        mouseY >= cardY &&
        mouseY <= cardY + CARD_H
      ) {
        return index;
      }
    }
    return null;
  }

  for (let index = 0; index < cards.length; index += 1) {
    let cardX = rowX + index * (CARD_W + CARD_GAP);
    if (
      mouseX >= cardX &&
      mouseX <= cardX + CARD_W &&
      mouseY >= rowY &&
      mouseY <= rowY + CARD_H
    ) {
      return index;
    }
  }

  return null;
}

/** @returns {number[]} */
function getSelectedIndicesForActiveZone() {
  let activeZone = getActiveTurnZone();
  if (!activeZone || !me?.hand?.[activeZone]) {
    return [];
  }

  return selectedPlayCardIDs
    .map((cardID) => me.hand[activeZone].indexOf(cardID))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right);
}

function playSelectedCards() {
  if (!shared || !me || !me.hand || !shared.discard) {
    return;
  }

  normalizeSharedState();

  if (!isPlayPhase()) {
    setLocalStatus("Cards can only be played during the play phase.");
    updateUi();
    return;
  }
  if (!isCurrentPlayersTurn()) {
    setLocalStatus("It is not your turn.");
    updateUi();
    return;
  }
  let activeZone = getActiveTurnZone();
  if (!activeZone) {
    setLocalStatus("You have no cards left to play.");
    clearPlaySelection();
    updateUi();
    return;
  }

  let activeDeck = me.hand[activeZone];
  let selectedCards = selectedPlayCardIDs.filter((cardID) => activeDeck.includes(cardID));
  let normalizedSelection = selectedCards
    .map((cardID) => activeDeck.indexOf(cardID))
    .filter((index) => Number.isInteger(index) && index >= 0 && index < activeDeck.length)
    .sort((left, right) => left - right);

  if (normalizedSelection.length === 0) {
    setLocalStatus(activeZone === "down"
      ? "Select one down card first."
      : `Select one or more same-value ${activeZone} cards first.`);
    clearPlaySelection();
    updateUi();
    return;
  }

  if (activeZone === "down" && normalizedSelection.length > 1) {
    setLocalStatus("Only one down card can be played at a time.");
    selectedPlayCardIDs = [activeDeck[normalizedSelection[0]]];
    updateUi();
    return;
  }

  if (selectedCards.some((cardID) => !isValidCardID(cardID))) {
    setLocalStatus("One or more selected cards are invalid.");
    clearPlaySelection();
    updateUi();
    return;
  }

  let firstValue = loadCard(selectedCards[0]).value;
  if (selectedCards.some((cardID) => loadCard(cardID).value !== firstValue)) {
    setLocalStatus("You can only play cards of the same value in one action.");
    clearPlaySelection();
    updateUi();
    return;
  }

  selectedSwap = null;
  clearPlaySelection();
  let played = executeSelectedCards(me.token, me.name, me.hand, activeZone, selectedCards);
  if (!played) {
    setLocalStatus("That play could not be resolved.", 3200);
  }
  validateHand(me.hand);
  updateUi();
}

function pickupDiscardPile() {
  if (!shared || !me || !me.hand || !shared.discard) {
    return;
  }
  if (!isPlayPhase()) {
    return;
  }
  if (!isCurrentPlayersTurn()) {
    setLocalStatus("It is not your turn.");
    updateUi();
    return;
  }

  if (pickupDiscardPileForPlayer(me.token, me.name, me.hand)) {
    clearPlaySelection();
    validateHand(me.hand);
  }
}

function mousePressed() {
  if (!shared || !me || !me.hand) {
    return;
  }

  let clickInsideCanvas =
    mouseX >= 0 &&
    mouseX <= width &&
    mouseY >= 0 &&
    mouseY <= height;

  if (!clickInsideCanvas) {
    return;
  }

  if (isPlayPhase()) {
    if (!isCurrentPlayersTurn()) {
      return;
    }

    let activeZone = getActiveTurnZone();
    if (!activeZone) {
      clearPlaySelection();
      return;
    }

    let selectedIndex = getClickedCardIndex(activeZone);
    if (selectedIndex == null) {
      clearPlaySelection();
      return;
    }

    toggleSelectedPlayIndex(selectedIndex);
    return;
  }

  if (!isSwapPhase() || me.swapReady) {
    return;
  }

  let playIndex = getClickedCardIndex("play");
  let upIndex = getClickedCardIndex("up");
  let clicked = playIndex != null
    ? { zone: /** @type {"play"} */ ("play"), index: playIndex }
    : upIndex != null
      ? { zone: /** @type {"up"} */ ("up"), index: upIndex }
      : null;

  if (!clicked) {
    selectedSwap = null;
    return;
  }

  if (!selectedSwap) {
    selectedSwap = clicked;
    return;
  }

  if (selectedSwap.zone === clicked.zone) {
    selectedSwap = clicked.index === selectedSwap.index ? null : clicked;
    return;
  }

  swapHandCards(me.hand, selectedSwap.zone, selectedSwap.index, clicked.zone, clicked.index);
  me.swapReady = false;
  selectedSwap = null;
}

function applyRoundCardsToMe() {
  if (!Array.isArray(shared.playerOrder) || !Array.isArray(shared.deckOrder)) {
    return;
  }

  let playerIndex = shared.playerOrder.indexOf(me.token);
  if (playerIndex < 0) {
    return;
  }

  let start = playerIndex * CARDS_PER_PLAYER;
  let neededCards = shared.deckOrder.slice(start, start + CARDS_PER_PLAYER);
  if (neededCards.length < CARDS_PER_PLAYER) {
    return;
  }

  for (let index = 0; index < INITIAL_HAND_SIZE; index += 1) {
    deckAdd(me.hand.down, neededCards[index]);
    deckAdd(me.hand.up, neededCards[index + INITIAL_HAND_SIZE]);
    deckAdd(me.hand.play, neededCards[index + INITIAL_HAND_SIZE * 2]);
  }
}

/**
 * Keeps the authoritative 52-card accounting valid for the current round:
 * dealt cards are outside the draw pile and every dealt card is unique.
 * @param {number} playerCount
 */
function validateAuthoritativeDeal(playerCount) {
  if (!shared || !shared.draw || !shared.discard) {
    return;
  }

  let dealtCount = playerCount * CARDS_PER_PLAYER;
  let dealtCards = shared.deckOrder.slice(0, dealtCount);
  let uniqueCards = new Set(dealtCards);

  if (dealtCards.length !== dealtCount) {
    throw new Error("The shared deck does not contain enough cards for the round.");
  }
  if (uniqueCards.size !== dealtCards.length) {
    throw new Error("Duplicate cards were found in the shared deal.");
  }

  for (let dealtCard of dealtCards) {
    if (!deckHas(shared.draw, dealtCard)) {
      throw new Error(`Dealt card ${dealtCard} is missing from draw tracking.`);
    }
  }
}

/** @returns {string} */
function getHostName() {
  if (!shared || !shared.draw || !shared.discard) {
    return "Syncing...";
  }
  if (typeof shared.hostName === "string" && shared.hostName.length > 0) {
    return shared.hostName;
  }
  if (isHostPlayer() && me && typeof me.name === "string" && me.name.length > 0) {
    return me.name;
  }
  return "Syncing...";
}

/** @returns {string} */
function getCurrentTurnName() {
  if (!shared || typeof shared.currentPlayerToken !== "string" || shared.currentPlayerToken.length === 0) {
    return "Waiting...";
  }

  let currentPlayer = getConnectedPlayers().find((player) => player.token === shared.currentPlayerToken);
  return currentPlayer ? currentPlayer.name : "Waiting...";
}

/** @returns {{name: string, isHost: boolean, isSelf: boolean, isCurrentTurn: boolean, down: number[], up: number[], play: number[]}[]} */
function buildRenderablePlayers() {
  let activeZone = getActiveTurnZone();
  return getConnectedPlayers().map((player) => ({
    name: player.name,
    isHost: player.token === shared.hostToken,
    isSelf: player.token === me.token,
    isBot: Boolean(player.isBot),
    isCurrentTurn: player.token === shared.currentPlayerToken,
    activeZone: player.token === me.token ? activeZone : null,
    down: [...player.hand.down],
    up: [...player.hand.up],
    play: [...player.hand.play],
  }));
}

/**
 * @param {number | {play: number[]}[]} playerCountOrPlayers
 */
function ensureCanvasSize(playerCountOrPlayers) {
  let playerCount = Array.isArray(playerCountOrPlayers) ? playerCountOrPlayers.length : playerCountOrPlayers;
  let nextWidth = getRequiredCanvasWidth(playerCount);
  let nextHeight = getRequiredCanvasHeight(playerCountOrPlayers);
  if (width !== nextWidth || height !== nextHeight) {
    resizeCanvas(nextWidth, nextHeight);
  }
}

function updateUi() {
  if (ui.roomLabel) {
    ui.roomLabel.textContent = roomName ? `Room: ${roomName}` : "Room: waiting...";
  }

  if (ui.statusLabel) {
    ui.statusLabel.textContent = statusMessage;
  }

  if (ui.playStatusLabel) {
    let sharedStatus = shared?.statusText;
    let hasLocalOverride = localStatusMessage && millis() < localStatusExpiresAt;
    ui.playStatusLabel.textContent = hasLocalOverride ? localStatusMessage : (sharedStatus || statusMessage);
  }

  if (ui.hostLabel) {
    let hostText = shared ? `Host: ${getHostName()}` : "Host: waiting...";
    ui.hostLabel.textContent = hostText;
  }

  let controlsDisabled = !shared || !me || !shared.draw || !shared.discard || !me.hand;
  if (ui.startButton) {
    ui.startButton.disabled = controlsDisabled || !isHostPlayer();
  }
  if (ui.addAiButton) {
    ui.addAiButton.disabled = controlsDisabled || !isHostPlayer() || shared?.phase !== "lobby";
  }
  if (ui.removeAiButton) {
    ui.removeAiButton.disabled =
      controlsDisabled ||
      !isHostPlayer() ||
      shared?.phase !== "lobby" ||
      getSharedBots().length === 0;
  }
  if (ui.resetButton) {
    ui.resetButton.disabled = controlsDisabled || !isHostPlayer();
  }
  if (ui.finishSwapButton) {
    ui.finishSwapButton.disabled = controlsDisabled || !isSwapPhase() || Boolean(me?.swapReady);
  }
  if (ui.playSelectedButton) {
    ui.playSelectedButton.disabled =
      controlsDisabled ||
      !isPlayPhase() ||
      !isCurrentPlayersTurn() ||
      selectedPlayCardIDs.length === 0;
  }
  if (ui.pickupDiscardButton) {
    ui.pickupDiscardButton.disabled =
      controlsDisabled ||
      !isPlayPhase() ||
      !isCurrentPlayersTurn() ||
      deckSize(shared?.discard || []) === 0;
  }
}

/** @returns {Promise<{roomID: string, nameID: string, mode: "online" | "offline"}>} */
async function readRoomName() {
  let roomID = "";
  let nameID = "";
  /** @type {"online" | "offline"} */
  let mode = "online";

  await new Promise((resolve) => {
    let room = /** @type {HTMLInputElement | null} */ (document.getElementById("room"));
    let name = /** @type {HTMLInputElement | null} */ (document.getElementById("name"));
    let enterButton = /** @type {HTMLButtonElement | null} */ (document.getElementById("enter-room"));
    let offlineButton = /** @type {HTMLButtonElement | null} */ (document.getElementById("offline-game"));

    if (!room || !name || !enterButton || !offlineButton) {
      resolve(undefined);
      return;
    }

    /**
     * @param {"online" | "offline"} nextMode
     */
    let submit = (nextMode) => {
      mode = nextMode;
      roomID = nextMode === "offline" ? "Offline Table" : room.value.trim();
      nameID = name.value.trim();
      if (nameID && (nextMode === "offline" || roomID)) {
        enterButton.removeEventListener("click", startOnline);
        offlineButton.removeEventListener("click", startOffline);
        room.removeEventListener("keydown", handleKeyDown);
        name.removeEventListener("keydown", handleKeyDown);
        room.disabled = true;
        name.disabled = true;
        enterButton.disabled = true;
        offlineButton.disabled = true;
        resolve(undefined);
      } else {
        statusMessage = nextMode === "offline"
          ? "Please enter a username for the offline game."
          : "Please enter both a room key and username.";
        updateUi();
      }
    };

    let startOnline = () => submit("online");
    let startOffline = () => submit("offline");

    /**
     * @param {KeyboardEvent} event
     */
    let handleKeyDown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        startOnline();
      }
    };

    enterButton.addEventListener("click", startOnline);
    offlineButton.addEventListener("click", startOffline);
    room.addEventListener("keydown", handleKeyDown);
    name.addEventListener("keydown", handleKeyDown);
  });

  return { roomID, nameID, mode };
}
