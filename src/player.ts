import { Card } from "./visuals/draw.js";
import { getPlayer, getElement } from "./main.js"
import { Deck } from "./deck.js";

export class Player {
    up: Deck;
    down: Deck;
    hand: Deck;
    play: Set<number> = new Set();
    constructor(
        public x: number,
        public y: number,
        cardIDs: {
            up: number[],
            down: number[],
            hand: number[],
        }
    ) {
        let click = (cardID: number) => {
                let cur = getPlayer();
                let Hand = cur.current();
                let card = Hand.cards.find((c) => c.cardID === cardID);
                if (card == null) return;
                if (card.active) {
                    cur.play.delete(cardID);
                    card.active = false;
                    return;
                }
                if (cur.play.size == 0 || (getElement(cur.play) ?? -1) % 13 == cardID % 13) {
                    cur.play.add(cardID);
                    card.active = true;
                }
            }
        this.down = new Deck(
            this.x, this.y,
            cardIDs.down,
            3, true,
            false, click
        );
        this.up = new Deck(
            this.x, this.y + 25,
            cardIDs.up,
            3, false,
            false, click
        );
        this.hand = new Deck(
            this.x, this.y + 125,
            cardIDs.hand,
            Infinity, false,
            true, click
        );
    }
    draw() {
        this.down.draw()
        this.up.draw()
        this.hand.draw();
    }
    current(): Deck{
        if(this.hand.cardIDs.length > 0) return this.hand;
        if(this.up.cardIDs.length > 0) return this.up;
        else return this.down;
    }
}
export class AI extends Player {}
