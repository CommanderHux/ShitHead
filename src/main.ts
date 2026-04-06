import { Deck, Draw, Player, } from "./player.js"
import { Shape, Rect, Circle, Card } from "./visuals/draw.js";


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

  canvas.addEventListener("mouseup", onMouseDown)
}

export let stack: Set<Card> = new Set([]);
SetupCanvas();
let draw = new Draw(50, 100);
let player = new Player(100, 200, {
  up: draw.getCards(3),
  down: draw.getCards(3),
  hand: draw.getCards(3),
})
player.draw();
draw.draw();
//When deal is pressed, add cards to everyone's hand
//Then draw the hand
export function onMouseDown(mouse: MouseEvent) {
  let x = mouse.offsetX / dpr;
  let y = mouse.offsetY / dpr;
  
  [...stack.values()].forEach(card => {
    if(inRange(x,y,card.x,card.y,card.w,card.h)){
      card.onClick(card.id);
      new Circle(x,y,5).draw();
    }
  })
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