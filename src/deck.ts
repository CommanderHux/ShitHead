import { Card, TextShape } from "./visuals/draw.js";
import { CARD_BACK_ID } from "./visuals/unicodeCards.js";
import { discard, getPlayer, stack, nextPlayer } from "./main.js"

export class Deck {
    /** Visual Cards */
    cards: Card[] = [];
    constructor(
        public x: number,
        public y: number,
        public cardIDs: number[],
        public visible: number = 3,
        public hidden: boolean = false,
        public clickable: boolean = false,
        public onDown: (...args: any) => void = () => { },
        public onUp: (...args: any) => void = () => { },
    ) { this.updateCards() }
    updateCards() {
        let max = Math.min(this.cardIDs.length, this.visible)
        if (this.cards.length == max) return;
        if (this.cards.length < max) {
            this.cards.push(...Array.from({ length: max - this.cards.length }, (_, i) => {
                let c = new Card(
                    this.visible ?
                        CARD_BACK_ID :
                        this.cardIDs.at(-1 - i) ?? CARD_BACK_ID,
                    this.x + (this.cards.length * 50 + i * 50),
                    this.y,
                    50, 100, this.onDown, this.onUp
                )
                if (this.clickable) stack.add(c)
                return c;
            }))
        }
        if (this.cards.length > max){
            this.cards
            .splice(max)
            .forEach((card) => {
                stack.delete(card);
            })
        }
    }
    draw() {
        this.updateCards();
        if (this.cardIDs.length == 0) return;
        this.cards.forEach((card, i) => {
            card.id = this.hidden ?
                CARD_BACK_ID :
                this.cardIDs.at(-1 - i) ?? CARD_BACK_ID
            card.draw();
        })
        new TextShape(this.x, this.y, `${this.cardIDs.length}`).draw();
    }
    sort(byvalue?: boolean) {
        if (byvalue) this.cardIDs.sort((a, b) => (a % 13) - (b % 13))
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
    constructor(
        public x: number,
        public y: number,
    ) {

        let cardIDs = Array.from({ length: 52 }, (_, i) => i);
        super(x, y, cardIDs, 1, true, true);
        this.randomise();
    }

    getCards = (amt: number): number[] => Array.from({ length: amt }, () => this.getCard());
    getCard(): number {
        if (this.cardIDs.length === 0) throw new Error(`Tried to get card when deck is 0`)

        const index = Math.floor(Math.random() * this.cardIDs.length);
        const [card] = this.cardIDs.splice(index, 1);
        if (card != null) return card;
        else throw new Error(`No card at index ${index}, found: ${card}`);
    }
}
export class Discard extends Deck {
    constructor(
        public x: number,
        public y: number,
    ) {
        super(x, y, [], 1, false, true, () => {
            let cur = getPlayer();
            cur.cards.hand.cardIDs.push(...discard.cardIDs);
            discard.cardIDs = [];
        });
        this.updateCards();
    }
    playHand(){
        let cur = getPlayer();
        if(cur.play.size > 0){
            //Fix set implementation
            let ids = [...cur.play.values()];
            discard.cardIDs.push(...ids)
            cur.cards.hand.cardIDs = cur.cards.hand.cardIDs.filter((id) => !ids.includes(id))
            cur.cards.hand.cards.forEach((card) => card.active = false)
            cur.play.clear();
        }
        nextPlayer();
    }
    
}
