//@ts-chec

/** 
 * p_Deck is a positive deck, if x :- p_Deck, it exists in that deck
 * @typedef {Set<number>} p_Deck
 * n_Deck is a negative deck, if x :- n_Deck, it does not exists in that deck
 * @typedef {Ser<number>} n_Deck
 */
const SERVER_URL = "wss://demoserver.p5party.org";
const APP_NAME = "shithead-party-demo";

let shared;
let me;
let guests;
let roomName;
/** @type {n_Deck} */
let draw;
/** @type {p_Deck} */
let discard;
/** @type {{up: p_Deck, down: p_Deck, hand: p_Deck}[]} */
let hands;

function preload() {
  roomName = readRoomName();
  partyConnect(SERVER_URL, APP_NAME, roomName);

  shared = partyLoadShared("globals", {
    /** Negative - if value is in draw, it cannot be drawn */
    draw: new Set(),
    /** Positive - if value is in discard it exists in discard */
    discard: new Set(),
  });
  me = partyLoadMyShared({
    name: /** @type {string} */ 'hello',
    hand: {
      /** @type {p_Deck} */ up: new Set(),
      /** @type {p_Deck} */ down: new Set(),
      /** @type {p_Deck} */ hand: new Set(),
    }
  });
  guests = partyLoadGuestShareds();
}

function setup() {
  const canvas = createCanvas(640, 420);
  canvas.parent(document.querySelector("main"));

  const roomLabel = document.getElementById("room-label");
  roomLabel.textContent = `Room: ${roomName}`;
}

function draw() {

}

/**
 * @param {number} id 
 * @returns {({suit: number, value: number})}
 */
function loadCard(id){
  let suit = id % 4;
  let value = id % 13;
  return {suit, value};
}
/** @returns {{roomID: string, nameID: string}} Room Name */
async function readRoomName() {
  let roomID;
  let nameID;
  await new Promise((resolve) => {
    let room = document.getElementById("room");
    let name = document.getElementById("name");
    let roomSet = false;
    let nameSet = false;
    let roomHandler = (e) => {
      roomID = String(e.target.value);
      roomSet = true;
    }
    let nameHandler = (e) => {
      nameID = String(e.target.value);
      nameSet = true;
    }
    room.addEventListener("change", roomHandler);
    name.addEventListener("change", nameHandler)
    if(roomSet && nameSet) {
      room.removeEventListener("change", roomHandler);
      name.removeEventListener("change", nameHandler);
      resolve();
    }
  });
  return {roomID, nameID};
}


