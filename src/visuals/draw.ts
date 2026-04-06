import { canvas, context, stack } from "../main.js";
import {
  getCachedUnicodeCardImage,
  loadUnicodeCardImage,
} from "./unicodeCards.js";

export class Shape {
  constructor(
    /** (px) */ public x: number,
    /** (px) */ public y: number,
    /** fill colour */ public f: string = "black",
    /** stroke colour */ public s: string = "black",
    /** click Behaviour */ public onClick: (...args: any) => void = () => {},
  ) { }
  draw(){
    context.beginPath();
    context.fillStyle = this.f;
    context.strokeStyle = this.s;
    this.path();
    context.stroke();
    context.fill();
  }
  path(): void {
    context.fillRect(
      this.x, 
      this.y, 
      1, 1
    );
  }
}
export class TextShape extends Shape {
  constructor(
    x: number,
    y: number,
    /** rendered text */ public txt: string,
    f: string = "black",
    s: string = "black",
  ){super(x,y,f,s)}
  path(): void{
    context.fillText(
      this.txt,
      this.x,
      this.y
    );
  }
}
export class Circle extends Shape {
  constructor(
    x: number,
    y: number,
    /** radius */ public r: number = 10,
    f: string = "black",
    s: string = "black",
  ) { super(x, y, f, s); }
  path(): void {
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
    f: string = "black",
    s: string = "black",
  ) { super(x, y, f, s); }
  path(): void {
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
  isActive: boolean = false;
  constructor(
    /** card ID */ public id: number,
    x: number,
    y: number,
    w: number,
    h: number,
    public onClick: (...args: any) => any = () => {},
  ) {
    super(x, y, w, h,"white","white");
    this.suit = id % 4;
    this.value = id % 13;
  }
  path(): void {
    const unicodeCardImage = getCachedUnicodeCardImage(this.id);

    if (unicodeCardImage) {
      context.drawImage(unicodeCardImage, this.x, this.y, this.w, this.h);
      return;
    }

    if (unicodeCardImage === undefined) {
      void loadUnicodeCardImage(this.id).then((loadedImage) => {
        if (loadedImage) {
          this.path();
        }
      });
    }
  }
}

