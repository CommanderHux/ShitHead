export const CARD_W = 72;
export const CARD_H = 108;

export const CARD_STACK_X_GAP = 22;
export const CARD_STACK_Y_GAP = 18;
export const CARD_SELECTED_OFFSET_Y = 8;
export const CARD_COUNT_LABEL_OFFSET_Y = 14;

export const PLAYER_NAME_OFFSET_Y = -22;
export const PLAYER_ZONE_UP_OFFSET_Y = 36;
export const PLAYER_ZONE_HAND_OFFSET_Y = 152;
export const PLAYER_ZONE_LABEL_OFFSET_Y = 274;

export const TURN_HIGHLIGHT_X_OFFSET = -12;
export const TURN_HIGHLIGHT_Y_OFFSET = -12;
export const TURN_HIGHLIGHT_W = 170;
export const TURN_HIGHLIGHT_H = 310;

export const DRAW_PILE_X = 44;
export const DRAW_PILE_Y = 138;
export const DRAW_PILE_LABEL_X = DRAW_PILE_X + CARD_W / 2;
export const DRAW_PILE_LABEL_Y = DRAW_PILE_Y + CARD_H + 12;

export const DISCARD_PILE_X = DRAW_PILE_X + CARD_W + 22;
export const DISCARD_PILE_Y = DRAW_PILE_Y;
export const DISCARD_PILE_LABEL_X = DISCARD_PILE_X + CARD_W / 2;
export const DISCARD_PILE_LABEL_Y = DRAW_PILE_LABEL_Y;

export const ACTION_BUTTON_X = 24;
export const ACTION_BUTTON_PRIMARY_Y_FROM_BOTTOM = 96;
export const ACTION_BUTTON_SECONDARY_Y_FROM_BOTTOM = 54;
export const ACTION_BUTTON_W = 92;
export const ACTION_BUTTON_H = 34;

export const MENU_BUTTON_X = 126;
export const MENU_BUTTON_Y_FROM_BOTTOM = 96;
export const MENU_BUTTON_W = 112;
export const MENU_BUTTON_H = 34;

export const STATUS_LINE_X = 20;
export const STATUS_LINE_Y = 14;

export const SETUP_TITLE_Y = 28;
export const SETUP_STATUS_X = 90;
export const SETUP_STATUS_Y_FROM_BOTTOM = 40;

export const SETUP_MODE_LOCAL_X = 90;
export const SETUP_MODE_LOCAL_Y = 90;
export const SETUP_MODE_LOCAL_W = 110;
export const SETUP_MODE_LOCAL_H = 32;

export const SETUP_MODE_ONLINE_X = 210;
export const SETUP_MODE_ONLINE_Y = 90;
export const SETUP_MODE_ONLINE_W = 120;
export const SETUP_MODE_ONLINE_H = 32;

export const SETUP_ROLE_HOST_X = 90;
export const SETUP_ROLE_HOST_Y = 132;
export const SETUP_ROLE_HOST_W = 110;
export const SETUP_ROLE_HOST_H = 32;

export const SETUP_ROLE_JOIN_X = 210;
export const SETUP_ROLE_JOIN_Y = 132;
export const SETUP_ROLE_JOIN_W = 120;
export const SETUP_ROLE_JOIN_H = 32;

export const SETUP_NAME_X = 90;
export const SETUP_NAME_Y = 180;
export const SETUP_NAME_W = 240;
export const SETUP_NAME_H = 32;

export const SETUP_ROOM_X = 90;
export const SETUP_ROOM_Y = 222;
export const SETUP_ROOM_W = 240;
export const SETUP_ROOM_H = 32;

export const SETUP_PLAYERS_X = 90;
export const SETUP_PLAYERS_Y = 264;
export const SETUP_PLAYERS_W = 240;
export const SETUP_PLAYERS_H = 32;

export const SETUP_AI_FILL_X = 90;
export const SETUP_AI_FILL_Y = 306;
export const SETUP_AI_FILL_W = 240;
export const SETUP_AI_FILL_H = 32;

export const SETUP_START_X = 90;
export const SETUP_START_Y = 360;
export const SETUP_START_W = 240;
export const SETUP_START_H = 38;

export const SETUP_CANCEL_ONLINE_X = 90;
export const SETUP_CANCEL_ONLINE_Y = 408;
export const SETUP_CANCEL_ONLINE_W = 240;
export const SETUP_CANCEL_ONLINE_H = 32;

export const FONT_BODY = "14px sans-serif";
export const FONT_TITLE = "24px sans-serif";

export const COLOR_GAME_BACKGROUND = "#5d8d4d";
export const COLOR_SETUP_BACKGROUND = "#ece7df";
export const COLOR_TEXT_PRIMARY = "#111";
export const COLOR_TEXT_SECONDARY = "#1f1f1f";
export const COLOR_TEXT_WHITE = "white";
export const COLOR_TEXT_BLACK = "black";
export const COLOR_BUTTON_BG = "#111";
export const COLOR_BUTTON_BG_PRESSED = "#a40000";
export const COLOR_TURN_HIGHLIGHT = "#eecb00";
export const COLOR_OVERLAY = "rgba(0, 0, 0, 0.45)";

export const SEAT_LAYOUT = {
  two: {
    bottomXCenterOffset: -92,
    bottomYFromBottom: 294,
    topXCenterOffset: -92,
    topY: 72,
  },
  three: {
    bottomXCenterOffset: -92,
    bottomYFromBottom: 294,
    leftX: 70,
    leftY: 72,
    rightXFromRight: 190,
    rightY: 72,
  },
  four: {
    bottomXCenterOffset: -92,
    bottomYFromBottom: 294,
    topXCenterOffset: -92,
    topY: 58,
    leftX: 24,
    leftYFromCenter: -180,
    rightXFromRight: 190,
    rightYFromCenter: -180,
  },
} as const;
