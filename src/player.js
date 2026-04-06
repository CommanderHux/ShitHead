import { Card, TextShape } from "./visuals/draw.js";
import { CARD_BACK_ID } from "./visuals/unicodeCards.js";
import { stack } from "./main.js";
export class Deck {
    x;
    y;
    cardIDs;
    visible;
    hidden;
    clickable;
    onClick;
    cards = [];
    constructor(x, y, cardIDs, visible = 0, hidden = false, clickable = false, onClick) {
        this.x = x;
        this.y = y;
        this.cardIDs = cardIDs;
        this.visible = visible;
        this.hidden = hidden;
        this.clickable = clickable;
        this.onClick = onClick;
        this.updateCards();
    }
    updateCards() {
        if (this.cardIDs.length >= this.visible)
            return;
        let max = Math.max(this.cardIDs.length, this.visible);
        if (this.cards.length == max)
            return;
        if (this.cards.length < max) {
            this.cards.push(...Array.from({ length: max - this.cards.length }, (_, i) => {
                let c = new Card(this.visible ?
                    CARD_BACK_ID :
                    this.cardIDs.at(-1 * i) ?? CARD_BACK_ID, this.x + (this.cards.length + i * 50), this.y, 50, 100);
                if (this.clickable)
                    stack.add(c);
                return c;
            }));
        }
        if (this.cards.length > max)
            this.cards
                .splice(this.cardIDs.length)
                .forEach(card => stack.delete(card));
    }
    draw() {
        this.updateCards();
        if (this.cardIDs.length == 0)
            return;
        this.cards.forEach((card, i) => {
            card.id = this.hidden ?
                CARD_BACK_ID :
                this.cardIDs.at(-1 - i) ?? CARD_BACK_ID;
            card.draw();
        });
        new TextShape(this.x, this.y, `${this.cardIDs.length}`).draw();
    }
    sort(byvalue) {
        if (byvalue)
            this.cardIDs.sort((a, b) => (a % 13) - (b % 13));
        this.cardIDs.sort((a, b) => a - b);
    }
    randomise() {
        for (let i = this.cardIDs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cardIDs[i], this.cardIDs[j]] = [this.cardIDs[j] ?? -1, this.cardIDs[i] ?? -1];
        }
    }
}
export class Draw extends Deck {
    x;
    y;
    constructor(x, y) {
        let cardIDs = Array.from({ length: 52 }, (_, i) => i);
        super(x, y, cardIDs, 1, true, true);
        this.x = x;
        this.y = y;
        this.randomise();
    }
    getCards = (amt) => Array.from({ length: amt }, () => this.getCard());
    getCard() {
        if (this.cardIDs.length === 0)
            throw new Error(`Tried to get card when deck is 0`);
        const index = Math.floor(Math.random() * this.cardIDs.length);
        const [card] = this.cardIDs.splice(index, 1);
        if (card != null)
            return card;
        else
            throw new Error(`No card at index ${index}, found: ${card}`);
    }
}
export class Player {
    x;
    y;
    cardIDs;
    cards;
    constructor(x, y, cardIDs) {
        this.x = x;
        this.y = y;
        this.cardIDs = cardIDs;
        this.cards = {
            play: new Deck(this.x, this.y, []),
            down: new Deck(this.x, this.y, this.cardIDs.down, 3, true, false),
            up: new Deck(this.x, this.y + 100, this.cardIDs.up, 3, false, false),
            hand: new Deck(this.x, this.y + 200, this.cardIDs.hand, 3, false, true, () => {
                this.cards.play.cardIDs.push();
                return;
            }),
        };
    }
    draw() {
        this.cards.down.draw();
        this.cards.up.draw();
        this.cards.hand.draw();
    }
}
//# sourceMappingURL=player.js.map