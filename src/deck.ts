import { Card, TextShape } from "./visuals/draw.js";
import { CARD_BACK_ID } from "./visuals/unicodeCards.js";
import { discardPile, drawPile, getPlayer, stack, nextPlayer } from "./main.js"

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
        public onDown: (cardID: number) => void = () => { },
        public onUp: (cardID: number) => void = () => { },
    ) { this.updateCards() }
    changeClickable(val: boolean) {
        this.clickable = val;
        if(val)
            this.cards.forEach(card => stack.add(card));
        else
            this.cards.forEach(card => stack.delete(card));
    }
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
                    50, 100
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
            const cardID = this.cardIDs.at(-1 - i) ?? CARD_BACK_ID;
            card.cardID = cardID;
            card.id = this.hidden ?
                CARD_BACK_ID :
                cardID;
            card.onDown = () => this.onDown(cardID);
            card.onUp = () => this.onUp(cardID);
            card.draw();
        })
        new TextShape(this.x, this.y+20, `${this.cardIDs.length}`,"right","top","black","black").draw();
    }
    sort(byvalue?: boolean) {
        if (byvalue) this.cardIDs.sort((a, b) => (b % 13) - (a % 13))
        else this.cardIDs.sort((a, b) => b - a);
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
        super(x, y, [], 1, false, true);
        this.onDown = this.pickUp;
        this.updateCards();
    }
    pickUp(){
        let cur = getPlayer();
        let Hand = cur.current();
        cur.hand.cardIDs.push(...discardPile.cardIDs);
        Hand.cards.forEach((card) => card.active = false)
        if(cur.hand.cardIDs.length > 0){
            cur.up.changeClickable(false);
            cur.down.changeClickable(false);
        }
        discardPile.cardIDs = [];   
        this.updateCards();
        cur.hand.updateCards();
        Hand.updateCards();
    }
    playHand(){
        let cur = getPlayer();
        if(cur.play.size > 0){
            let Hand = cur.current();
            let ids = [...cur.play.values()];
            let value = (ids[0] ?? -1) % 13;
            let lastValue = ((this.cardIDs.at(-1) ?? -1) % 13)
            
            discardPile.cardIDs.push(...ids)
            Hand.cardIDs = Hand.cardIDs.filter((id) => !ids.includes(id))
            Hand.cards.forEach((card) => card.active = false)
            cur.play.clear();
            if(cur.hand.cardIDs.length == 0){
                if( cur.up.cardIDs.length == 0)
                    cur.down.changeClickable(true);
                else 
                    cur.up.changeClickable(true);
            }
            /** Pickup Rule */
            if( 
                value < lastValue
            ){ this.pickUp()}

            if(cur.hand.cardIDs.length < 3 && drawPile.cardIDs.length > 0){
                let deficit = Math.min(3 - cur.hand.cardIDs.length, drawPile.cardIDs.length);
                cur.hand.cardIDs.push(...drawPile.getCards(deficit));
            }
        }
        nextPlayer();
    }
    
}
