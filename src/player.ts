import { Card } from "./visuals/draw.js";
import { CARD_BACK_ID } from "./visuals/unicodeCards.js";
export class Deck {
    cards: number[];
    constructor(
        public x: number,
        public y: number,
    ) {
        this.cards = Array.from({length: 52}, (_,i) => i);
    }
    draw(){
        new Card(
                CARD_BACK_ID,
                this.x, 
                this.y, 
                50, 100
            ).draw()
    }

    getCards = (amt: number):number[] => Array.from({length: amt}, () => this.getCard());
    getCard(): number {
        if (this.cards.length === 0) {
            return -1;
        }

        const index = Math.floor(Math.random() * this.cards.length);
        const [card] = this.cards.splice(index, 1);
        return card ?? -1;
    }
}

export class Player {
    constructor(
        public x: number,
        public y: number,
        public cards: {
            up: number[],
            down: number[],
            hand: number[],
        },
    ) { }
    draw() {
        this.cards.down.forEach((card, i) =>
            new Card(
                CARD_BACK_ID,
                i * 50 + this.x, 
                this.y + 200, 
                50, 100
            ).draw()
        );
        this.cards.up.forEach((card, i) =>
            new Card(
                card, 
                i * 50 + this.x, 
                this.y + 100, 
                50, 100
            ).draw()
        );
        this.cards.hand.forEach((card, i) =>
            new Card(
                card, 
                i * 50 + this.x, 
                this.y, 
                50, 100
            ).draw()
        );
    }
}
