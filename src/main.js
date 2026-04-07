import { AI, Player } from "./player.js";
import { Discard, Draw } from "./deck.js";
import { Rect, Card, TextBox } from "./visuals/draw.js";
import { preloadUnicodeCardImages } from "./visuals/unicodeCards.js";
export const canvas = document.getElementById("canvas");
const cxt = canvas.getContext("2d");
if (!cxt)
    throw new Error("couldn't find canvas context");
export const context = cxt;
const dpr = window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();
function SetupCanvas() {
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
}
export let stack = new Set([]);
SetupCanvas();
export let drawPile = new Draw(50, 100);
export let discardPile = new Discard(125, 100);
let currentPlayer = 0;
let aiTurnScheduled = false;
let players = [
    new Player(100, 200, {
        up: drawPile.getCards(3),
        down: drawPile.getCards(3),
        hand: drawPile.getCards(3),
    }),
    new AI(300, 200, {
        up: drawPile.getCards(3),
        down: drawPile.getCards(3),
        hand: drawPile.getCards(3),
    }),
];
drawPile.onDown = () => {
    if (getPlayer() instanceof AI)
        return;
    const before = currentPlayer;
    discardPile.playDraw();
    finishTurn(before);
};
let playButton = new TextBox(40, 350, 50, 25, "Play");
let sortButton = new TextBox(40, 380, 50, 25, "Sort");
stack.add(playButton);
stack.add(sortButton);
sortButton.onDown = () => {
    if (getPlayer() instanceof AI)
        return;
    sortButton.f = "red";
    let cur = getPlayer();
    cur.hand.sort();
};
sortButton.onUp = () => {
    sortButton.f = "black";
};
playButton.onDown = () => {
    if (getPlayer() instanceof AI)
        return;
    playButton.f = "red";
    const before = currentPlayer;
    discardPile.playHand();
    finishTurn(before);
};
playButton.onUp = () => {
    playButton.f = "black";
};
void boot();
async function boot() {
    await preloadUnicodeCardImages();
    requestAnimationFrame(update);
}
function update() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    players.forEach((player) => player.draw());
    drawPile.draw();
    discardPile.draw();
    playButton.draw();
    sortButton.draw();
    requestAnimationFrame(update);
}
export function onMouseDown(mouse) {
    if (getPlayer() instanceof AI)
        return;
    let x = mouse.offsetX / dpr;
    let y = mouse.offsetY / dpr;
    const shapes = [...stack.values()].reverse();
    for (const shape of shapes) {
        const bounds = getShapeBounds(shape);
        if (!inRange(x, y, bounds.x, bounds.y, bounds.w, bounds.h))
            continue;
        shape.onDown();
        break;
    }
}
;
export function onMouseUp(mouse) {
    let x = mouse.offsetX / dpr;
    let y = mouse.offsetY / dpr;
    const shapes = [...stack.values()].reverse();
    for (const shape of shapes) {
        const bounds = getShapeBounds(shape);
        if (!inRange(x, y, bounds.x, bounds.y, bounds.w, bounds.h))
            continue;
        if (shape instanceof Card)
            shape.onUp(shape);
        else if (shape instanceof Rect)
            shape.onUp();
        break;
    }
}
;
function getShapeBounds(shape) {
    if (shape instanceof Card) {
        return {
            x: shape.x,
            y: shape.active ? shape.y : shape.y + 10,
            w: shape.w,
            h: shape.h,
        };
    }
    return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
}
function inRange(x, y, xi, yi, w, h) {
    if (x < xi)
        return false;
    if (y < yi)
        return false;
    if (x > xi + w)
        return false;
    if (y > yi + h)
        return false;
    return true;
}
export function getPlayer() {
    let cur = players[currentPlayer];
    if (cur == null)
        throw Error(`No Current Player, ${currentPlayer}, found ${cur}`);
    return cur;
}
export function getElement(set) {
    if (set.size < 0)
        throw Error("Cannot get element of size 0 Set");
    let v = set.values().next().value;
    if (v == null)
        throw Error(`Expected element in Set, ${set}, found ${v}`);
    return v;
}
function finishTurn(beforePlayer) {
    if (currentPlayer === beforePlayer)
        nextPlayer();
}
function runAiTurns() {
    if (!(getPlayer() instanceof AI) || aiTurnScheduled)
        return;
    aiTurnScheduled = true;
    window.setTimeout(() => {
        aiTurnScheduled = false;
        if (!(getPlayer() instanceof AI))
            return;
        const ai = getPlayer();
        if (!(ai instanceof AI))
            return;
        const before = currentPlayer;
        ai.turn();
        if (currentPlayer === before && drawPile.cardIDs.length > 0) {
            discardPile.playDraw();
        }
        if (currentPlayer === before)
            nextPlayer();
    }, 350);
}
export function nextPlayer() {
    currentPlayer = (currentPlayer + 1) % players.length;
    if (getPlayer() instanceof AI)
        runAiTurns();
}
//# sourceMappingURL=main.js.map