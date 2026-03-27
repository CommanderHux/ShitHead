//@ts-check

const CARD_W = 48;
const CARD_H = 68;
const CARD_GAP = 10;
const PANEL_GAP = 20;
const PANEL_W = 340;
const PANEL_H = 368;
const PANEL_START_X = 40;
const PANEL_START_Y = 264;
const ROW_X_OFFSET = 74;
const DOWN_ROW_Y_OFFSET = 36;
const UP_ROW_Y_OFFSET = 122;
const PLAY_ROW_Y_OFFSET = 208;
const PLAY_ROW_STACK_OFFSET = 76;
const PLAY_ROW_WRAP_AT = 3;
const PANEL_BOTTOM_PADDING = 24;
const PANEL_LABEL_X = 18;
const PANEL_CARDS_X = 70;
const HEADER_ACTION_Y = 74;
const HEADER_ACTION_H = 28;
const HEADER_ACTION_GAP = 10;

/**
 * @param {number[]} deck
 * @returns {number[]}
 */
function sortDeck(deck) {
  return Array.from(deck).sort((left, right) => left - right);
}

/**
 * @param {number} cardCount
 * @returns {number}
 */
function getWrappedPlayRowCount(cardCount) {
  return Math.max(1, Math.ceil(Math.max(0, cardCount) / PLAY_ROW_WRAP_AT));
}

/**
 * @param {number} playCardCount
 * @returns {number}
 */
function getPlayerPanelHeight(playCardCount) {
  let wrappedRows = getWrappedPlayRowCount(playCardCount);
  let requiredHeight = PLAY_ROW_Y_OFFSET + (wrappedRows - 1) * PLAY_ROW_STACK_OFFSET + CARD_H + PANEL_BOTTOM_PADDING;
  return Math.max(PANEL_H, requiredHeight);
}

/**
 * @param {{play: number[]}[] | number} playersOrCount
 * @returns {{columns: number, panelW: number, panelH: number, startX: number, startY: number, gap: number}}
 */
function getTableMetrics(playersOrCount) {
  let playerCount = Array.isArray(playersOrCount) ? playersOrCount.length : playersOrCount;
  let columns = Math.max(1, playerCount);
  let panelH = PANEL_H;

  if (Array.isArray(playersOrCount) && playersOrCount.length > 0) {
    panelH = playersOrCount.reduce(
      (maxHeight, player) => Math.max(maxHeight, getPlayerPanelHeight(player.play.length)),
      PANEL_H
    );
  }

  return {
    columns,
    panelW: PANEL_W,
    panelH,
    startX: PANEL_START_X,
    startY: PANEL_START_Y,
    gap: PANEL_GAP,
  };
}

/**
 * @param {number} playerCount
 * @returns {number}
 */
function getRequiredCanvasWidth(playerCount) {
  let safePlayerCount = Math.max(1, playerCount);
  return Math.max(960, PANEL_START_X * 2 + safePlayerCount * PANEL_W + (safePlayerCount - 1) * PANEL_GAP);
}

/**
 * @param {{play: number[]}[] | number} playersOrCount
 * @returns {number}
 */
function getRequiredCanvasHeight(playersOrCount) {
  let metrics = getTableMetrics(playersOrCount);
  return Math.max(760, metrics.startY + metrics.panelH + 60);
}

/**
 * @param {number} playerIndex
 * @param {number} playerCount
 * @returns {{x: number, y: number, w: number, h: number}}
 */
function getPlayerPanelBounds(playerIndex, playerCount) {
  let metrics = getTableMetrics(playerCount);
  let col = playerIndex % metrics.columns;
  let row = Math.floor(playerIndex / metrics.columns);
  return {
    x: metrics.startX + col * (metrics.panelW + metrics.gap),
    y: metrics.startY + row * (metrics.panelH + metrics.gap),
    w: metrics.panelW,
    h: metrics.panelH,
  };
}

/**
 * @param {"down" | "up" | "play"} zone
 * @returns {number}
 */
function getRowYOffset(zone) {
  if (zone === "down") {
    return DOWN_ROW_Y_OFFSET;
  }
  if (zone === "up") {
    return UP_ROW_Y_OFFSET;
  }
  return PLAY_ROW_Y_OFFSET;
}

/**
 * @param {string} message
 */
function renderTablePlaceholder(message) {
  push();
  noStroke();
  fill("#113c2c");
  rect(32, 32, width - 64, height - 64, 24);
  fill("#f5ecd7");
  textAlign(CENTER, CENTER);
  textSize(26);
  text(message, width / 2, height / 2);
  pop();
}

/**
 * @param {number} cardID
 * @returns {{rank: string, suit: string, corner: string, color: string}}
 */
function getCardVisual(cardID) {
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const suits = ["\u2663", "\u2666", "\u2665", "\u2660"];
  let card = loadCard(cardID);
  let suit = suits[card.suit];
  let rank = ranks[card.value];
  let corner = `${rank}${suit}`;
  let color = suit === "\u2666" || suit === "\u2665" ? "#b91c1c" : "#0f172a";
  return { rank, suit, corner, color };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} cardID
 */
function drawFaceUpCard(x, y, cardID) {
  let { rank, suit, color } = getCardVisual(cardID);

  push();
  stroke("#b59c72");
  strokeWeight(1.5);
  fill("#fbf6ea");
  rect(x, y, CARD_W, CARD_H, 10);
  noFill();
  stroke("#efe4ca");
  strokeWeight(1);
  rect(x + 3, y + 3, CARD_W - 6, CARD_H - 6, 8);
  noStroke();
  fill(color);
  textAlign(CENTER, CENTER);
  textSize(20);
  text(`${rank}\n${suit}`, x + CARD_W / 2, y + CARD_H / 2 + 2);
  pop();
}

/**
 * @param {number} x
 * @param {number} y
 */
function drawFaceDownCard(x, y) {
  push();
  stroke("#d9c59f");
  strokeWeight(1.5);
  fill("#7c1f1f");
  rect(x, y, CARD_W, CARD_H, 10);
  noFill();
  stroke("#f0d69a");
  strokeWeight(1);
  rect(x + 4, y + 4, CARD_W - 8, CARD_H - 8, 8);
  fill("#e5c875");
  noStroke();
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      circle(x + 12 + col * 12, y + 14 + row * 13, 5);
    }
  }
  pop();
}

/**
 * @param {number} x
 * @param {number} y
 * @param {{drawCount: number, discardCount: number, discardTop: number | null, canPlayToDiscard: boolean, canPickup: boolean}} pileState
 */
function drawPileSection(x, y, pileState) {
  push();
  stroke("#9e8255");
  strokeWeight(1.5);
  fill("#163d2d");
  rect(x, y, width - 2 * x, 104, 20);

  noStroke();
  drawFaceDownCard(x + 24, y + 24);
  if (pileState.canPlayToDiscard) {
    let discardBounds = getDiscardPileHitBounds();
    push();
    noFill();
    stroke("#d7bb79");
    strokeWeight(2);
    rect(discardBounds.x, discardBounds.y, discardBounds.w, discardBounds.h, 14);
    pop();
  }
  if (pileState.discardTop == null) {
    push();
    stroke("#8d7651");
    strokeWeight(1);
    noFill();
    rect(x + 208, y + 24, CARD_W, CARD_H, 10);
    pop();
  } else {
    drawFaceUpCard(x + 208, y + 24, pileState.discardTop);
  }

  fill("#d9c08d");
  textSize(13);
  text("Draw Pile", x + 88, y + 28);
  text(`${pileState.drawCount} cards`, x + 88, y + 52);
  text("Discard Pile", x + 272, y + 28);
  text(`${pileState.discardCount} cards`, x + 272, y + 52);

  if (pileState.discardTop == null) {
    fill("#a88f69");
    text("Empty", x + 272, y + 74);
  } else {
    fill(pileState.canPlayToDiscard ? "#e6cb8a" : "#a88f69");
    text(pileState.canPlayToDiscard ? "Tap pile to play" : "Top card shown", x + 272, y + 74);
  }

  let pickupBounds = getPickupButtonBounds();
  push();
  noStroke();
  fill(pileState.canPickup ? "#cda24c" : "rgba(169, 145, 96, 0.32)");
  rect(pickupBounds.x, pickupBounds.y, pickupBounds.w, pickupBounds.h, 14);
  fill(pileState.canPickup ? "#fff8ea" : "#bda87f");
  textAlign(CENTER, CENTER);
  textSize(12);
  text("Take Pile", pickupBounds.x + pickupBounds.w / 2, pickupBounds.y + pickupBounds.h / 2 + 1);
  pop();

  pop();
}

/**
 * @param {number} x
 * @param {number} y
 * @param {string} label
 * @param {string} fillColor
 * @param {string} textColor
 */
function drawBadge(x, y, label, fillColor, textColor) {
  push();
  textAlign(LEFT, CENTER);
  textSize(11);
  let badgeW = textWidth(label) + 16;
  noStroke();
  fill(fillColor);
  rect(x, y, badgeW, 22, 999);
  fill(textColor);
  text(label, x + 8, y + 11);
  pop();
}

/**
 * @param {number} x
 * @param {number} y
 * @param {string} label
 * @param {boolean} enabled
 */
function drawActionChip(x, y, label, enabled) {
  push();
  textAlign(LEFT, CENTER);
  textSize(12);
  let chipW = Math.max(72, textWidth(label) + 22);
  noStroke();
  fill(enabled ? "#cda24c" : "rgba(169, 145, 96, 0.32)");
  rect(x, y, chipW, HEADER_ACTION_H, 999);
  fill(enabled ? "#fff8ea" : "#bda87f");
  text(label, x + 11, y + HEADER_ACTION_H / 2 + 1);
  pop();
}

/**
 * @param {{phase: string, isHost: boolean, canAddAi: boolean, canRemoveAi: boolean, canDeal: boolean, canReset: boolean, canLockSwap: boolean, canPlaySelected: boolean, canPickupDiscard: boolean, selectedPlayCount: number}} tableState
 * @returns {{label: string, action: string, enabled: boolean}[]}
 */
function getVisibleTableActions(tableState) {
  /** @type {{label: string, action: string, enabled: boolean}[]} */
  let actions = [];

  if (tableState.isHost && tableState.phase === "lobby") {
    actions.push({ label: "Add AI", action: "add-ai", enabled: tableState.canAddAi });
    actions.push({ label: "Remove AI", action: "remove-ai", enabled: tableState.canRemoveAi });
    actions.push({ label: "Deal", action: "deal", enabled: tableState.canDeal });
  }

  if (tableState.phase === "swap") {
    actions.push({ label: "Lock In", action: "lock-swap", enabled: tableState.canLockSwap });
  }

  if (tableState.phase === "play") {
    
  }

  if (tableState.isHost) {
    actions.push({ label: "Reset", action: "reset", enabled: tableState.canReset });
  }

  return actions;
}

/**
 * @param {{phase: string, isHost: boolean, canAddAi: boolean, canRemoveAi: boolean, canDeal: boolean, canReset: boolean, canLockSwap: boolean, canPlaySelected: boolean, canPickupDiscard: boolean, selectedPlayCount: number}} tableState
 * @returns {{x: number, y: number, w: number, h: number, action: string, enabled: boolean, label: string}[]}
 */
function getTableActionTargets(tableState) {
  let actions = getVisibleTableActions(tableState);
  /** @type {{x: number, y: number, w: number, h: number, action: string, enabled: boolean, label: string}[]} */
  let targets = [];
  let nextRight = width - 56;

  textSize(12);
  for (let index = actions.length - 1; index >= 0; index -= 1) {
    let action = actions[index];
    let chipW = Math.max(72, textWidth(action.label) + 22);
    let x = nextRight - chipW;
    targets.unshift({
      x,
      y: HEADER_ACTION_Y,
      w: chipW,
      h: HEADER_ACTION_H,
      action: action.action,
      enabled: action.enabled,
      label: action.label,
    });
    nextRight = x - HEADER_ACTION_GAP;
  }

  return targets;
}

/** @returns {{x: number, y: number, w: number, h: number}} */
function getDiscardPileHitBounds() {
  return {
    x: 248,
    y: 174,
    w: 152,
    h: 78,
  };
}

/** @returns {{x: number, y: number, w: number, h: number}} */
function getPickupButtonBounds() {
  return {
    x: 416,
    y: 186,
    w: 108,
    h: 34,
  };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number[]} cards
 * @param {"up" | "down" | "down-hidden" | "play-hidden"} visibility
 * @param {number[] | null} selectedIndices
 */
function drawCardRow(x, y, cards, visibility, selectedIndices = null) {
  for (let index = 0; index < cards.length; index += 1) {
    let cardX = x + index * (CARD_W + CARD_GAP);
    if (selectedIndices && selectedIndices.includes(index)) {
      push();
      noFill();
      stroke("#e7c25f");
      strokeWeight(3);
      rect(cardX - 4, y - 4, CARD_W + 8, CARD_H + 8, 12);
      pop();
    }
    if (visibility === "up") {
      drawFaceUpCard(cardX, y, cards[index]);
    } else {
      drawFaceDownCard(cardX, y);
    }
  }

  let emptySlots = Math.max(0, 3 - cards.length);
  for (let index = 0; index < emptySlots; index += 1) {
    let slotX = x + (cards.length + index) * (CARD_W + CARD_GAP);
    push();
    stroke("#7f6946");
    strokeWeight(1);
    noFill();
    rect(slotX, y, CARD_W, CARD_H, 10);
    pop();
  }
}

/**
 * @param {number} baseX
 * @param {number} baseY
 * @param {number} index
 * @param {number} cardCount
 * @returns {{x: number, y: number}}
 */
function getWrappedPlayCardPosition(baseX, baseY, index, cardCount) {
  let col = index % PLAY_ROW_WRAP_AT;
  let row = Math.floor(index / PLAY_ROW_WRAP_AT);
  let cardsRemaining = Math.max(0, cardCount - row * PLAY_ROW_WRAP_AT);
  let cardsInRow = Math.min(PLAY_ROW_WRAP_AT, cardsRemaining);
  let maxRowWidth = PLAY_ROW_WRAP_AT * CARD_W + (PLAY_ROW_WRAP_AT - 1) * CARD_GAP;
  let currentRowWidth = cardsInRow * CARD_W + Math.max(0, cardsInRow - 1) * CARD_GAP;
  let rowStartX = baseX + (maxRowWidth - currentRowWidth) / 2;

  return {
    x: rowStartX + col * (CARD_W + CARD_GAP),
    y: baseY + row * PLAY_ROW_STACK_OFFSET,
  };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number[]} cards
 * @param {boolean} faceUp
 * @param {number[] | null} selectedIndices
 */
function drawWrappedPlayRow(x, y, cards, faceUp, selectedIndices = null) {
  for (let index = 0; index < cards.length; index += 1) {
    let position = getWrappedPlayCardPosition(x, y, index, cards.length);
    let cardX = position.x;
    let cardY = position.y;

    if (selectedIndices && selectedIndices.includes(index)) {
      push();
      noFill();
      stroke("#e7c25f");
      strokeWeight(3);
      rect(cardX - 4, cardY - 4, CARD_W + 8, CARD_H + 8, 12);
      pop();
    }

    if (faceUp) {
      drawFaceUpCard(cardX, cardY, cards[index]);
    } else {
      drawFaceDownCard(cardX, cardY);
    }
  }
}

/**
 * @param {{name: string, isHost: boolean, isSelf: boolean, isBot: boolean, isCurrentTurn: boolean, activeZone: "play" | "up" | "down" | null, down: number[], up: number[], play: number[]}} player
 * @param {number} x
 * @param {number} y
 * @param {number} boxW
 * @param {number} boxH
 * @param {{zone: "up" | "play", index: number} | null} selectedSwap
 * @param {number[] | null} selectedPlayIndices
 */
function drawPlayerPanel(player, x, y, boxW, boxH, selectedSwap = null, selectedPlayIndices = null) {
  push();
  stroke(player.isCurrentTurn ? "#e0be6d" : player.isSelf ? "#ccb16e" : "#7f6a46");
  strokeWeight(player.isCurrentTurn ? 3 : player.isSelf ? 2.5 : 1.5);
  fill("#123624");
  rect(x, y, boxW, boxH, 20);
  noFill();
  stroke("rgba(247, 236, 215, 0.10)");
  strokeWeight(1);
  rect(x + 5, y + 5, boxW - 10, boxH - 10, 16);

  noStroke();
  fill("#f8efdc");
  textAlign(LEFT, TOP);
  textSize(18);
  text(player.name, x + 16, y + 14);

  let badgeX = x + 16 + textWidth(player.name) + 12;
  if (player.isBot) {
    drawBadge(badgeX, y + 13, "AI", "#355b91", "#eef6ff");
    badgeX += 38;
  }
  if (player.isHost) {
    drawBadge(badgeX, y + 13, "Dealer", "#c9a34d", "#fff8ea");
    badgeX += 60;
  }
  if (player.isSelf) {
    drawBadge(badgeX, y + 13, "You", "#f3ead8", "#2f2418");
    badgeX += 44;
  }
  if (player.isCurrentTurn) {
    drawBadge(badgeX, y + 13, "Turn", "#2f6b4a", "#eef4e8");
  }

  fill("#d9c08d");
  textSize(13);
  text("Down", x + PANEL_LABEL_X, y + 46);
  text("Up", x + PANEL_LABEL_X, y + 132);
  text("Play", x + PANEL_LABEL_X, y + 218);

  drawCardRow(
    x + PANEL_CARDS_X,
    y + DOWN_ROW_Y_OFFSET,
    player.down,
    "down-hidden",
    player.isSelf && player.activeZone === "down" ? selectedPlayIndices : null
  );
  drawCardRow(
    x + PANEL_CARDS_X,
    y + UP_ROW_Y_OFFSET,
    player.up,
    "up",
    player.isSelf
      ? player.activeZone === "up"
        ? selectedPlayIndices
        : selectedSwap?.zone === "up"
          ? [selectedSwap.index]
          : null
      : null
  );
  drawWrappedPlayRow(
    x + PANEL_CARDS_X,
    y + PLAY_ROW_Y_OFFSET,
    player.play,
    player.isSelf,
    player.isSelf
      ? player.activeZone === "play"
        ? selectedPlayIndices
        : selectedSwap?.zone === "play"
          ? [selectedSwap.index]
          : null
      : null
  );
  pop();
}

/**
 * @param {{name: string, isHost: boolean, isSelf: boolean, isBot: boolean, isCurrentTurn: boolean, activeZone: "play" | "up" | "down" | null, down: number[], up: number[], play: number[]}[]} players
 * @param {{roomName: string, phase: string, drawCount: number, discardCount: number, discardTop: number | null, statusText: string, hostName: string, currentTurnName: string, isHost: boolean, selectedSwap: {zone: "up" | "play", index: number} | null, selectedPlayIndices: number[], selectedPlayCount: number, canAddAi: boolean, canRemoveAi: boolean, canDeal: boolean, canReset: boolean, canLockSwap: boolean, canPlaySelected: boolean, canPickupDiscard: boolean}} tableState
 */
function renderShitheadTable(players, tableState) {
  push();
  noStroke();
  fill("#0d261b");
  rect(18, 18, width - 36, height - 36, 28);
  fill("rgba(251, 242, 220, 0.03)");
  rect(28, 28, width - 56, height - 56, 24);
  stroke("#8b744d");
  strokeWeight(1.2);
  fill("#143827");
  rect(38, 34, width - 76, 84, 18);
  rect(38, 132, width - 76, 122, 18);
  rect(38, 264, width - 76, height - 312, 18);

  noStroke();
  fill("#f7efdd");
  textAlign(LEFT, TOP);
  textSize(24);
  text("Shithead Table", 54, 50);

  fill("#efe4ca");
  textSize(14);
  text(tableState.statusText, 54, 84, width - 520, 22);

  drawBadge(width - 300, 48, `Turn: ${tableState.currentTurnName}`, "#204f38", "#f6efde");
  drawBadge(width - 186, 48, `Draw ${tableState.drawCount}`, "#204f38", "#f6efde");
  drawBadge(width - 92, 48, `Discard ${tableState.discardCount}`, "#204f38", "#f6efde");

  let actionTargets = getTableActionTargets(tableState);
  for (let action of actionTargets) {
    drawActionChip(action.x, action.y, action.label, action.enabled);
  }

  drawPileSection(40, 150, {
    drawCount: tableState.drawCount,
    discardCount: tableState.discardCount,
    discardTop: tableState.discardTop,
    canPlayToDiscard: tableState.canPlaySelected,
    canPickup: tableState.canPickupDiscard,
  });

  let metrics = getTableMetrics(players);

  for (let index = 0; index < players.length; index += 1) {
    let bounds = getPlayerPanelBounds(index, players.length);
    let panelHeight = getPlayerPanelHeight(players[index].play.length);
    drawPlayerPanel(
      players[index],
      bounds.x,
      bounds.y,
      bounds.w,
      panelHeight,
      players[index].isSelf ? tableState.selectedSwap : null,
      players[index].isSelf ? tableState.selectedPlayIndices : null
    );
  }

  pop();
}
