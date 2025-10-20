import "./style.css";

document.body.innerHTML = `
  <h1> Sticker Sketching </h1>
  <button id="button">Clear</button>
  <button id="undo">Undo</button>
  <button id="redo">Redo</button>
  <button id="thinTool" class="selectedTool">Thin Marker</button>
  <button id="thickTool">Thick Marker</button>
`;

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
document.body.append(canvas);

const context = canvas.getContext("2d")!;
const button = document.getElementById("button") as HTMLButtonElement;
const undo = document.getElementById("undo") as HTMLButtonElement;
const redo = document.getElementById("redo") as HTMLButtonElement;
const thinTool = document.getElementById("thinTool") as HTMLButtonElement;
const thickTool = document.getElementById("thickTool") as HTMLButtonElement;

let isDraw = false;
let lastX = 0;
let lastY = 0;

type Point = { x: number; y: number };
type Stroke = { points: Point[]; thickness: number };

const drawing: Stroke[] = [];
const redoStack: Stroke[] = [];
let currentStroke: Stroke | null = null;
let currentThickness = 2;

function drawingChanged() {
  canvas.dispatchEvent(new Event("drawing-changed"));
}

function redrawAll() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "black";
  context.lineWidth = 2;
  context.lineCap = "round";
  for (const stroke of drawing) {
    if (stroke.points.length <= 1) continue;
    context.lineWidth = stroke.thickness;
    const s0 = stroke.points[0]!;
    context.beginPath();
    context.moveTo(s0.x, s0.y);
    for (let i = 1; i < stroke.points.length; i++) {
      const p = stroke.points[i]!;
      context.lineTo(p.x, p.y);
    }
    context.stroke();
  }
}

canvas.addEventListener("drawing-changed", () => redrawAll());

canvas.addEventListener("mousedown", (e) => {
  const m = e as MouseEvent;
  isDraw = true;
  [lastX, lastY] = [m.offsetX, m.offsetY];
  currentStroke = {
    points: [{ x: lastX, y: lastY }],
    thickness: currentThickness,
  };
  drawing.push(currentStroke);
  drawingChanged();
});

canvas.addEventListener("mouseup", () => {
  isDraw = false;
  currentStroke = null;
});

canvas.addEventListener("mouseout", () => {
  isDraw = false;
  currentStroke = null;
});

canvas.addEventListener("mousemove", (e) => {
  const m = e as MouseEvent;
  if (!isDraw || !currentStroke) return;
  currentStroke.points.push({ x: m.offsetX, y: m.offsetY });
  [lastX, lastY] = [m.offsetX, m.offsetY];
  drawingChanged();
});

button.addEventListener("click", () => {
  drawing.length = 0;
  redoStack.length = 0;
  drawingChanged();
});

undo.addEventListener("click", () => {
  if (!drawing.length) return;
  const popped = drawing.pop()!;
  redoStack.push(popped);
  drawingChanged();
});

redo.addEventListener("click", () => {
  if (!redoStack.length) return;
  const popped = redoStack.pop()!;
  drawing.push(popped);
  drawingChanged();
});

thinTool.addEventListener("click", () => {
  currentThickness = 2;
  thinTool.classList.add("selectedTool");
  thickTool.classList.remove("selectedTool");
});

thickTool.addEventListener("click", () => {
  currentThickness = 8;
  thickTool.classList.add("selectedTool");
  thinTool.classList.remove("selectedTool");
});
