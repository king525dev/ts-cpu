(function () {
    "use strict";

    /* ==========================================================
    CONFIG — replace the "#" placeholders with real URLs
    ========================================================== */
    const LINKS = {
        github: "https://github.com/king525dev/ts-cpu",
        docs: "https://king525dev.github.io/ts-cpu/web/docs/docs.html",
        tutorial: "https://king525dev.github.io/ts-cpu/web/docs/tutorial.html"
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
                `// Print "Hello World" to stdout. //
LDA " 100 108 114 111 87 32 111 108 108 101 72 "
DCD * 11
BRK
`,
        },
        {
            name: "Greeting + Bar",
            source: DEFAULT_SOURCE,
        },
        {
            name: "Bar Chart",
            source:
                `// Draw a series of bars. //
LDA 16
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
            name: "Single Tall Bar",
            source:
                `// One large bar. //
LDA 200
SHW
BRK
`,
        },
        {
            name: "Text + Display",
            source:
                `// Print a label, then draw a bar. //
LDA " 33 111 108 108 101 72 "
DCD * 6
LDA 120
SHW
BRK
`,
        },
        {
            name: "Computed Colour",
            source:
                `// Derive a colour from a computation, then draw it. //
LDA 3
LDA 5
SHL
LDA 7
SHL
LDA 128
SUB
SHW
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
            name: "Two Peaks",
            source:
                `// Bars rise, fall, rise again, fall again. Like two triangles glued together. //
VAR i
VAR m

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
  LDA 10
  MOD
  STA m

  LDR m
  LDA 5
  GTH
  JCN high
  JMP low

>low
  LDR m
  LDA 30
  MUL
  JMP push

>high
  LDA 10
  LDR m
  SUB
  LDA 30
  MUL

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
            name: "Repeating Staircase",
            source:
                `// Bars cycle: 0, 40, 80, 120, 160, 0, 40, 80, ... //
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
  LDA 5
  MOD
  LDA 40
  MUL

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
            name: "Pulse Train",
            source:
                `// Groups of three tall bars alternating with three short bars. //
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
  LDA 3
  DIV
  LDA 2
  MOD
  LDA 0
  EQU
  JCN group_a
  JMP group_b

>group_a
  LDA 180
  JMP push

>group_b
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
            name: "Descending Ramp",
            source:
                `// Bars start at 200 on the left and go down by 10 each step. //
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
  LDA 200
  LDR i
  LDA 10
  MUL
  SUB

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
            name: "Decaying Curve",
            source:
                `// A hyperbola: v = 200 / (i + 1). Large at first, then flattens. //
VAR i

LDA 0
STA i

>loop
  LDR i
  LDA 15
  LTH
  JCN body
  JMP done

>body
  LDA 200
  LDR i
  INC
  DIV

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
            name: "Binary Representation",
            source:
                `// Prints the binary form of 42 -> 00101010 //
VAR n
VAR mask

LDA 42
STA n
LDA 128
STA mask

>loop
  LDR mask
  LDA 0
  EQU
  JCN done

  LDR n
  LDR mask
  AND
  LDA 0
  EQU
  JCN zero

  LDA 49
  DCD
  JMP next

>zero
  LDA 48
  DCD

>next
  LDR mask
  LDA 1
  SHR
  STA mask
  JMP loop

>done
LDA 10
DCD
BRK
`,
        },
        {
            name: "Powers of Two",
            source:
                `// Prints 1, 2, 4, 8, 16, 32, 64, 128. //
VAR p
VAR i

LDA 1
STA p
LDA 0
STA i

>loop
  LDR p
  OUT

  LDR p
  LDA 1
  SHL
  STA p

  LDR i
  INC
  STA i

  LDR i
  LDA 8
  LTH
  JCN loop

BRK
`,
        },
        {
            name: "Fibonacci mod 256",
            source:
                `// The Fibonacci sequence, allowed to wrap. Values look random but aren't. //
VAR a
VAR b
VAR t
VAR i

LDA 1
STA a
LDA 1
STA b
LDA 0
STA i

>loop
  LDR i
  LDA 20
  LTH
  JCN body
  JMP done

>body
  LDR a

  LDR a
  STA t
  LDR b
  STA a
  LDR t
  LDR b
  ADD
  STA b

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
            name: "Collatz",
            source:
                `// Starting from 7, prints every step until reaching 1. //
VAR n

LDA 7
STA n

>loop
  LDR n
  OUT

  LDR n
  LDA 1
  EQU
  JCN done

  LDR n
  LDA 2
  MOD
  LDA 0
  EQU
  JCN even

  LDR n
  LDA 3
  MUL
  INC
  STA n
  JMP loop

>even
  LDR n
  LDA 2
  DIV
  STA n
  JMP loop

>done
BRK
`,
        },
        {
            name: "GCD",
            source:
                `// Euclid's Algorithm: computes gcd(48, 36) = 12. //
VAR a
VAR b
VAR temp

LDA 48
STA a
LDA 36
STA b

>loop
  LDR b
  LDA 0
  EQU
  JCN done

  LDR a
  LDR b
  MOD
  STA temp

  LDR b
  STA a

  LDR temp
  STA b

  JMP loop

>done
LDR a
OUT
BRK
`,
        },
        {
            name: "Prime Checker",
            source:
                `// Checks whether 17 is prime. Prints 1 if yes, 0 if no. //
VAR n
VAR d
VAR is_prime

LDA 17
STA n
LDA 2
STA d
LDA 1
STA is_prime

>check
  LDR d
  LDR n
  LTH
  JCN body
  JMP done

>body
  LDR n
  LDR d
  MOD
  LDA 0
  EQU
  JCN found

  LDR d
  INC
  STA d
  JMP check

>found
  LDA 0
  STA is_prime

>done
LDR is_prime
OUT
BRK
`,
        },
        {
            name: "FizzBuzz",
            source:
                `// Prints the FizzBuzz sequence for 1 through 20. //
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
            name: "Triangle of Stars",
            source:
                `// Prints an isosceles triangle of asterisks. //
VAR row
VAR col

LDA 1
STA row

>outer
  LDA 1
  STA col

  >inner
    LDR col
    LDR row
    GTH
    JCN inner_done

    LDA 42
    DCD

    LDR col
    INC
    STA col
    JMP inner

  >inner_done
  LDA 10
  DCD

  LDR row
  INC
  STA row

  LDR row
  LDA 5
  GTH
  JCN outer_done
  JMP outer

>outer_done
BRK
`,
        },
        {
            name: "Multiplication Table",
            source:
                `// Prints the 5x5 multiplication table, one product per line. //
VAR i
VAR j

LDA 1
STA i

>outer
  LDA 1
  STA j

  >inner
    LDR i
    LDR j
    MUL
    OUT

    LDR j
    INC
    STA j

    LDR j
    LDA 6
    LTH
    JCN inner

  LDR i
  INC
  STA i

  LDR i
  LDA 6
  LTH
  JCN outer

BRK
`,
        },
                {
            name: "Comments and Labels",
            source:
`// Testing if this Compiles with Comments and Labels //
LDA 10
DUP
>loop
OUT
LDA 10
ADD // Add 10 again then duplicate //
DUP
JMP loop
BRK
`,
        },
        {
            name: "Conditional Jumps Test",
            source:
`// This program tests conditional jumps, variables and loops //

LDA 5
STA 0x05

>loop
LDR 0x05
DUP
OUT
DEC
DUP
STA 0x05
LDA 0
GTH
JCN loop

BRK
`,
        },
        {
            name: "Hello World (Unrolled)",
            source:
`LDA 100
LDA 108
LDA 114
LDA 111
LDA 87
LDA 111
LDA 108
LDA 108
LDA 101
LDA 104
DCD 
DCD
DCD
DCD
DCD
DCD 
DCD
DCD
DCD
DCD
BRK
`,
        },
        {
            name: "Multiplication Demo",
            source:
`VAR age
VAR multiplier

LDA 20
STA age
LDA 2
STA multiplier

LDR age
LDR multiplier

MUL

OUT
BRK
`,
        },
        {
            name: "Countdown Using @",
            source:
`@num
@max

LDA 5
STA max

LDA 0
STA num

>loop
LDA " 100 108 114 111 87 111 108 108 101 104 95 "
DCD * 10
LDA num
INC
DUP
OUT
LDA max
GTH
JCN loop

BRK
`,
        },
        {
            name: "Addition with Raw Addresses",
            source:
`LDA 10
STA 5
LDA 15
STA 6
LDR 5
LDR 6
ADD
OUT
BRK
`,
        },
        {
            name: "Countdown (Annotated)",
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
            name: "Factorial",
            source:
`// Computes 5! = 120 //

VAR n
VAR result

LDA 1
STA result
LDA 5
STA n

>loop
  LDR result
  LDR n
  MUL
  STA result

  LDR n
  DEC
  STA n

  LDR n
  LDA 0
  GTH
  JCN loop

LDR result
OUT
BRK
`,
        },
        {
            name: "Fibonacci (First Ten)",
            source:
`// Prints the first ten terms starting from F(0) //
VAR a
VAR b
VAR t
VAR n

LDA 0
STA a
LDA 1
STA b
LDA 10
STA n

>loop
  LDR a
  OUT

  LDR a
  LDR b
  ADD
  STA t

  LDR b
  STA a

  LDR t
  STA b

  LDR n
  DEC
  STA n

  LDR n
  LDA 0
  GTH
  JCN loop

BRK
`,
        },
        {
            name: "Hi! with Newline",
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
            name: "Pseudo-Random Noise",
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
        {
            name: "Pyramid",
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
            name: "Triangle Wave (Bell)",
            source:
`// The simplest shape: bars climb from 0 to 200, then descend back to 0 //
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