import { Deck, Draw, Player, } from "./player.js"
import { Shape, Rect, Circle, Card } from "./visuals/draw.js";
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

  canvas.addEventListener("mouseup", onMouseDown)
}



export let stack: Set<Rect> = new Set([]);
SetupCanvas();
export let draw = new Draw(50, 100);
export let discard = new Deck(125,100,[])
let currentPlayer: number = 0;
let players = [
  new Player(100, 200, {
    up: draw.getCards(3),
    down: draw.getCards(3),
    hand: draw.getCards(3),
  })
]

let deal = new Rect(50,450,50,24);


stack.add(deal)
deal.onClick = () => {
  deal.f = deal.f == "red" ? "black" : "red";
  let cur = getPlayer();
  if(cur.play.size > 0){
    //Fix set implementation
    let vals = cur.play;
    discard.cardIDs.push(...vals.map(c => c.id))
    cur.cards.hand.cards.difference(vals)
    cur.play.clear();
    
  }
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
  deal.draw();
  requestAnimationFrame(update);
}
//When deal is pressed, add cards to everyone's hand
//Then draw the hand
export function onMouseDown(mouse: MouseEvent) {
  let x = mouse.offsetX / dpr;
  let y = mouse.offsetY / dpr;
  [...stack.values()].forEach(shape => {
    if(inRange(x,y,shape.x,shape.y,shape.w,shape.h)){
      if(shape instanceof Card)
        shape.onClick(shape);
      else if(shape instanceof Rect){
        shape.onClick();
      }
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
export function getPlayer(): Player{
  let cur = players[currentPlayer]
  if (cur == null) throw Error(`No Current Player, ${currentPlayer}, found ${cur}`)
  return cur;
}
