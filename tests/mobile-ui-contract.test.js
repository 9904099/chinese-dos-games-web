'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const gameTemplate = fs.readFileSync(path.join(root, 'templates/game.html'), 'utf8');
const baseTemplate = fs.readFileSync(path.join(root, 'templates/base.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'static/css/main.css'), 'utf8');
const gameJs = fs.readFileSync(path.join(root, 'static/js/game.js'), 'utf8');

test('base template declares a mobile viewport', () => {
    assert.match(baseTemplate, /name="viewport"[^>]*width=device-width/);
});

test('mobile control assets are cache busted', () => {
    assert.match(baseTemplate, /filename='css\/main\.css', v='mobile-controls-3'/);
    assert.match(baseTemplate, /filename='js\/game\.js', v='mobile-controls-3'/);
    assert.match(gameTemplate, /filename='js\/game-controls\.js', v='mobile-controls-3'/);
    assert.match(gameTemplate, /filename='js\/game\.js', v='mobile-controls-3'/);
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
    assert.match(css, /\.mobile-controls[\s\S]*touch-action:\s*pan-y/);
    assert.match(css, /\.mobile-controls button[\s\S]*touch-action:\s*none/);
    assert.match(css, /env\(safe-area-inset-bottom/);
    assert.match(css, /@media\s*\(max-width:\s*767\.98px\)/);
});

test('mobile controls stay inside the fullscreen surface', () => {
    const screenStart = gameTemplate.indexOf('id="screen_container"');
    const controls = gameTemplate.indexOf('id="mobile_controls"');
    const screenEnd = gameTemplate.indexOf('<!-- screen_container_end -->');

    assert.ok(screenStart >= 0 && controls > screenStart && screenEnd > controls);
    assert.match(gameTemplate, /value="全屏游戏"[\s\S]*onclick="gameFullscreen\(\);"/);
    assert.match(gameJs, /function gameFullscreen\(\)/);
    assert.match(gameJs, /function exitGameFullscreen\(\)/);
    assert.match(css, /#screen_container\.html-fullscreen/);
    assert.match(css, /#screen_container:fullscreen/);
});

test('portrait and landscape use different fixed control docks', () => {
    assert.match(css, /orientation:\s*portrait[\s\S]*\.mobile-controls[\s\S]*position:\s*fixed[\s\S]*height:\s*50dvh/);
    assert.match(css, /orientation:\s*landscape[\s\S]*\.mobile-controls[\s\S]*right:\s*0[\s\S]*width:\s*42vw/);
});

test('responsive game layout is scoped to game pages', () => {
    assert.match(baseTemplate, /<body class="{% block body_class %}{% endblock %}">/);
    assert.match(gameTemplate, /{% block body_class %}game-page{% endblock %}/);
    assert.match(css, /\.game-page[\s\S]*padding-bottom:\s*50dvh/);
    assert.match(css, /\.game-page[\s\S]*padding-right:\s*42vw/);
});
