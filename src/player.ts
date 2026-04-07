import { Card } from "./visuals/draw.js";
import { getPlayer, getElement, discardPile } from "./main.js"
import { BurnRules, Deck, PlacementRules } from "./deck.js";

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
    current(): Deck {
        if (this.hand.cardIDs.length > 0) return this.hand;
        if (this.up.cardIDs.length > 0) return this.up;
        else return this.down;
    }
}
export class AI extends Player {
    constructor(
        x: number,
        y: number,
        cardIDs: {
            up: number[],
            down: number[],
            hand: number[],
        }
    ) {
        super(x, y, cardIDs);
    }
    turn() {
        const hand = this.current();
        const strongest = this.findStrong(hand.cardIDs);
        this.play.clear();
        for (const id of strongest) this.play.add(id);
        discardPile.playHand();
    }
    findStrong(ids: number[]): number[] {
        if (ids.length === 0) return [];

        const grouped = new Map<number, number[]>();
        for (const id of ids) {
            const value = getIdValue(id);
            const current = grouped.get(value);
            if (current == null) grouped.set(value, [id]);
            else current.push(id);
        }

        const topCard = discardPile.cardIDs.at(-1);
        const lastValue = topCard == null ? undefined : getIdValue(topCard);
        const playableValues = [...grouped.keys()].filter((value) => this.canPlace(value, lastValue));
        if (playableValues.length === 0) return [];

        const hasNonWildPlayable = playableValues.some((value) => value !== 0 && value !== 8);

        let bestIds: number[] = [];
        let bestScore = -Infinity;
        for (const value of playableValues) {
            const option = grouped.get(value) ?? [];
            const score = this.scoreOption(ids, value, option.length, lastValue, hasNonWildPlayable);
            if (
                score > bestScore ||
                (score === bestScore && option.length > bestIds.length) ||
                (score === bestScore &&
                    option.length === bestIds.length &&
                    value > (bestIds[0] == null ? -1 : getIdValue(bestIds[0])))
            ) {
                bestScore = score;
                bestIds = [...option];
            }
        }
        return bestIds;
    }
    private canPlace(value: number, lastValue?: number): boolean {
        if (lastValue == null) return true;
        return PlacementRules.some((rule) => rule(value, lastValue));
    }
    private scoreOption(
        ids: number[],
        value: number,
        count: number,
        lastValue: number | undefined,
        hasNonWildPlayable: boolean,
    ): number {
        const discardValues = discardPile.cardIDs.map((id) => getIdValue(id));
        const nextDiscard = [...discardValues, ...Array.from({ length: count }, () => value)];
        const burn = BurnRules.some((rule) => rule(nextDiscard));
        const nextTop = burn ? undefined : value;

        const remaining = ids.filter((id) => getIdValue(id) !== value);
        const remainingGroups = new Map<number, number>();
        for (const id of remaining) {
            const v = getIdValue(id);
            remainingGroups.set(v, (remainingGroups.get(v) ?? 0) + 1);
        }

        let futurePlayableGroups = 0;
        let futurePlayableCards = 0;
        for (const [v, amt] of remainingGroups) {
            if (!this.canPlace(v, nextTop)) continue;
            futurePlayableGroups += 1;
            futurePlayableCards += amt;
        }

        const wildPenalty = (value === 0 || value === 8) && hasNonWildPlayable ? 1.5 : 0;
        const tenBonus = value === 8 ? 1.25 : 0;
        const immediateValue = count * 3;
        const burnValue = burn ? 4 : 0;
        const futureValue = futurePlayableGroups * 1.5 + futurePlayableCards * 0.5;
        const openPenalty = lastValue == null && (value === 0 || value === 8) ? 1 : 0;

        return immediateValue + burnValue + tenBonus + futureValue - wildPenalty - openPenalty;
    }
}
export function getIdValue(id: number | undefined) {
    if (id == null) return -1;
    return id % 13;
}
