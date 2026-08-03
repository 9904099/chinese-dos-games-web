'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    DEFAULT_BINDINGS,
    InputController,
    KEYBOARD_ROWS,
    MouseController,
    loadBindings,
    saveBindings
} = require('../static/js/game-controls.js');

test('mobile keyboard rows fit without horizontal scrolling', () => {
    assert.equal(KEYBOARD_ROWS.every(row => row.length <= 7), true);
});

function keyboardHarness() {
    const events = [];
    const target = {
        focusCalls: 0,
        focus() { this.focusCalls += 1; },
        dispatchEvent(event) { events.push(event); return true; }
    };
    const eventFactory = (type, key) => ({type, ...key});
    return {events, target, controller: new InputController(target, eventFactory)};
}

function mouseHarness() {
    const events = [];
    const canvas = {
        width: 640,
        height: 480,
        focus() {},
        dispatchEvent(event) { events.push(event); return true; },
        getBoundingClientRect() { return {left: 10, top: 20, width: 320, height: 240}; }
    };
    const eventFactory = (type, options) => ({type, ...options});
    return {events, canvas, controller: new MouseController(canvas, eventFactory)};
}

test('default gamepad bindings cover directions and action buttons', () => {
    assert.deepEqual(Object.keys(DEFAULT_BINDINGS), [
        'up', 'down', 'left', 'right', 'a', 'b', 'x', 'y', 'start', 'select'
    ]);
    assert.equal(DEFAULT_BINDINGS.up.code, 'ArrowUp');
    assert.equal(DEFAULT_BINDINGS.start.code, 'Enter');
    assert.equal(DEFAULT_BINDINGS.select.code, 'Escape');
});

test('press and release dispatch one complete keyboard lifecycle', () => {
    const {events, target, controller} = keyboardHarness();

    controller.press('dpad-up', DEFAULT_BINDINGS.up);
    controller.release('dpad-up');

    assert.equal(target.focusCalls, 1);
    assert.deepEqual(events.map(event => [event.type, event.code, event.keyCode]), [
        ['keydown', 'ArrowUp', 38],
        ['keyup', 'ArrowUp', 38]
    ]);
});

test('duplicate pointer presses cannot leave a key stuck', () => {
    const {events, controller} = keyboardHarness();

    controller.press('button-a', DEFAULT_BINDINGS.a);
    controller.press('button-a', DEFAULT_BINDINGS.a);
    controller.release('button-a');
    controller.release('button-a');

    assert.deepEqual(events.map(event => event.type), ['keydown', 'keyup']);
});

test('releaseAll releases every active key exactly once', () => {
    const {events, controller} = keyboardHarness();

    controller.press('left-finger', DEFAULT_BINDINGS.left);
    controller.press('action-finger', DEFAULT_BINDINGS.a);
    controller.releaseAll();

    assert.deepEqual(events.map(event => [event.type, event.code]), [
        ['keydown', 'ArrowLeft'],
        ['keydown', 'KeyZ'],
        ['keyup', 'ArrowLeft'],
        ['keyup', 'KeyZ']
    ]);
});

test('bindings persist only recognized keyboard codes', () => {
    const values = new Map();
    const storage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, value); }
    };

    saveBindings(storage, {...DEFAULT_BINDINGS, a: {code: 'Space', key: ' ', keyCode: 32}});
    const saved = JSON.parse(values.get('dosgame.controls.v1'));
    saved.b = {code: 'NotARealKey', key: 'bad', keyCode: 999};
    values.set('dosgame.controls.v1', JSON.stringify(saved));

    const loaded = loadBindings(storage);
    assert.equal(loaded.a.code, 'Space');
    assert.deepEqual(loaded.b, DEFAULT_BINDINGS.b);
});

test('null saved bindings fall back to defaults', () => {
    const storage = {getItem() { return 'null'; }};

    assert.deepEqual(loadBindings(storage), DEFAULT_BINDINGS);
});

test('blocked browser storage does not disable controls', () => {
    const storage = {
        getItem() { throw Object.assign(new Error('blocked'), {name: 'SecurityError'}); },
        setItem() { throw Object.assign(new Error('full'), {name: 'QuotaExceededError'}); }
    };

    assert.deepEqual(loadBindings(storage), DEFAULT_BINDINGS);
    assert.equal(saveBindings(storage, DEFAULT_BINDINGS), false);
});

test('relative touchpad motion is scaled and clamped to the canvas', () => {
    const {events, controller} = mouseHarness();

    controller.move(500, -500);

    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'mousemove');
    assert.equal(events[0].clientX, 330);
    assert.equal(events[0].clientY, 20);
});

test('virtual mouse buttons emit left and right click pairs', () => {
    const {events, controller} = mouseHarness();

    controller.click(0);
    controller.click(2);

    assert.deepEqual(events.map(event => [event.type, event.button]), [
        ['mousedown', 0], ['mouseup', 0],
        ['mousedown', 2], ['mouseup', 2]
    ]);
});
