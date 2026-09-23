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
        '// Print "Hi!" and then show a bar for value 42.//\n' +
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
        }
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