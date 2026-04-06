import { context } from "../main.js";
import { getCachedUnicodeCardImage, } from "./unicodeCards.js";
export class Shape {
    x;
    y;
    f;
    s;
    onDown;
    onUp;
    constructor(
    /** (px) */ x, 
    /** (px) */ y, 
    /** fill colour */ f = "black", 
    /** stroke colour */ s = "black", 
    /** click Behaviour */ onDown = () => { }, 
    /** mouse up behaviour */ onUp = () => { }) {
        this.x = x;
        this.y = y;
        this.f = f;
        this.s = s;
        this.onDown = onDown;
        this.onUp = onUp;
    }
    draw() {
        context.beginPath();
        context.fillStyle = this.f;
        context.strokeStyle = this.s;
        this.path();
        context.stroke();
        context.fill();
    }
    path() {
        context.fillRect(this.x, this.y, 1, 1);
    }
}
export class TextShape extends Shape {
    txt;
    a;
    b;
    constructor(x, y, 
    /** rendered text */ txt, a = "left", b = "top", f = "black", s = "black") {
        super(x, y, f, s);
        this.txt = txt;
        this.a = a;
        this.b = b;
    }
    path() {
        context.textAlign = this.a;
        context.textBaseline = this.b;
        context.fillText(this.txt, this.x, this.y);
    }
}
export class Circle extends Shape {
    r;
    constructor(x, y, 
    /** radius */ r = 10, f = "black", s = "black") {
        super(x, y, f, s);
        this.r = r;
    }
    path() {
        context.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
    }
}
export class Rect extends Shape {
    w;
    h;
    constructor(x, y, 
    /** width (px) */ w = 10, 
    /** height (px) */ h = 10, f = "black", s = "black", onDown = () => { }, onUp = () => { }) {
        super(x, y, f, s, onDown, onUp);
        this.w = w;
        this.h = h;
    }
    path() {
        context.rect(this.x, this.y, this.w, this.h);
    }
}
export class TextBox extends Rect {
    txt;
    txtf;
    txts;
    constructor(x, y, w = 10, h = 10, txt, f = "black", s = "black", txtf = "white", txts = "white") {
        super(x, y, w, h, f, s);
        this.txt = txt;
        this.txtf = txtf;
        this.txts = txts;
    }
    path() {
        new Rect(this.x, this.y, this.w, this.h, this.f, this.s).draw();
        new TextShape(this.x + this.w / 2, this.y + this.h / 2, this.txt, "center", "middle", this.txtf, this.txts).draw();
    }
}
export class Card extends Rect {
    id;
    suit;
    value;
    cardID;
    active = false;
    constructor(
    /** card ID */ id, x, y, w, h, onDown = () => { }, onUp = () => { }) {
        super(x, y, w, h, "white", "white", onDown, onUp);
        this.id = id;
        this.cardID = id;
        this.suit = id % 4;
        this.value = id % 13;
    }
    path() {
        const unicodeCardImage = getCachedUnicodeCardImage(this.id);
        if (unicodeCardImage) {
            context.drawImage(unicodeCardImage, this.x, this.active ? this.y : this.y + 10, this.w, this.h);
        }
    }
}
//# sourceMappingURL=draw.js.map