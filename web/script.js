(function () {
    "use strict";

    /* ==========================================================
    CONFIG — replace the "#" placeholders with real URLs
    ========================================================== */
    const LINKS = {
        github: "https://github.com/king525dev/ts-cpu",
        docs: "./docs/docs.html",
        tutorial: "./docs/tutorial.html"
    };

    const DEFAULT_SOURCE =
        '// Print "Hi!" and then show a bar for value 42. //\n' +
        'LDA " 33 105 72 "\n' +
        'DCD * 3\n' +
        'LDA 42\n' +
        'SHW\n' +
        'BRK\n';

    const SAMPLES = [
        {
            name: "Hello World",
            source:
                '// Print "Hello World" to stdout. //\n' +
                'LDA " 100 108 114 111 87 32 111 108 108 101 72 "\n' +
                'DCD * 11\n' +
                'BRK\n'
        },
        {
            name: "Greeting + Bar",
            source: DEFAULT_SOURCE
        },
        {
            name: "Bar Chart",
            source:
                '// Draw a series of bars. //\n' +
                'LDA 16\n' +
                'SHW\n' +
                'LDA 32\n' +
                'SHW\n' +
                'LDA 48\n' +
                'SHW\n' +
                'LDA 64\n' +
                'SHW\n' +
                'LDA 96\n' +
                'SHW\n' +
                'BRK\n'
        },
        {
            name: "Single Tall Bar",
            source:
                '// One large bar. //\n' +
                'LDA 200\n' +
                'SHW\n' +
                'BRK\n'
        },
        {
            name: "Text + Display",
            source:
                '// Print a label, then draw a bar. //\n' +
                'LDA " 33 111 108 108 101 72 "\n' +
                'DCD * 6\n' +
                'LDA 120\n' +
                'SHW\n' +
                'BRK\n'
        },
                {
            name: "Checkerboard",
            source:
`// Alternating tall and short bars: 180, 60, 180, 60, ... //
VAR i

LDA 0
STA i

>loop
  LDR i
  LDA 21
  LTH
  JCN body
  JMP done

>body
  LDR i
  LDA 2
  MOD
  LDA 0
  EQU
  JCN even
  JMP odd

>even
  LDA 180
  JMP push

>odd
  LDA 60

>push
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
            name: "FizzBuzz",
            source:
`// Prints the FizzBuzz sequence for 1 through 20 // 
VAR n

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
            name: "Countdown",
            source:
`//
# Counts down from 5 to 1, printing each number on its own line. 
#
# This demonstrates the Phase-2 features working end to end: 
#   * VAR       — declares a named variable and allocates a RAM address 
#   * STA/LDR   — store to / load from that RAM address 
#   * >label    — a code label the assembler resolves to a bytecode address 
#   * GTH       — pops two values, pushes 1 if the second is greater 
#   * JCN       — pops a condition, jumps if it is non-zero 
//

VAR counter

LDA 5
STA counter

>loop
LDR counter        // load counter                  //
OUT                // print it                      //
LDR counter        // load counter                  //
DEC                // decrement                     //
STA counter        // store back                    //
LDR counter        // load counter again            //
LDA 0              // push 0                        //
GTH                // is counter > 0 ?              //
JCN loop           // if yes, jump back to \`loop\`   //

BRK
`,
        },
        {
            name: "Hello",
            source:
`//
# Prints "Hi!" followed by a newline. 
#
# DCD pops the top of the stack and prints it as an ASCII character, so we 
# push the characters in reverse order (the newline first, 'H' last). 
#
# The LDA "..." form is a shorthand: it expands to one LDA per value. 
# The DCD * 4 form repeats DCD four times.
//

LDA " 10 33 105 72 "
DCD * 4
BRK
`,
        },
        {
            name: "Pyramid of Stars",
            source:
`// Prints a Pyramid of asterisks //
VAR row
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
        {
            name: "Bell Curve",
            source:
`// A smooth parabola: \`v = 2 * i * (20 − i)\`. Peaks at 200 in the middle, tails off to 0 on both sides //
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
            name: "Noise",
            source:
`// A jagged, unpredictable series. Uses a linear congruential generator: \`seed = (seed · 5 + 1) mod 256\` //
VAR seed
VAR i

LDA 42
STA seed
LDA 0
STA i

>loop
  LDR i
  LDA 20
  LTH
  JCN body
  JMP done

>body
  LDR seed
  LDA 5
  MUL
  LDA 1
  ADD
  STA seed

  LDR seed
  LDA 200
  MOD

  LDR i
  INC
  STA i
  JMP loop

>done
PRT
BRK
`,
        },
    ];

    /* ==========================================================
    SHORTCUTS
    ========================================================== */
    const $ = (id) => document.getElementById(id);
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    const workspace = $("workspace");
    const mainCol = $("mainCol");
    const bottomRow = $("bottomRow");
    const panelSource = $("panelSource");
    const panelOutput = $("panelOutput");
    const panelDisplay = $("panelDisplay");
    const panelLog = $("panelLog");
    const logSlot = $("logSlot");
    const logTab = $("logTab");
    const logSplitter = $("logSplitter");
    const sourceEl = $("source");
    const outputEl = $("output");
    const logEl = $("log");
    const canvas = $("screen");
    const statusEl = $("status");
    const statusInfoEl = $("statusInfo");

    /* ==========================================================
    GENERIC DRAG HELPER
    ========================================================== */
    function startDrag(e, cursor, onMove, onEnd) {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();

        const prevCursor = document.body.style.cursor;
        const prevSelect = document.body.style.userSelect;
        document.body.style.cursor = cursor;
        document.body.style.userSelect = "none";

        function move(ev) { onMove(ev); }
        function up() {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);
            document.body.style.cursor = prevCursor;
            document.body.style.userSelect = prevSelect;
            if (onEnd) onEnd();
        }

        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
    }

    /* ==========================================================
    PANEL RESIZING
    ========================================================== */

    // Vertical divider between SOURCE and the bottom row
    $("hsplit").addEventListener("mousedown", function (e) {
        const rect = mainCol.getBoundingClientRect();
        const total = Math.max(1, rect.height - 6);
        startDrag(e, "row-resize", function (ev) {
            const ratio = clamp((ev.clientY - rect.top - 3) / total, 0.12, 0.85);
            panelSource.style.flexGrow = String(ratio);
            bottomRow.style.flexGrow = String(1 - ratio);
        });
    });

    // Divider between OUTPUT and DISPLAY (horizontal or vertical layout)
    $("vsplit").addEventListener("mousedown", function (e) {
        const rect = bottomRow.getBoundingClientRect();
        const isColumn = getComputedStyle(bottomRow).flexDirection === "column";
        const total = Math.max(1, (isColumn ? rect.height : rect.width) - 6);
        const origin = isColumn ? rect.top : rect.left;

        startDrag(e, isColumn ? "row-resize" : "col-resize", function (ev) {
            const pos = (isColumn ? ev.clientY : ev.clientX) - origin - 3;
            const ratio = clamp(pos / total, 0.15, 0.85);
            panelOutput.style.flexGrow = String(ratio);
            panelDisplay.style.flexGrow = String(1 - ratio);
        });
    });

    /* ==========================================================
    LOG PANEL: open / close / resize
    ========================================================== */
    let logOpen = false;
    let logWidth = clamp(Math.floor(window.innerWidth * 0.25), 220, 340);
    let maximized = null;

    function setLogOpen(open) {
        open = !!open;
        if (!open && maximized === "log") setMax(null);

        logOpen = open;
        logSlot.classList.toggle("open", open);
        logTab.title = open ? "Hide log" : "Show log";

        if (open) panelLog.style.width = logWidth + "px";
        requestAnimationFrame(fitCanvas);
    }

    // Click / pull the tab
    logTab.addEventListener("mousedown", function (e) {
        const startX = e.clientX;
        const startW = logOpen ? logWidth : 0;
        let moved = false;

        startDrag(e, "col-resize", function (ev) {
            const dx = startX - ev.clientX;
            if (Math.abs(dx) > 5) moved = true;
            if (moved) {
                if (!logOpen) setLogOpen(true);
                const maxW = Math.max(240, window.innerWidth - 200);
                logWidth = clamp(startW + dx, 160, maxW);
                panelLog.style.width = logWidth + "px";
            }
        }, function () {
            if (!moved) setLogOpen(!logOpen);
        });
    });

    // Drag the log's left border
    logSplitter.addEventListener("mousedown", function (e) {
        const right = panelLog.getBoundingClientRect().right;
        startDrag(e, "col-resize", function (ev) {
            const maxW = Math.max(240, window.innerWidth - 200);
            logWidth = clamp(right - ev.clientX, 160, maxW);
            panelLog.style.width = logWidth + "px";
        });
    });

    $("logClose").addEventListener("click", function () {
        setLogOpen(false);
    });

    /* ==========================================================
    FULLSCREEN / MAXIMIZE
    ========================================================== */
    function setMax(name) {
        maximized = name || null;
        if (maximized) workspace.setAttribute("data-max", maximized);
        else workspace.removeAttribute("data-max");
        updateMaxButtons();
        requestAnimationFrame(fitCanvas);
    }

    function toggleMax(name) {
        if (name === "log" && maximized !== "log") setLogOpen(true);
        setMax(maximized === name ? null : name);
    }

    function updateMaxButtons() {
        const buttons = document.querySelectorAll(".pbtn[data-max]");
        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            const isMax = maximized === btn.getAttribute("data-max");
            btn.innerHTML = isMax ? "&#9635;" : "&#9633;";
            btn.title = isMax ? "Restore panel" : "Maximize panel";
        }
    }

    (function bindMaxButtons() {
        const buttons = document.querySelectorAll(".pbtn[data-max]");
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener("click", function () {
                toggleMax(this.getAttribute("data-max"));
            });
        }
    })();

    /* ==========================================================
    CANVAS FITTING
    ========================================================== */
    const displayBody = panelDisplay.querySelector(".panel-body");
    const MAX_CANVAS = 512;

    function fitCanvas() {
        if (!displayBody) return;
        const w = displayBody.clientWidth - 20;
        const h = displayBody.clientHeight - 20;
        const size = Math.floor(Math.min(w, h, MAX_CANVAS));
        if (size < 24) return;
        canvas.style.width = size + "px";
        canvas.style.height = size + "px";
    }

    if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(fitCanvas).observe(displayBody);
    }
    window.addEventListener("resize", function () {
        fitCanvas();
        if (logOpen) {
            logWidth = clamp(logWidth, 160, Math.max(240, window.innerWidth - 200));
            panelLog.style.width = logWidth + "px";
        }
    });

    /* ==========================================================
    SOURCE EDITOR BEHAVIOUR
    ========================================================== */
    sourceEl.value = DEFAULT_SOURCE;

    function updateInfo() {
        const v = sourceEl.value;
        const lines = v.length ? v.split("\n").length : 0;
        statusInfoEl.textContent = lines + " lines \u00b7 " + v.length + " chars";
    }

    sourceEl.addEventListener("input", updateInfo);

    sourceEl.addEventListener("keydown", function (e) {
        // Tab inserts spaces instead of moving focus
        if (e.key === "Tab") {
            e.preventDefault();
            const start = sourceEl.selectionStart;
            const end = sourceEl.selectionEnd;
            sourceEl.value =
                sourceEl.value.slice(0, start) + "    " + sourceEl.value.slice(end);
            sourceEl.selectionStart = sourceEl.selectionEnd = start + 4;
            updateInfo();
            return;
        }
        // Ctrl/Cmd + Enter runs
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            run(false);
        }
    });

    /* ==========================================================
    OUTPUT RENDERING
    ========================================================== */
    function setStatus(text) {
        statusEl.textContent = text;
    }

    function clearOutput() {
        outputEl.textContent = "";
    }

    function appendError(kind, message) {
        const div = document.createElement("div");
        div.className = "err";
        div.textContent = "[" + kind + "] " + message;
        outputEl.appendChild(div);
    }

    function describeError(err) {
        if (!err) return null;
        if (typeof err === "string") return { kind: "Error", message: err };
        return {
            kind: err.kind || err.name || "Error",
            message: err.message || String(err)
        };
    }

    /* ==========================================================
    RUN
    ========================================================== */
    function run(withLog) {
        clearOutput();
        setStatus("Running\u2026");

        if (!window.Oxntal || typeof window.Oxntal.run !== "function") {
            appendError(
                "Runtime",
                "window.Oxntal is not available. Check that ../../dist/web/oxntal.iife.js loaded."
            );
            setStatus("Error");
            return;
        }

        let result;
        try {
            result = window.Oxntal.run({
                source: sourceEl.value,
                canvas: canvas,
                captureLog: !!withLog
            });
        } catch (err) {
            appendError("Exception", (err && err.message) ? err.message : String(err));
            setStatus("Error");
            return;
        }

        result = result || {};

        // Normal stdout
        if (typeof result.stdout === "string" && result.stdout.length) {
            outputEl.appendChild(document.createTextNode(result.stdout));
        }

        // Errors (shown inside the same panel, clearly styled)
        const err = describeError(result.error);
        if (err) {
            appendError(err.kind, err.message);
        } else if (typeof result.stderr === "string" && result.stderr.length) {
            appendError("stderr", result.stderr);
        }

        // Log
        if (withLog) {
            logEl.textContent =
                (result.log !== undefined && result.log !== null)
                    ? String(result.log)
                    : "(log not captured)";
            logEl.scrollTop = 0;
            setLogOpen(true);
        }

        outputEl.scrollTop = 0;
        setStatus(err ? "Finished with errors" : "Finished");
    }

    $("runBtn").addEventListener("click", function () { run(false); });
    $("runLogBtn").addEventListener("click", function () { run(true); });

    /* ==========================================================
    SAMPLES MENU
    ========================================================== */
    const samplesMenu = $("samplesMenu");
    const samplesList = $("samplesList");

    SAMPLES.forEach(function (sample) {
        const li = document.createElement("li");
        li.textContent = sample.name;
        li.addEventListener("click", function () {
            sourceEl.value = sample.source;
            samplesMenu.classList.remove("open");
            updateInfo();
            setStatus("Loaded sample: " + sample.name);
        });
        samplesList.appendChild(li);
    });

    $("samplesBtn").addEventListener("click", function (e) {
        e.stopPropagation();
        samplesMenu.classList.toggle("open");
    });

    document.addEventListener("click", function () {
        samplesMenu.classList.remove("open");
    });

    /* ==========================================================
    DOWNLOAD CURRENT SOURCE
    ========================================================== */
    $("downloadBtn").addEventListener("click", function () {
        const blob = new Blob([sourceEl.value], {
            type: "text/plain;charset=utf-8"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "program.oxn";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            URL.revokeObjectURL(url);
            a.remove();
        }, 0);
        setStatus("Downloaded program.oxn");
    });

    /* ==========================================================
    INITIAL PANEL SIZES
    ========================================================== */
    function initPanelSizes() {
        const rect = bottomRow.getBoundingClientRect();
        const isColumn = getComputedStyle(bottomRow).flexDirection === "column";
        const total = isColumn ? rect.height : rect.width;
        if (total < 80) return;

        // Canvas is 256px + 2px border each side + 8px padding each side
        const canvasTarget = canvas.width + 4 + 16 + 120;

        // Convert target width into a flex ratio and clamp it so OUTPUT stays usable
        let ratio = clamp(canvasTarget / total, 0.15, 0.60);

        panelDisplay.style.flexGrow = String(ratio);
        panelOutput.style.flexGrow = String(1 - ratio);
    }

    /* ==========================================================
    EXTERNAL LINKS
    ========================================================== */
    $("linkGithub").href = LINKS.github;
    $("linkDocs").href = LINKS.docs;
    $("linkTutorial").href = LINKS.tutorial;

    /* ==========================================================
    BOOT
    ========================================================== */
    updateInfo();
    updateMaxButtons();

    requestAnimationFrame(function () {
        initPanelSizes();
        fitCanvas();
        setStatus("Ready");
    });
})();