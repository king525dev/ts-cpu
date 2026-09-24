// src/desktop/renderer/app.ts

import { run } from "../../web/api.js";

// ---------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------

function $<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element: #${id}`);
    return el as T;
}

const sourceEl = $<HTMLTextAreaElement>("source");
const outputEl = $<HTMLPreElement>("output");
const logEl = $<HTMLPreElement>("log");
const canvas = $<HTMLCanvasElement>("screen");
const statusEl = $<HTMLElement>("status");
const infoEl = $<HTMLElement>("info");

const samplesBtn = $<HTMLButtonElement>("samplesBtn");
const samplesMenu = $<HTMLUListElement>("samplesMenu");
const openBtn = $<HTMLButtonElement>("openBtn");
const fileInput = $<HTMLInputElement>("fileInput");
const runBtn = $<HTMLButtonElement>("runBtn");
const runLogBtn = $<HTMLButtonElement>("runLogBtn");
const clearBtn = $<HTMLButtonElement>("clearBtn");
const logToggle = $<HTMLButtonElement>("logToggle");
const logPanel = document.querySelector(".log-panel") as HTMLElement;

// ---------------------------------------------------------------------
// Samples
// ---------------------------------------------------------------------
//
// A short curated list so the app is useful out of the box. Add your own
// by copying the pattern. If you want the full program library in the
// menu, generate a manifest at build time the same way the web demo does.

const SAMPLES: Array<{ name: string; source: string }> = [
    {
        name: "Hello",
        source:
`//
# Prints "Hi!" followed by a newline.
//

LDA " 10 33 105 72 "
DCD * 4
BRK
`,
    },
    {
        name: "Countdown",
        source:
`VAR counter

LDA 5
STA counter

>loop
LDR counter
OUT
LDR counter
DEC
STA counter
LDR counter
LDA 0
GTH
JCN loop

BRK
`,
    },
    {
        name: "FizzBuzz",
        source:
`VAR n

LDA 1
STA n

>loop
  LDR n
  LDA 15
  MOD
  LDA 0
  EQU
  JCN case_fb

  LDR n
  LDA 3
  MOD
  LDA 0
  EQU
  JCN case_f

  LDR n
  LDA 5
  MOD
  LDA 0
  EQU
  JCN case_b

  LDR n
  OUT
  JMP next

>case_fb
  LDA " 122 122 117 66 122 122 105 70 "
  DCD * 8
  JMP next

>case_f
  LDA " 122 122 105 70 "
  DCD * 4
  JMP next

>case_b
  LDA " 122 122 117 66 "
  DCD * 4
  JMP next

>next
  LDA 10
  DCD

  LDR n
  INC
  STA n

  LDR n
  LDA 20
  GTH
  LDA 0
  EQU
  JCN loop

BRK
`,
    },
    {
        name: "Bell Curve",
        source:
`// A smooth parabola: v = 2 * i * (20 - i). Peaks at 200 in the middle. //
VAR i
VAR v

LDA 0
STA i

>loop
  LDR i
  LDA 21
  LTH
  JCN body
  JMP done

>body
  LDA 20
  LDR i
  SUB
  LDR i
  MUL
  LDA 2
  MUL
  STA v
  LDR v

  LDR i
  INC
  STA i
  JMP loop

>done
PRT
BRK
`,
    },
    {
        name: "Bar Chart",
        source:
`LDA 16
SHW
LDA 32
SHW
LDA 48
SHW
LDA 64
SHW
LDA 96
SHW
BRK
`,
    },
    {
        name: "Pyramid of Stars",
        source:
`VAR row
VAR spaces
VAR stars

LDA 0
STA row

>outer
  LDA 4
  LDR row
  SUB
  STA spaces

  >space_loop
    LDR spaces
    LDA 0
    GTH
    JCN space_done
    LDA 32
    DCD
    LDR spaces
    DEC
    STA spaces
    JMP space_loop

  >space_done

  LDR row
  LDA 2
  MUL
  INC
  STA stars

  >star_loop
    LDR stars
    LDA 0
    GTH
    JCN star_done
    LDA 42
    DCD
    LDR stars
    DEC
    STA stars
    JMP star_loop

  >star_done

  LDA 10
  DCD

  LDR row
  INC
  STA row

  LDR row
  LDA 5
  LTH
  JCN outer

BRK
`,
    },
];

// ---------------------------------------------------------------------
// Info line
// ---------------------------------------------------------------------

function updateInfo(): void {
    const v = sourceEl.value;
    const lines = v.length ? v.split("\n").length : 0;
    infoEl.textContent = `${lines} lines · ${v.length} chars`;
}

sourceEl.addEventListener("input", updateInfo);

// ---------------------------------------------------------------------
// Tab key inserts spaces
// ---------------------------------------------------------------------

sourceEl.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
        e.preventDefault();
        const start = sourceEl.selectionStart;
        const end = sourceEl.selectionEnd;
        sourceEl.value =
            sourceEl.value.slice(0, start) +
            "    " +
            sourceEl.value.slice(end);
        sourceEl.selectionStart = sourceEl.selectionEnd = start + 4;
        updateInfo();
        return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        doRun(false);
    }
});

// ---------------------------------------------------------------------
// Samples menu
// ---------------------------------------------------------------------

SAMPLES.forEach((sample) => {
    const li = document.createElement("li");
    li.textContent = sample.name;
    li.addEventListener("click", () => {
        sourceEl.value = sample.source;
        samplesMenu.classList.remove("open");
        updateInfo();
        setStatus(`Loaded sample: ${sample.name}`);
    });
    samplesMenu.appendChild(li);
});

samplesBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    samplesMenu.classList.toggle("open");
});

document.addEventListener("click", () => {
    samplesMenu.classList.remove("open");
});

// ---------------------------------------------------------------------
// Open file
// ---------------------------------------------------------------------

openBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        sourceEl.value = String(reader.result ?? "");
        updateInfo();
        setStatus(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
    fileInput.value = "";
});

// ---------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------

function setStatus(text: string): void {
    statusEl.textContent = text;
}

function clearOutput(): void {
    outputEl.textContent = "";
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function appendError(kind: string, message: string): void {
    const div = document.createElement("div");
    div.className = "err";
    div.textContent = `[${kind}] ${message}`;
    outputEl.appendChild(div);
}

function doRun(withLog: boolean): void {
    clearOutput();
    setStatus("Running…");

    let result;
    try {
        result = run({
            source: sourceEl.value,
            canvas,
            captureLog: withLog,
        });
    } catch (err) {
        appendError("Exception", (err as Error).message ?? String(err));
        setStatus("Error");
        return;
    }

    if (result.stdout.length) {
        outputEl.appendChild(document.createTextNode(result.stdout));
    }

    if (result.error) {
        appendError(result.error.kind, result.error.message);
    } else if (result.stderr.length) {
        appendError("stderr", result.stderr);
    }

    if (withLog) {
        logEl.textContent = result.log ?? "(log not captured)";
        logEl.scrollTop = 0;
        setLogCollapsed(false);
    }

    outputEl.scrollTop = 0;
    setStatus(result.error ? "Finished with errors" : "Finished");
}

runBtn.addEventListener("click", () => doRun(false));
runLogBtn.addEventListener("click", () => doRun(true));

// ---------------------------------------------------------------------
// Clear / log toggle
// ---------------------------------------------------------------------

clearBtn.addEventListener("click", () => {
    clearOutput();
    setStatus("Cleared");
});

let logCollapsed = true;

function setLogCollapsed(collapsed: boolean): void {
    logCollapsed = collapsed;
    logPanel.classList.toggle("collapsed", collapsed);
    logToggle.textContent = collapsed ? "show" : "hide";
}

logToggle.addEventListener("click", () => setLogCollapsed(!logCollapsed));

// ---------------------------------------------------------------------
// Canvas fitting
// ---------------------------------------------------------------------

const canvasWrap = document.querySelector(".canvas-wrap") as HTMLElement;
const MAX_CANVAS = 384;

function fitCanvas(): void {
    const w = canvasWrap.clientWidth - 24;
    const h = canvasWrap.clientHeight - 24;
    const size = Math.floor(Math.min(w, h, MAX_CANVAS));
    if (size < 32) return;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
}

new ResizeObserver(fitCanvas).observe(canvasWrap);

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------

sourceEl.value = SAMPLES[0]!.source;
updateInfo();
requestAnimationFrame(fitCanvas);
setStatus("Ready");