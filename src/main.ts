import { Deck, Player } from "./player.js"
import { initMouse, mouse } from "./input/mouse.js";

export const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const cxt = canvas.getContext("2d");
if (!cxt) throw new Error("couldn't find canvas context")
export const context = cxt;
initMouse(canvas);
(window as Window & { mouse?: typeof mouse }).mouse = mouse;

const dpr = window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();

canvas.width = Math.round(rect.width * dpr);
canvas.height = Math.round(rect.height * dpr);

context.setTransform(dpr, 0, 0, dpr, 0, 0);
context.imageSmoothingEnabled = true;
context.imageSmoothingQuality = "high";

let deck = new Deck(50,0);
let player = new Player(100, 100, {
  up: deck.getCards(3),
  down: deck.getCards(3),
  hand: deck.getCards(3),
})
player.draw();
deck.draw();
//When deal is pressed, add cards to everyone's hand
//Then draw the hand
