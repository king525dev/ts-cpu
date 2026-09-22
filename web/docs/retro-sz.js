/* ═══════════════════════════════════════════════════════════
   RETRO-SZ.JS
   Shared behaviour for all Oxntal documentation pages.
   Requires: sz.js (Silicon Zen) loaded first.
   ═══════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ── Active nav highlighting ──────────────────────────── */
    const path = window.location.pathname.split('/').pop() || 'docs.html';
    document.querySelectorAll('.retro-btn[data-page]').forEach(function (btn) {
        if (btn.dataset.page === path) btn.classList.add('is-active');
    });

    /* ── Theme toggle (parchment ↔ obsidian) ─────────────── */
    var themeBtn = document.getElementById('themeToggle');
    if (themeBtn && window.SZ) {
        var current = 'parchment';
        try {
            current = localStorage.getItem('oxn-theme') || 'parchment';
        } catch (e) { /* ignore */ }
        SZ.theme(current);
        themeBtn.textContent = current === 'obsidian' ? '☀ Parchment' : '☾ Obsidian';

        themeBtn.addEventListener('click', function () {
            SZ.toggleTheme();
            var next = document.documentElement.dataset.szTheme || 'parchment';
            try { localStorage.setItem('oxn-theme', next); } catch (e) { /* ignore */ }
            themeBtn.textContent = next === 'obsidian' ? '☀ Parchment' : '☾ Obsidian';
        });
    }

    /* ── Toast helper ─────────────────────────────────────── */
    window.oxnToast = function (msg, type) {
        if (window.SZ && SZ.toast) SZ.toast(msg, type || 'info');
    };

    /* ── Copy-to-clipboard for code blocks ────────────────── */
    document.querySelectorAll('.sz-code[data-copy]').forEach(function (el) {
        el.style.cursor = 'pointer';
        el.title = 'Click to copy';
        el.addEventListener('click', function () {
            var text = el.getAttribute('data-copy') || el.textContent;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(function () {
                    oxnToast('Copied to clipboard', 'ok');
                });
            }
        });
    });

    /* ── Smooth scroll for in-page anchors ────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var target = document.querySelector(a.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    /* ── Keyboard shortcuts ───────────────────────────────── */
    document.addEventListener('keydown', function (e) {
        /* Ctrl/Cmd + K → focus search if present */
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            var search = document.getElementById('docSearch');
            if (search) { e.preventDefault(); search.focus(); }
        }
    });

    /* ── Auto-init Silicon Zen ────────────────────────────── */
    if (window.SZ) SZ.init();
})();