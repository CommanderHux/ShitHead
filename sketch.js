const SERVER_URL = "wss://demoserver.p5party.org";
const APP_NAME = "shithead-party-demo";

let shared;
let me;
let guests;
let roomName;

function preload() {
  roomName = readRoomName();
  partyConnect(SERVER_URL, APP_NAME, roomName);

  shared = partyLoadShared("globals", {
    clicks: 0,
    lastClick: { x: 210, y: 210, by: "nobody" },
  });
  me = partyLoadMyShared({
    name: makeName(),
    color: makeColor(),
    x: 210,
    y: 210,
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
  drawBackground();
  drawSharedPulse();
  drawGuests();
  drawHud();
}

function mouseMoved() {
  updateMyCursor();
}

function mouseDragged() {
  updateMyCursor();
}

function mousePressed() {
  if (!insideCanvas(mouseX, mouseY)) return;

  updateMyCursor();
  shared.clicks += 1;
  shared.lastClick = {
    x: mouseX,
    y: mouseY,
    by: me.name,
  };
}

function updateMyCursor() {
  if (!insideCanvas(mouseX, mouseY)) return;

  me.x = mouseX;
  me.y = mouseY;
}

function drawBackground() {
  background("#020617");

  noStroke();
  for (let y = 0; y < height; y += 12) {
    const blend = map(y, 0, height, 0, 1);
    fill(lerpColor(color("#0f172a"), color("#082f49"), blend));
    rect(0, y, width, 12);
  }
}

function drawSharedPulse() {
  const pulse = 70 + sin(frameCount * 0.05) * 8 + shared.clicks * 0.35;

  noStroke();
  fill("#f59e0b");
  circle(shared.lastClick.x, shared.lastClick.y, pulse);
  fill("#fef3c7");
  circle(shared.lastClick.x, shared.lastClick.y, 18);
}

function drawGuests() {
  const everyone = [me, ...guests].filter(Boolean);

  for (const player of everyone) {
    if (typeof player.x !== "number" || typeof player.y !== "number") continue;

    fill(player.color || "#ffffff");
    stroke("#e2e8f0");
    strokeWeight(2);
    circle(player.x, player.y, 22);

    noStroke();
    fill("#e2e8f0");
    textAlign(LEFT, CENTER);
    textSize(14);
    text(player.name || "guest", player.x + 16, player.y);
  }
}

function drawHud() {
  noStroke();
  fill(2, 6, 23, 170);
  rect(14, 14, 250, 84, 12);

  fill("#e2e8f0");
  textAlign(LEFT, TOP);
  textSize(16);
  text(`Players here: ${guests.length + 1}`, 28, 28);
  text(`Shared clicks: ${shared.clicks}`, 28, 50);
  text(`Last click: ${shared.lastClick.by}`, 28, 72);
}

function insideCanvas(x, y) {
  return x >= 0 && x <= width && y >= 0 && y <= height;
}

function readRoomName() {
  const params = new URLSearchParams(window.location.search);
  return params.get("room") || "main-room";
}

function makeName() {
  const names = ["Comet", "Disco", "Pixel", "Orbit", "Spark", "Echo"];
  return `${random(names)}-${floor(random(100, 999))}`;
}

function makeColor() {
  const palette = ["#38bdf8", "#f472b6", "#34d399", "#f59e0b", "#a78bfa"];
  return random(palette);
}
