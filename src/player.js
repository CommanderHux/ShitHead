import { Card } from "./visuals/draw.js";
import { CARD_BACK_ID } from "./visuals/unicodeCards.js";
export class Deck {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.getCards = (amt) => Array.from({ length: amt }, () => this.getCard());
        this.cards = Array.from({ length: 52 }, (_, i) => i);
    }
    draw() {
        new Card(CARD_BACK_ID, this.x, this.y, 50, 100).draw();
    }
    getCard() {
        if (this.cards.length === 0) {
            return -1;
        }
        const index = Math.floor(Math.random() * this.cards.length);
        const [card] = this.cards.splice(index, 1);
        return card ?? -1;
    }
}
export class Player {
    constructor(x, y, cards) {
        this.x = x;
        this.y = y;
        this.cards = cards;
    }
    draw() {
        this.cards.down.forEach((card, i) => new Card(CARD_BACK_ID, i * 50 + this.x, this.y + 200, 50, 100).draw());
        this.cards.up.forEach((card, i) => new Card(card, i * 50 + this.x, this.y + 100, 50, 100).draw());
        this.cards.hand.forEach((card, i) => new Card(card, i * 50 + this.x, this.y, 50, 100).draw());
    }
}
//# sourceMappingURL=player.js.map