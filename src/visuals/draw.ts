export const PLAYING_CARD_CHARACTERS = [
  // Back
  "\u{1F0A0}",
  // Trumps / joker
  "\u{1F0D0}",

  // Spades
  "\u{1F0A1}", "\u{1F0A2}", "\u{1F0A3}", "\u{1F0A4}", "\u{1F0A5}",
  "\u{1F0A6}", "\u{1F0A7}", "\u{1F0A8}", "\u{1F0A9}", "\u{1F0AA}",
  "\u{1F0AB}", "\u{1F0AC}", "\u{1F0AD}", "\u{1F0AE}",

  // Hearts
  "\u{1F0B1}", "\u{1F0B2}", "\u{1F0B3}", "\u{1F0B4}", "\u{1F0B5}",
  "\u{1F0B6}", "\u{1F0B7}", "\u{1F0B8}", "\u{1F0B9}", "\u{1F0BA}",
  "\u{1F0BB}", "\u{1F0BC}", "\u{1F0BD}", "\u{1F0BE}", "\u{1F0BF}",

  // Diamonds
  "\u{1F0C1}", "\u{1F0C2}", "\u{1F0C3}", "\u{1F0C4}", "\u{1F0C5}",
  "\u{1F0C6}", "\u{1F0C7}", "\u{1F0C8}", "\u{1F0C9}", "\u{1F0CA}",
  "\u{1F0CB}", "\u{1F0CC}", "\u{1F0CD}", "\u{1F0CE}", "\u{1F0CF}",

  // Clubs
  "\u{1F0D1}", "\u{1F0D2}", "\u{1F0D3}", "\u{1F0D4}", "\u{1F0D5}",
  "\u{1F0D6}", "\u{1F0D7}", "\u{1F0D8}", "\u{1F0D9}", "\u{1F0DA}",
  "\u{1F0DB}", "\u{1F0DC}", "\u{1F0DD}", "\u{1F0DE}", "\u{1F0DF}",

  // Tarot trumps
  "\u{1F0E0}", "\u{1F0E1}", "\u{1F0E2}", "\u{1F0E3}", "\u{1F0E4}",
  "\u{1F0E5}", "\u{1F0E6}", "\u{1F0E7}", "\u{1F0E8}", "\u{1F0E9}",
  "\u{1F0EA}", "\u{1F0EB}", "\u{1F0EC}", "\u{1F0ED}", "\u{1F0EE}",
  "\u{1F0EF}", "\u{1F0F0}", "\u{1F0F1}", "\u{1F0F2}", "\u{1F0F3}",
  "\u{1F0F4}", "\u{1F0F5}",
] as const;

export class Shape {
  constructor(
    /** (px) */ public x: number,
    /** (px) */ public y: number,
    /** fill colour */ public f: string = "white",
    /** stroke colour */ public s: string = "black",
  ) { }
  draw(context: CanvasRenderingContext2D): void {
    context.fillStyle = this.f;
    context.fillRect(
      this.x, 
      this.y, 
      1, 1
    );
  }
}

export function drawShapeOnCanvas(
  canvas: HTMLCanvasElement,
  shape: Shape,
): void {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not get a 2D rendering context from the canvas.");
  }
  context.beginPath();
  shape.draw(context);
  context.stroke();
  context.fill();
}

export function getCharacterWidth(
  context: CanvasRenderingContext2D,
  character: string,
): number {
  return context.measureText(character).width;
}
export class Circle extends Shape {
  constructor(
    x: number,
    y: number,
    /** radius */ public r: number = 10,
    f: string = "white",
    s: string = "black",
  ) { super(x, y, f, s); }
  draw(context: CanvasRenderingContext2D): void {
    context.fillStyle = this.f;
    context.strokeStyle = this.s;
    context.arc(
      this.x, 
      this.y, 
      this.r, 
      0, 
      2 * Math.PI
    );
  }
}
export class Rect extends Shape {
  constructor(
    x: number,
    y: number,
    /** width (px) */ public w: number = 10,
    /** height (px) */ public h: number = 10,
    f: string = "white",
    s: string = "black",
  ) { super(x, y, f, s); }
  draw(context: CanvasRenderingContext2D): void {
    context.fillStyle = this.f;
    context.strokeStyle = this.s;
    context.rect(
      this.x, 
      this.y, 
      this.w,
      this.h
    );
  }
}
export class Card extends Rect {
  suit: number;
  value: number;
  constructor(
    /** card ID */ public id: number,
    x: number,
    y: number,
    w: number = 10,
    h: number = 10,
    f: string = "black",
    s: string = "black",
  ) {
    super(x, y, w, h);
    this.suit = id % 4;
    this.value = id % 13;
  }
  draw(context: CanvasRenderingContext2D): void {
    
    context.beginPath();
    super.draw(context);
    context.stroke();
    context.fill();
    const character = PLAYING_CARD_CHARACTERS[this.id] ?? "?";

    context.fillStyle = "black";
    context.strokeStyle = this.s;
    context.font = `${this.h}px monospace`;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(character, this.x, this.y);
  }
}
function getCharacterRatio(
  context: CanvasRenderingContext2D,
  character: string,
): number {
  const metrics = context.measureText(character);
  const width = metrics.width;
  const height =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

  return height === 0 ? 0 : width / height;
}


export function runDrawTest(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not get a 2D rendering context from the canvas.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const card = new Card(34, 100, 100, 100, 160, "black", "black");
  card.draw(context);
}
