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
export let draw = new Draw(50, 100);
export let discard = new Discard(125,100);
let currentPlayer: number = 0;
let players = [
  new Player(100, 200, {
    up: draw.getCards(3),
    down: draw.getCards(3),
    hand: draw.getCards(3),
  })
]

let playButton = new TextBox(50,350,50,24,"Play");


stack.add(playButton)
playButton.onDown = () => {
  playButton.f = "red";
  discard.playHand();
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
  draw.draw();
  discard.draw();
  playButton.draw();
  requestAnimationFrame(update);
}

export function onMouseDown(mouse: MouseEvent) {
  let x = mouse.offsetX / dpr;
  let y = mouse.offsetY / dpr;
  const shapes = [...stack.values()].reverse();
  for (const shape of shapes) {
    if (!inRange(x, y, shape.x, shape.y, shape.w, shape.h)) continue;
    if (shape instanceof Card)
      shape.onDown(shape);
    else if (shape instanceof Rect)
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
