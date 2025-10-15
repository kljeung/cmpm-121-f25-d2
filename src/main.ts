import exampleIconUrl from "./noun-paperclip-7598668-00449F.png";
import "./style.css";
//canvas code from https://github.com/rndmcnlly/cmpm-121-f25-quaint-paint/blob/main/paint0.html
document.body.innerHTML = `
  <h1> Sticker Sketching </h1>
  <p>Example image asset: <img src="${exampleIconUrl}" class="icon" /></p>
  <button id="button">Clear</button>
`;

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
//canvas.style.cursor = "none";
document.body.append(canvas);

const context = canvas.getContext("2d");
if (!context) {
  throw new Error("I hate deno, let me commit >:(");
}
const button = document.getElementById("button");
if (!button) {
  throw new Error("deno, please for the love of everything, stop complaining");
}
let isDraw = false;
let lastX = 0;
let lastY = 0;

type stupidTypeError = {
  offsetX: number;
  offsetY: number;
};

canvas.addEventListener("mousedown", (coord: unknown) => {
  const cords = coord as stupidTypeError;
  isDraw = true;
  [lastX, lastY] = [cords.offsetX, cords.offsetY];
});

canvas.addEventListener("mouseout", () => (isDraw = false));
canvas.addEventListener("mouseup", () => (isDraw = false));

canvas.addEventListener("mousemove", (coord: unknown) => {
  const cords = coord as stupidTypeError;
  if (!isDraw) return;
  context.beginPath();
  context.moveTo(lastX, lastY);
  context.lineTo(cords.offsetX, cords.offsetY);
  context.strokeStyle = "black";
  context.lineWidth = 2;
  context.lineCap = "round";
  context.stroke();
  [lastX, lastY] = [cords.offsetX, cords.offsetY];
});

button.addEventListener("click", () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
});
