import { context } from "../main.js";
import { getCachedUnicodeCardImage, loadUnicodeCardImage, } from "./unicodeCards.js";
export class Shape {
    x;
    y;
    f;
    s;
    onClick;
    constructor(
    /** (px) */ x, 
    /** (px) */ y, 
    /** fill colour */ f = "black", 
    /** stroke colour */ s = "black", 
    /** click Behaviour */ onClick = () => { }) {
        this.x = x;
        this.y = y;
        this.f = f;
        this.s = s;
        this.onClick = onClick;
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
    constructor(x, y, 
    /** rendered text */ txt, f = "black", s = "black") {
        super(x, y, f, s);
        this.txt = txt;
    }
    path() {
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
    /** height (px) */ h = 10, f = "black", s = "black") {
        super(x, y, f, s);
        this.w = w;
        this.h = h;
    }
    path() {
        context.rect(this.x, this.y, this.w, this.h);
    }
}
export class Card extends Rect {
    id;
    onClick;
    suit;
    value;
    isActive = false;
    constructor(
    /** card ID */ id, x, y, w, h, onClick = () => { }) {
        super(x, y, w, h, "white", "white");
        this.id = id;
        this.onClick = onClick;
        this.suit = id % 4;
        this.value = id % 13;
    }
    path() {
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
//# sourceMappingURL=draw.js.map