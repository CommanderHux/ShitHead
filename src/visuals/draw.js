import { canvas, context } from "../main.js";
import { getCachedUnicodeCardImage, loadUnicodeCardImage, } from "./unicodeCards.js";
export class Shape {
    constructor(
    /** (px) */ x, 
    /** (px) */ y, 
    /** fill colour */ f = "white", 
    /** stroke colour */ s = "black") {
        this.x = x;
        this.y = y;
        this.f = f;
        this.s = s;
    }
    draw() {
        context.fillStyle = this.f;
        context.fillRect(this.x, this.y, 1, 1);
    }
}
export function drawShapeOnCanvas(shape) {
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Could not get a 2D rendering context from the canvas.");
    }
    context.beginPath();
    shape.draw();
    context.stroke();
    context.fill();
}
export function getCharacterWidth(character) {
    return context.measureText(character).width;
}
export class Circle extends Shape {
    constructor(x, y, 
    /** radius */ r = 10, f = "white", s = "black") {
        super(x, y, f, s);
        this.r = r;
    }
    draw() {
        context.fillStyle = this.f;
        context.strokeStyle = this.s;
        context.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
    }
}
export class Rect extends Shape {
    constructor(x, y, 
    /** width (px) */ w = 10, 
    /** height (px) */ h = 10, f = "white", s = "black") {
        super(x, y, f, s);
        this.w = w;
        this.h = h;
    }
    draw() {
        context.fillStyle = this.f;
        context.strokeStyle = this.s;
        context.rect(this.x, this.y, this.w, this.h);
    }
}
export class Card extends Rect {
    constructor(
    /** card ID */ id, x, y, w = 10, h = 10) {
        super(x, y, w, h);
        this.id = id;
        this.suit = id % 4;
        this.value = id % 13;
    }
    draw() {
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
//# sourceMappingURL=draw.js.map