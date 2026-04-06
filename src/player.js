import { getPlayer, getElement } from "./main.js";
import { Deck } from "./deck.js";
export class Player {
    x;
    y;
    cards;
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
                    cur.play.delete(card.id);
                    card.active = false;
                    return;
                }
                if (cur.play.size == 0 || (getElement(cur.play) ?? -1) % 13 == card.id % 13) {
                    cur.play.add(card.id);
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
export class AI extends Player {
}
//# sourceMappingURL=player.js.map