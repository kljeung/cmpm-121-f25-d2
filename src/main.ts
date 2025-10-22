import "./style.css";

document.body.innerHTML = `
  <div id="header">
    <h1>🎨 Sketchy Business</h1>
    <div id="top-bar">
      <button id="button" class="action">🧽 Clear</button>
      <button id="undo" class="action">↩️ Undo</button>
      <button id="redo" class="action">↪️ Redo</button>
      <button id="smolBrush" class="selectedTool">Fine Brush</button>
      <button id="beegBrush">Bold Brush</button>
    </div>
  </div>

  <div id="canvas-container"></div>

  <div id="bottom-bar">
   <div id="stickerBar"></div>

    <div id="utilityButtons">
      <button id="addSticker">➕ Add Emoji</button>
     <button id="exportButton">📤 Export</button>
    </div>
</div>
`;

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.style.cursor = "none";
document.getElementById("canvas-container")!.append(canvas);

const context = canvas.getContext("2d")!;

const button = document.getElementById("button") as HTMLButtonElement;
const undo = document.getElementById("undo") as HTMLButtonElement;
const redo = document.getElementById("redo") as HTMLButtonElement;
const smolBrush = document.getElementById("smolBrush") as HTMLButtonElement;
const beegBrush = document.getElementById("beegBrush") as HTMLButtonElement;
const stickerBar = document.getElementById("stickerBar")!;
const addStickerButton = document.getElementById(
  "addSticker",
) as HTMLButtonElement;
const exportButton = document.getElementById(
  "exportButton",
) as HTMLButtonElement;

const stickerSet = [
  { id: "clown", emoji: "🤡" },
  { id: "starEyes", emoji: "🤩" },
  { id: "runningInThe90s", emoji: "🏃‍♀️💨" },
];

function renderStickerButtons() {
  stickerBar.innerHTML = "";
  stickerSet.forEach((sticker) => {
    const btn = document.createElement("button");
    btn.id = sticker.id;
    btn.textContent = sticker.emoji;
    btn.addEventListener("click", () => selectSticker(sticker.emoji, btn));
    stickerBar.appendChild(btn);
  });
}
renderStickerButtons();

addStickerButton.addEventListener("click", () => {
  const emoji = prompt("Enter your custom sticker emoji:", "💜");
  if (emoji && emoji.trim().length > 0) {
    const id = `custom-${Date.now()}`;
    stickerSet.push({ id, emoji });
    renderStickerButtons();
  }
});

let isDraw = false;
let lastX = 0;
let lastY = 0;
let currentColor = randomColor();

type Point = { x: number; y: number };

function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 80%, 50%)`;
}

interface Drawable {
  draw(context: CanvasRenderingContext2D): void;
}

class StrokeCommand implements Drawable {
  points: Point[];
  thickness: number;
  color: string;

  constructor(points: Point[], thickness: number, color: string) {
    this.points = points;
    this.thickness = thickness;
    this.color = color;
  }

  draw(context: CanvasRenderingContext2D) {
    if (this.points.length <= 1) return;
    context.lineWidth = this.thickness;
    context.lineCap = "round";
    context.strokeStyle = this.color;
    context.beginPath();
    const s0 = this.points[0]!;
    context.moveTo(s0.x, s0.y);
    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i]!;
      context.lineTo(p.x, p.y);
    }
    context.stroke();
  }
}

class ToolPreview {
  x: number;
  y: number;
  thickness: number;
  color: string;

  constructor(x: number, y: number, thickness: number, color: string) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
    this.color = color;
  }

  draw(context: CanvasRenderingContext2D) {
    context.save();
    context.beginPath();
    context.strokeStyle = this.color;
    context.lineWidth = 2;
    context.globalAlpha = 0.8;
    context.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

class Sticker implements Drawable {
  emoji: string;
  x: number;
  y: number;
  size: number;

  constructor(emoji: string, x: number, y: number, size = 24) {
    this.emoji = emoji;
    this.x = x;
    this.y = y;
    this.size = size;
  }

  draw(context: CanvasRenderingContext2D) {
    context.font = `${this.size}px serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(this.emoji, this.x, this.y);
  }

  contains(x: number, y: number): boolean {
    const radius = this.size / 2;
    const dx = x - this.x;
    const dy = y - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  moveTo(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

const drawing: Drawable[] = [];
const redoStack: Drawable[] = [];
let currentStroke: StrokeCommand | null = null;
let currentThickness = 2;
let toolPreview: Drawable | null = null;

type ToolMode = "draw" | "sticker";
let currentTool: ToolMode = "draw";
let currentStickerEmoji: string | null = null;
let draggedSticker: Sticker | null = null;

function drawingChanged() {
  canvas.dispatchEvent(new Event("drawing-changed"));
}
function toolMoved() {
  canvas.dispatchEvent(new Event("tool-moved"));
}

function redrawAll() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (const item of drawing) {
    item.draw(context);
  }
  if (!isDraw && toolPreview) {
    toolPreview.draw(context);
  }
}

function exportDrawing() {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d")!;
  exportCtx.scale(4, 4);
  for (const item of drawing) {
    item.draw(exportCtx);
  }
  const dataURL = exportCanvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = "stickerSketch.png";
  link.click();
  exportCanvas.remove();
}

canvas.addEventListener("drawing-changed", () => redrawAll());
canvas.addEventListener("tool-moved", () => redrawAll());

canvas.addEventListener("mousedown", (e) => {
  const m = e as MouseEvent;

  if (currentTool === "draw") {
    isDraw = true;
    [lastX, lastY] = [m.offsetX, m.offsetY];
    currentStroke = new StrokeCommand(
      [{ x: lastX, y: lastY }],
      currentThickness,
      currentColor,
    );
    drawing.push(currentStroke);
    drawingChanged();
  } else if (currentTool === "sticker" && currentStickerEmoji) {
    const clicked = drawing.findLast(
      (d) =>
        d instanceof Sticker && (d as Sticker).contains(m.offsetX, m.offsetY),
    ) as Sticker | undefined;
    if (clicked) {
      draggedSticker = clicked;
    } else {
      const sticker = new Sticker(currentStickerEmoji, m.offsetX, m.offsetY);
      drawing.push(sticker);
      drawingChanged();
    }
  }
});

canvas.addEventListener("mouseup", () => {
  isDraw = false;
  currentStroke = null;
  draggedSticker = null;
  drawingChanged();
});

canvas.addEventListener("mouseout", () => {
  isDraw = false;
  currentStroke = null;
  draggedSticker = null;
  toolPreview = null;
  drawingChanged();
});

canvas.addEventListener("mousemove", (e) => {
  const m = e as MouseEvent;

  if (currentTool === "draw" && isDraw && currentStroke) {
    currentStroke.points.push({ x: m.offsetX, y: m.offsetY });
    [lastX, lastY] = [m.offsetX, m.offsetY];
    drawingChanged();
  } else if (currentTool === "draw") {
    toolPreview = new ToolPreview(
      m.offsetX,
      m.offsetY,
      currentThickness,
      currentColor,
    );
    toolMoved();
  } else if (currentTool === "sticker" && currentStickerEmoji) {
    if (draggedSticker) {
      draggedSticker.moveTo(m.offsetX, m.offsetY);
      drawingChanged();
    } else {
      toolPreview = new Sticker(currentStickerEmoji, m.offsetX, m.offsetY);
      toolMoved();
    }
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

smolBrush.addEventListener("click", () => {
  currentTool = "draw";
  currentThickness = 1;
  currentColor = randomColor();
  smolBrush.classList.add("selectedTool");
  beegBrush.classList.remove("selectedTool");
  [...stickerBar.children].forEach((b) => b.classList.remove("selectedTool"));
  toolMoved();
});

beegBrush.addEventListener("click", () => {
  currentTool = "draw";
  currentThickness = 10;
  currentColor = randomColor();
  beegBrush.classList.add("selectedTool");
  smolBrush.classList.remove("selectedTool");
  [...stickerBar.children].forEach((b) => b.classList.remove("selectedTool"));
  toolMoved();
});

function selectSticker(emoji: string, button: HTMLButtonElement) {
  currentTool = "sticker";
  currentStickerEmoji = emoji;
  [smolBrush, beegBrush].forEach((b) => b.classList.remove("selectedTool"));
  [...stickerBar.children].forEach((b) => b.classList.remove("selectedTool"));
  button.classList.add("selectedTool");
  toolMoved();
}

exportButton.addEventListener("click", exportDrawing);
