import { canvas, context } from "../main.js";
import {
  getCachedUnicodeCardImage,
  loadUnicodeCardImage,
} from "./unicodeCards.js";

export class Shape {
  constructor(
    /** (px) */ public x: number,
    /** (px) */ public y: number,
    /** fill colour */ public f: string = "white",
    /** stroke colour */ public s: string = "black",
  ) { }
  draw(): void {
    context.fillStyle = this.f;
    context.fillRect(
      this.x, 
      this.y, 
      1, 1
    );
  }
}

export function drawShapeOnCanvas(
  shape: Shape,
): void {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not get a 2D rendering context from the canvas.");
  }
  context.beginPath();
  shape.draw();
  context.stroke();
  context.fill();
}

export function getCharacterWidth(
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
  draw(): void {
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
  draw(): void {
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
  ) {
    super(x, y, w, h);
    this.suit = id % 4;
    this.value = id % 13;
  }
  draw(): void {
    //new Rect(this.x,this.y,this.w,this.h).draw();

    const unicodeCardImage = getCachedUnicodeCardImage(this.id);

    if (unicodeCardImage) {
      context.drawImage(unicodeCardImage, this.x, this.y, this.w, this.h);
      return;
    }

    if (unicodeCardImage === undefined) {
      void loadUnicodeCardImage(this.id).then((loadedImage) => {
        if (loadedImage) {
          this.draw();
        }
      });
    }
  }
}

