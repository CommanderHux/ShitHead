// @ts-nocheck
import { Card, TextShape } from "./visuals/draw.js";
import { CARD_COUNT_LABEL_OFFSET_Y, CARD_H, CARD_STACK_X_GAP, CARD_STACK_Y_GAP, CARD_W, COLOR_TEXT_BLACK, } from "./visuals/cardSize.js";
import { CARD_BACK_ID } from "./visuals/unicodeCards.js";
import { discardPile, drawPile, getPlayer, stack, nextPlayer } from "./main.js";
import { getIdValue } from "./player.js";
export class Deck {
    x;
    y;
    cardIDs;
    visible;
    hidden;
    clickable;
    onDown;
    onUp;
    /** Visual Cards */
    cards = [];
    constructor(x, y, cardIDs, visible = 3, hidden = false, clickable = false, onDown = () => { }, onUp = () => { }) {
        this.x = x;
        this.y = y;
        this.cardIDs = cardIDs;
        this.visible = visible;
        this.hidden = hidden;
        this.clickable = clickable;
        this.onDown = onDown;
        this.onUp = onUp;
        this.updateCards();
    }
    changeClickable(val) {
        this.clickable = val;
        if (val)
            this.cards.forEach(card => stack.add(card));
        else
            this.cards.forEach(card => stack.delete(card));
    }
    updateCards() {
        let max = Math.min(this.cardIDs.length, this.visible);
        if (this.cards.length == max)
            return;
        if (this.cards.length < max) {
            this.cards.push(...Array.from({ length: max - this.cards.length }, (_, i) => {
                let c = new Card(this.visible ?
                    CARD_BACK_ID :
                    this.cardIDs.at(-1 - i) ?? CARD_BACK_ID, this.x + ((this.cards.length + i) % 5) * CARD_STACK_X_GAP, this.y + (Math.floor((this.cards.length + i) / 5)) * CARD_STACK_Y_GAP, CARD_W, CARD_H);
                if (this.clickable)
                    stack.add(c);
                return c;
            }));
        }
        if (this.cards.length > max) {
            this.cards
                .splice(max)
                .forEach((card) => {
                stack.delete(card);
            });
        }
    }
    draw() {
        this.updateCards();
        if (this.cardIDs.length == 0)
            return;
        this.cards.forEach((card, i) => {
            const cardID = this.cardIDs.at(-1 - i) ?? CARD_BACK_ID;
            card.cardID = cardID;
            card.id = this.hidden ?
                CARD_BACK_ID :
                cardID;
            card.onDown = () => this.onDown(cardID);
            card.onUp = () => this.onUp(cardID);
            card.draw();
        });
        new TextShape(this.x, this.y + CARD_COUNT_LABEL_OFFSET_Y, `${this.cardIDs.length}`, "right", "top", COLOR_TEXT_BLACK, COLOR_TEXT_BLACK).draw();
    }
    sort(byvalue = true) {
        this.cards.forEach(card => card.active = false);
        if (byvalue)
            this.cardIDs.sort((a, b) => getIdValue(b) - getIdValue(a));
        else
            this.cardIDs.sort((a, b) => b - a);
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
export class Discard extends Deck {
    x;
    y;
    constructor(x, y) {
        super(x, y, [], 1, false, true);
        this.x = x;
        this.y = y;
        this.onDown = this.pickUp;
        this.updateCards();
    }
    pickUp(value, lastValue) {
        const cur = getPlayer();
        const hand = cur.current();
        hand.cards.forEach((card) => card.active = false);
        cur.play.clear();
        // Manual pickup (clicking discard) always collects the pile.
        if (value == null || lastValue == null) {
            this.moveDiscardToHand(cur);
            nextPlayer();
            return;
        }
        const validPlacement = PlacementRules.some((rule) => rule(value, lastValue));
        if (!validPlacement) {
            this.moveDiscardToHand(cur);
            nextPlayer();
            return;
        }
        const shouldBurn = BurnRules.some((rule) => rule(this.cardIDs));
        if (shouldBurn)
            this.burn();
        nextPlayer();
    }
    playHand() {
        let cur = getPlayer();
        if (cur.play.size > 0) {
            let hand = cur.current();
            let ids = [...cur.play.values()];
            let value = getIdValue(ids[0] ?? -1);
            let lastValue = getIdValue(this.cardIDs.at(-1) ?? -1);
            discardPile.cardIDs.push(...ids);
            hand.cardIDs = hand.cardIDs.filter((id) => !ids.includes(id));
            hand.cards.forEach((card) => card.active = false);
            cur.play.clear();
            if (cur.hand.cardIDs.length == 0) {
                if (cur.up.cardIDs.length == 0)
                    cur.down.changeClickable(true);
                else
                    cur.up.changeClickable(true);
            }
            this.pickUp(value, lastValue);
            if (cur.hand.cardIDs.length < 3 && drawPile.cardIDs.length > 0) {
                let deficit = Math.min(3 - cur.hand.cardIDs.length, drawPile.cardIDs.length);
                cur.hand.cardIDs.push(...drawPile.getCards(deficit));
            }
        }
    }
    playDraw() {
        let id = drawPile.getCard();
        let value = getIdValue(id);
        let lastValue = getIdValue((this.cardIDs.at(-1) ?? -1));
        discardPile.cardIDs.push(id);
        this.pickUp(value, lastValue);
    }
    burn() {
        discardPile.cardIDs = [];
    }
    moveDiscardToHand(cur = getPlayer()) {
        cur.hand.cardIDs.push(...discardPile.cardIDs);
        if (cur.hand.cardIDs.length > 0) {
            cur.up.changeClickable(false);
            cur.down.changeClickable(false);
        }
        this.burn();
    }
}
/** All valid combinations of last and current value */
export const PlacementRules = [
    /** 2 goes on anything */
    (value, lastValue) => value == 0,
    /** 10 goes on anything */
    (value, lastValue) => value == 8,
    /** if last card is 7 play under */
    (value, lastValue) => lastValue == 5 ?
        value <= lastValue :
        value >= lastValue,
];
/** All cases of Burning */
export const BurnRules = [
    /** 4 Cards in a row */
    (ids) => {
        if (ids.length < 4)
            return false;
        return new Set(ids.slice(-4).map((id) => getIdValue(id))).size == 1;
    },
    /** Last Card is a 10 */
    (ids) => getIdValue(ids.at(-1)) == 8
];
//# sourceMappingURL=deck.js.map