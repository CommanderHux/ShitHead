import { runDrawTest } from "./visuals/draw.js";

const canvas = document.getElementById("canvas");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Expected a canvas element with id 'canvas'.");
}

runDrawTest(canvas);
