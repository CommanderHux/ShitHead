import { Player, } from "./player.js"
import { Deck, Discard, Draw } from "./deck.js"
import { Shape, Rect, Circle, Card, TextBox } from "./visuals/draw.js";
import { preloadUnicodeCardImages } from "./visuals/unicodeCards.js";


export const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const cxt = canvas.getContext("2d");
if (!cxt) throw new Error("couldn't find canvas context")
export const context = cxt;
const dpr = window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();

function SetupCanvas() {
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  canvas.addEventListener("mousedown", onMouseDown)
  canvas.addEventListener("mouseup", onMouseUp)
}



export let stack: Set<Rect> = new Set([]);
SetupCanvas();
export let drawPile = new Draw(50, 100);
export let discardPile = new Discard(125,100);
drawPile.onDown = () => discardPile.playDraw();
let currentPlayer: number = 0;
let players = [
  new Player(100, 200, {
    up: drawPile.getCards(3),
    down: drawPile.getCards(3),
    hand: drawPile.getCards(3),
  })
]

let playButton = new TextBox(40,350,50,25,"Play");
let sortButton = new TextBox(40,380,50,25,"Sort");


stack.add(playButton);
stack.add(sortButton);
sortButton.onDown = () => {
  sortButton.f = "red";
  let cur = getPlayer();
  cur.hand.sort(true);
};
sortButton.onUp = () => {
  sortButton.f = "black"
}
playButton.onDown = () => {
  playButton.f = "red";
  discardPile.playHand();
}
playButton.onUp = () => {
  playButton.f = "black"
}


void boot();
async function boot() {
  await preloadUnicodeCardImages();
  requestAnimationFrame(update);
}
function update(){
  context.clearRect(0,0,canvas.width,canvas.height);
  players[0]?.draw();
  drawPile.draw();
  discardPile.draw();
  playButton.draw();
  sortButton.draw();
  requestAnimationFrame(update);
}

export function onMouseDown(mouse: MouseEvent) {
  let x = mouse.offsetX / dpr;
  let y = mouse.offsetY / dpr;
  const shapes = [...stack.values()].reverse();
  for (const shape of shapes) {
    if (!inRange(x, y, shape.x, shape.y, shape.w, shape.h)) continue;
      shape.onDown();
    break;
  }
};

export function onMouseUp(mouse: MouseEvent) {
  let x = mouse.offsetX / dpr;
  let y = mouse.offsetY / dpr;
  const shapes = [...stack.values()].reverse();
  for (const shape of shapes) {
    if (!inRange(x, y, shape.x, shape.y, shape.w, shape.h)) continue;
    if (shape instanceof Card)
      shape.onUp(shape);
    else if (shape instanceof Rect)
      shape.onUp();
    break;
  }
};

function inRange(
  x: number,
  y: number,
  xi: number,
  yi: number,
  w: number,
  h: number,
): boolean {
  if (x < xi) return false;
  if (y < yi) return false;
  if (x > xi + w) return false;
  if (y > yi + h) return false;
  return true;
}
export function getPlayer(): Player{
  let cur = players[currentPlayer]
  if (cur == null) throw Error(`No Current Player, ${currentPlayer}, found ${cur}`)
  return cur;
}
export function getElement<T>(set: Set<T>): T{
  if(set.size < 0) throw Error("Cannot get element of size 0 Set")
  let v = set.values().next().value
  if(v == null) throw Error(`Expected element in Set, ${set}, found ${v}`)
  return v;
}
export function nextPlayer() {
  currentPlayer = (currentPlayer + 1) % players.length;
}
