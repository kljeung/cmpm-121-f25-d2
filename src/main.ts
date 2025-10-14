import exampleIconUrl from "./noun-paperclip-7598668-00449F.png";
import "./style.css";
//canvas code from https://github.com/rndmcnlly/cmpm-121-f25-quaint-paint/blob/main/paint0.html
document.body.innerHTML = `
  <h1> Sticker Sketching </h1>
  <p>Example image asset: <img src="${exampleIconUrl}" class="icon" /></p>
`;

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.style.cursor = "none";
document.body.append(canvas);
