'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const gameTemplate = fs.readFileSync(path.join(root, 'templates/game.html'), 'utf8');
const baseTemplate = fs.readFileSync(path.join(root, 'templates/base.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'static/css/main.css'), 'utf8');

test('base template declares a mobile viewport', () => {
    assert.match(baseTemplate, /name="viewport"[^>]*width=device-width/);
});

test('game canvas is focusable and exposes mobile input controls', () => {
    assert.match(gameTemplate, /id="canvas"[^>]*tabindex="0"/);
    assert.match(gameTemplate, /id="mobile_controls"/);
    assert.match(gameTemplate, /data-control="gamepad"/);
    assert.match(gameTemplate, /data-control="keyboard"/);
    assert.match(gameTemplate, /data-control="mouse"/);
    assert.match(gameTemplate, /id="mapping_editor"/);
    assert.match(gameTemplate, /js\/game-controls\.js/);
});

test('mobile controls prevent browser gestures and respect safe areas', () => {
    assert.match(css, /\.mobile-controls[\s\S]*touch-action:\s*none/);
    assert.match(css, /env\(safe-area-inset-bottom/);
    assert.match(css, /@media\s*\(max-width:\s*767\.98px\)/);
});
