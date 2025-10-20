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
canvas.style.cursor = "none";
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

class ToolPreview {
  x: number;
  y: number;
  thickness: number;

  constructor(x: number, y: number, thickness: number) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
  }

  draw(context: CanvasRenderingContext2D) {
    context.save();
    context.beginPath();
    context.strokeStyle = "gray";
    context.lineWidth = 1;
    context.globalAlpha = 0.8;
    context.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

const drawing: Stroke[] = [];
const redoStack: Stroke[] = [];
let currentStroke: Stroke | null = null;
let currentThickness = 2;
let toolPreview: ToolPreview | null = null;

function drawingChanged() {
  canvas.dispatchEvent(new Event("drawing-changed"));
}

function toolMoved() {
  canvas.dispatchEvent(new Event("tool-moved"));
}

function redrawAll() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "black";
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
  if (!isDraw && toolPreview) {
    toolPreview.draw(context);
  }
}

canvas.addEventListener("drawing-changed", () => redrawAll());
canvas.addEventListener("tool-moved", () => redrawAll());

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
  drawingChanged();
});

canvas.addEventListener("mouseout", () => {
  isDraw = false;
  currentStroke = null;
  toolPreview = null;
  drawingChanged();
});

canvas.addEventListener("mousemove", (e) => {
  const m = e as MouseEvent;
  if (isDraw && currentStroke) {
    currentStroke.points.push({ x: m.offsetX, y: m.offsetY });
    [lastX, lastY] = [m.offsetX, m.offsetY];
    drawingChanged();
  } else {
    toolPreview = new ToolPreview(m.offsetX, m.offsetY, currentThickness);
    toolMoved();
  }
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
