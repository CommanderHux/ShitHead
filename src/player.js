import { Card, TextShape } from "./visuals/draw.js";
import { CARD_BACK_ID } from "./visuals/unicodeCards.js";
import { stack, getPlayer } from "./main.js";
export class Deck {
    x;
    y;
    cardIDs;
    visible;
    hidden;
    clickable;
    onClick;
    cards = new Set;
    constructor(x, y, cardIDs, visible = 3, hidden = false, clickable = false, onClick = () => { }) {
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
        let max = Math.min(this.cardIDs.length, this.visible);
        if (this.cards.size == max)
            return;
        if (this.cards.size < max) {
            this.cards.union(new Set(Array.from({ length: max - this.cards.size }, (_, i) => {
                let c = new Card(this.visible ?
                    CARD_BACK_ID :
                    this.cardIDs.at(-1 - i) ?? CARD_BACK_ID, this.x + (this.cards.size * 50 + i * 50), this.y, 50, 100, this.onClick);
                if (this.clickable)
                    stack.add(c);
                return c;
            })));
        }
    }
    draw() {
        this.updateCards();
        if (this.cardIDs.length == 0)
            return;
        this.cards.values().forEach((card, i) => {
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
    cards;
    playVal = -1;
    play = new Set();
    constructor(x, y, cardIDs) {
        this.x = x;
        this.y = y;
        this.cards = {
            down: new Deck(this.x, this.y, cardIDs.down, 3, true, false),
            up: new Deck(this.x, this.y + 25, cardIDs.up, 3, false, false),
            hand: new Deck(this.x, this.y + 125, cardIDs.hand, 3, false, true, (card) => {
                let cur = getPlayer();
                if (card.active) {
                    cur.play.delete(card);
                    card.active = false;
                    if (cur?.play.size == 0)
                        cur.playVal = -1;
                    return;
                }
                if (cur.playVal < 0 || cur.playVal == card.id % 13) {
                    cur.play.add(card);
                    cur.playVal = card.id % 13;
                    card.active = true;
                }
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