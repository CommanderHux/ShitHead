const DEFAULT_SETTINGS = {
    card: {
        width: 50,
        height: 100,
        horizontalSpacing: 50,
        inactiveOffsetY: 10,
        visibleCount: 3,
    },
    drawPile: {
        visibleCount: 1,
    },
    layout: {
        draw: { x: 50, y: 100 },
        discard: { x: 125, y: 100 },
        player: { x: 100, y: 200 },
        playerZones: {
            upOffsetY: 25,
            handOffsetY: 125,
        },
        dealButton: {
            x: 50,
            y: 450,
            width: 50,
            height: 24,
            text: "Deal",
        },
    },
    game: {
        deckSize: 52,
        startCardsPerZone: 3,
    },
    rules: {},
};
export const SETTINGS = {
    card: { ...DEFAULT_SETTINGS.card },
    drawPile: { ...DEFAULT_SETTINGS.drawPile },
    layout: {
        draw: { ...DEFAULT_SETTINGS.layout.draw },
        discard: { ...DEFAULT_SETTINGS.layout.discard },
        player: { ...DEFAULT_SETTINGS.layout.player },
        playerZones: { ...DEFAULT_SETTINGS.layout.playerZones },
        dealButton: { ...DEFAULT_SETTINGS.layout.dealButton },
    },
    game: { ...DEFAULT_SETTINGS.game },
    rules: { ...DEFAULT_SETTINGS.rules },
};
function assignSettings(raw) {
    const merged = {
        ...DEFAULT_SETTINGS,
        ...raw,
        card: { ...DEFAULT_SETTINGS.card, ...raw.card },
        drawPile: { ...DEFAULT_SETTINGS.drawPile, ...raw.drawPile },
        layout: {
            ...DEFAULT_SETTINGS.layout,
            ...raw.layout,
            draw: { ...DEFAULT_SETTINGS.layout.draw, ...raw.layout?.draw },
            discard: { ...DEFAULT_SETTINGS.layout.discard, ...raw.layout?.discard },
            player: { ...DEFAULT_SETTINGS.layout.player, ...raw.layout?.player },
            playerZones: {
                ...DEFAULT_SETTINGS.layout.playerZones,
                ...raw.layout?.playerZones,
            },
            dealButton: {
                ...DEFAULT_SETTINGS.layout.dealButton,
                ...raw.layout?.dealButton,
            },
        },
        game: { ...DEFAULT_SETTINGS.game, ...raw.game },
        rules: { ...DEFAULT_SETTINGS.rules, ...raw.rules },
    };
    Object.assign(SETTINGS.card, merged.card);
    Object.assign(SETTINGS.drawPile, merged.drawPile);
    Object.assign(SETTINGS.layout.draw, merged.layout.draw);
    Object.assign(SETTINGS.layout.discard, merged.layout.discard);
    Object.assign(SETTINGS.layout.player, merged.layout.player);
    Object.assign(SETTINGS.layout.playerZones, merged.layout.playerZones);
    Object.assign(SETTINGS.layout.dealButton, merged.layout.dealButton);
    Object.assign(SETTINGS.game, merged.game);
    SETTINGS.rules = merged.rules;
}
export async function loadSettings() {
    try {
        const response = await fetch(new URL("./settings.JSON", import.meta.url).href, {
            cache: "no-store",
        });
        if (!response.ok) {
            return;
        }
        const raw = (await response.json());
        assignSettings(raw);
    }
    catch (error) {
        console.warn("Failed to load settings.JSON. Falling back to defaults.", error);
    }
}
//# sourceMappingURL=settings.js.map