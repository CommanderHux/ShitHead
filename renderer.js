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
  fill("#12324d");
  rect(32, 32, width - 64, height - 64, 24);
  fill("#e2e8f0");
  textAlign(CENTER, CENTER);
  textSize(26);
  text(message, width / 2, height / 2);
  pop();
}

/**
 * @param {number} cardID
 * @returns {{rank: string, suit: string, color: string}}
 */
function getCardVisual(cardID) {
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const suits = ["C", "D", "H", "S"];
  let card = loadCard(cardID);
  let suit = suits[card.suit];
  let rank = ranks[card.value];
  let color = suit === "D" || suit === "H" ? "#b91c1c" : "#0f172a";
  return { rank, suit, color };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} cardID
 */
function drawFaceUpCard(x, y, cardID) {
  let { rank, suit, color } = getCardVisual(cardID);

  push();
  stroke("#dbe4ee");
  strokeWeight(1.5);
  fill("#fffdf8");
  rect(x, y, CARD_W, CARD_H, 10);
  noStroke();
  fill(color);
  textAlign(LEFT, TOP);
  textSize(14);
  text(`${rank}${suit}`, x + 8, y + 7);
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
  stroke("#bfdbfe");
  strokeWeight(1.5);
  fill("#1d4ed8");
  rect(x, y, CARD_W, CARD_H, 10);
  fill("#93c5fd");
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
 * @param {{drawCount: number, discardCount: number, discardTop: number | null}} pileState
 */
function drawPileSection(x, y, pileState) {
  push();
  stroke("#32506c");
  strokeWeight(1.5);
  fill("#102235");
  rect(x, y, width - 2 * x, 92, 20);

  noStroke();
  fill("#dbeafe");
  textAlign(LEFT, TOP);
  textSize(16);
  text("Table Piles", x + 18, y + 14);

  drawFaceDownCard(x + 26, y + 16);
  if (pileState.discardTop == null) {
    push();
    stroke("#3b4c5f");
    strokeWeight(1);
    noFill();
    rect(x + 206, y + 16, CARD_W, CARD_H, 10);
    pop();
  } else {
    drawFaceUpCard(x + 206, y + 16, pileState.discardTop);
  }

  fill("#8fb5d7");
  textSize(13);
  text("Draw Pile", x + 94, y + 20);
  text(`${pileState.drawCount} cards`, x + 94, y + 44);
  text("Discard Pile", x + 274, y + 20);
  text(`${pileState.discardCount} cards`, x + 274, y + 44);

  if (pileState.discardTop == null) {
    fill("#64748b");
    text("Empty", x + 274, y + 62);
  } else {
    fill("#64748b");
    text("Top card shown", x + 274, y + 62);
  }

  pop();
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
      stroke("#fbbf24");
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
    stroke("#3b4c5f");
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
      stroke("#fbbf24");
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
 * @param {{name: string, isHost: boolean, isSelf: boolean, isCurrentTurn: boolean, activeZone: "play" | "up" | "down" | null, down: number[], up: number[], play: number[]}} player
 * @param {number} x
 * @param {number} y
 * @param {number} boxW
 * @param {number} boxH
 * @param {{zone: "up" | "play", index: number} | null} selectedSwap
 * @param {number[] | null} selectedPlayIndices
 */
function drawPlayerPanel(player, x, y, boxW, boxH, selectedSwap = null, selectedPlayIndices = null) {
  push();
  stroke(player.isCurrentTurn ? "#34d399" : player.isSelf ? "#fbbf24" : "#32506c");
  strokeWeight(player.isCurrentTurn ? 3 : player.isSelf ? 2.5 : 1.5);
  fill("#102235");
  rect(x, y, boxW, boxH, 20);

  noStroke();
  fill("#f8fafc");
  textAlign(LEFT, TOP);
  textSize(18);
  let label = player.isHost ? `${player.name} [Host]` : player.name;
  if (player.isSelf) {
    label += " [You]";
  }
  if (player.isCurrentTurn) {
    label += " [Turn]";
  }
  text(label, x + 16, y + 14);

  fill("#8fb5d7");
  textSize(13);
  text("Down", x + 16, y + 46);
  text("Up", x + 16, y + 132);
  text("Play", x + 16, y + 218);

  drawCardRow(
    x + ROW_X_OFFSET,
    y + DOWN_ROW_Y_OFFSET,
    player.down,
    "down-hidden",
    player.isSelf && player.activeZone === "down" ? selectedPlayIndices : null
  );
  drawCardRow(
    x + ROW_X_OFFSET,
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
    x + ROW_X_OFFSET,
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
 * @param {{name: string, isHost: boolean, isSelf: boolean, isCurrentTurn: boolean, activeZone: "play" | "up" | "down" | null, down: number[], up: number[], play: number[]}[]} players
 * @param {{roomName: string, phase: string, drawCount: number, discardCount: number, discardTop: number | null, statusText: string, hostName: string, currentTurnName: string, isHost: boolean, selectedSwap: {zone: "up" | "play", index: number} | null, selectedPlayIndices: number[]}} tableState
 */
function renderShitheadTable(players, tableState) {
  push();
  noStroke();
  fill("#0f2232");
  rect(18, 18, width - 36, height - 36, 28);

  fill("#e2e8f0");
  textAlign(LEFT, TOP);
  textSize(26);
  text("Shithead Table", 38, 32);

  fill("#93c5fd");
  textSize(14);
  text(`Room: ${tableState.roomName || "..."}`, 40, 68);
  text(`Host: ${tableState.hostName}`, 210, 68);
  text(`Phase: ${tableState.phase}`, 380, 68);
  text(`Draw: ${tableState.drawCount}`, 520, 68);
  text(`Discard: ${tableState.discardCount}`, 640, 68);
  text(`Turn: ${tableState.currentTurnName}`, 40, 90);

  fill(tableState.isHost ? "#fef3c7" : "#cbd5e1");
  text(tableState.isHost ? "Host controls are enabled below the canvas." : "Waiting for the host to deal or reset.", 240, 90);

  fill("#dbeafe");
  text(tableState.statusText, 40, 118, width - 80, 40);

  drawPileSection(40, 150, {
    drawCount: tableState.drawCount,
    discardCount: tableState.discardCount,
    discardTop: tableState.discardTop,
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
