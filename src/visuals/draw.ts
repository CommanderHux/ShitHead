import { canvas, context, stack } from "../main.js";
import {
  getCachedUnicodeCardImage,
} from "./unicodeCards.js";

export class Shape {
  constructor(
    /** (px) */ public x: number,
    /** (px) */ public y: number,
    /** fill colour */ public f: string = "black",
    /** stroke colour */ public s: string = "black",
    /** click Behaviour */ public onDown: (...args: any) => void = () => { },
    /** mouse up behaviour */ public onUp: (...args: any) => void = () => { },
  ) { }
  draw() {
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
    public a: CanvasTextAlign = "left",
    public b: CanvasTextBaseline = "top",
    f: string = "black",
    s: string = "black",

  ) { super(x, y, f, s) }
  path(): void {
    context.textAlign = this.a;
    context.textBaseline = this.b;
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
    onDown: (...args: any) => void = () => { },
    onUp: (...args: any) => void = () => { },
  ) { super(x, y, f, s, onDown, onUp); }
  path(): void {
    context.rect(
      this.x,
      this.y,
      this.w,
      this.h
    );
  }
}
export class TextBox extends Rect {
  constructor(
    x: number,
    y: number,
    w: number = 10,
    h: number = 10,
    public txt: string,
    f: string = "black",
    s: string = "black",
    public txtf: string = "white",
    public txts: string = "white",

  ) { super(x, y, w, h, f, s) }
  path(): void {
    new Rect(this.x, this.y, this.w, this.h, this.f, this.s).draw();
    new TextShape(this.x + this.w / 2, this.y + this.h / 2, this.txt, "center", "middle",this.txtf, this.txts).draw()
  }
}
export class Card extends Rect {
  suit: number;
  value: number;
  cardID: number;
  active: boolean = false;
  constructor(
    /** card ID */ public id: number,
    x: number,
    y: number,
    w: number,
    h: number,
    onDown: (...args: any) => any = () => { },
    onUp: (...args: any) => any = () => { },
  ) {
    super(x, y, w, h, "white", "white", onDown, onUp);
    this.cardID = id;
    this.suit = id % 4;
    this.value = id % 13;
  }
  path(): void {
    const unicodeCardImage = getCachedUnicodeCardImage(this.id);

    if (unicodeCardImage) {
      context.drawImage(unicodeCardImage, this.x, this.active ? this.y : this.y + 10, this.w, this.h);
    }
  }
}
