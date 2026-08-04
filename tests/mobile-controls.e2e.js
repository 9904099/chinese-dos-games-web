'use strict';

const {test, expect} = require('@playwright/test');

const baseURL = process.env.DOSGAME_BASE_URL || 'http://127.0.0.1:19262';
const gamePath = '/games/%E5%A4%A7%E8%88%AA%E6%B5%B7%E6%97%B6%E4%BB%A32/';

test.use({
    viewport: {width: 390, height: 844},
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true
});

test('gamepad fits a 320px viewport without internal overflow', async ({page}) => {
    await page.setViewportSize({width: 320, height: 844});
    await page.goto(baseURL + gamePath, {waitUntil: 'networkidle'});

    const widths = await page.evaluate(() => {
        const controls = document.querySelector('#mobile_controls');
        const gamepad = document.querySelector('.gamepad-panel');
        return {
            body: [document.body.clientWidth, document.body.scrollWidth],
            controls: [controls.clientWidth, controls.scrollWidth],
            gamepad: [gamepad.clientWidth, gamepad.scrollWidth]
        };
    });
    expect(widths.body[1]).toBe(widths.body[0]);
    expect(widths.controls[1]).toBe(widths.controls[0]);
    expect(widths.gamepad[1]).toBe(widths.gamepad[0]);

    await page.locator('[data-control="keyboard"]').tap();
    const keyboardWidths = await page.evaluate(() => {
        const keyboard = document.querySelector('#virtual_keyboard');
        return {
            keyboard: [keyboard.clientWidth, keyboard.scrollWidth],
            rows: Array.from(keyboard.children).map(row => [row.clientWidth, row.scrollWidth])
        };
    });
    expect(keyboardWidths.keyboard[1]).toBe(keyboardWidths.keyboard[0]);
    keyboardWidths.rows.forEach(width => expect(width[1]).toBe(width[0]));
    const scroll = await page.locator('#mobile_controls').evaluate(element => {
        element.scrollTop = element.scrollHeight;
        return {top: element.scrollTop, overflow: getComputedStyle(element).overflowY,
            touchAction: getComputedStyle(element).touchAction};
    });
    expect(scroll.top).toBeGreaterThan(0);
    expect(scroll.overflow).toBe('auto');
    expect(scroll.touchAction).toBe('pan-y');
});

test('portrait controls stay fixed in the lower half', async ({page}) => {
    await page.goto(baseURL + gamePath, {waitUntil: 'networkidle'});
    await page.locator('#game_focus_button').click();
    await expect.poll(() => page.locator('#canvas').evaluate(canvas => canvas.width), {timeout: 15000}).toBe(640);
    await page.waitForTimeout(500);
    await page.locator('#canvas').evaluate(canvas => {
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
    });
    const layout = await page.locator('#mobile_controls').evaluate(element => {
        const rect = element.getBoundingClientRect();
        return {position: getComputedStyle(element).position, top: rect.top, bottom: rect.bottom,
            width: rect.width, canvasBottom: document.querySelector('#canvas').getBoundingClientRect().bottom,
            viewport: [window.innerWidth, window.innerHeight]};
    });

    expect(layout.position).toBe('fixed');
    expect(layout.top).toBeGreaterThanOrEqual(layout.viewport[1] * 0.48);
    expect(layout.bottom).toBeLessThanOrEqual(layout.viewport[1] + 1);
    expect(layout.width).toBeGreaterThanOrEqual(layout.viewport[0] - 1);
    expect(layout.canvasBottom).toBeLessThanOrEqual(layout.top + 1);
});

test('non-game pages keep the normal mobile viewport', async ({page}) => {
    await page.goto(baseURL + '/', {waitUntil: 'networkidle'});
    expect(await page.evaluate(() => getComputedStyle(document.body).paddingBottom)).toBe('0px');
    await page.setViewportSize({width: 844, height: 390});
    await page.goto(baseURL + '/', {waitUntil: 'networkidle'});
    expect(await page.evaluate(() => getComputedStyle(document.body).paddingRight)).toBe('0px');
});

test('landscape controls dock beside the game', async ({page}) => {
    await page.setViewportSize({width: 844, height: 390});
    await page.goto(baseURL + gamePath, {waitUntil: 'networkidle'});
    await page.locator('#game_focus_button').click();
    await expect.poll(() => page.locator('#canvas').evaluate(canvas => canvas.width), {timeout: 15000}).toBe(640);
    await page.waitForTimeout(500);
    await page.locator('#canvas').evaluate(canvas => {
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
    });
    const layout = await page.evaluate(() => {
        const controls = document.querySelector('#mobile_controls').getBoundingClientRect();
        const canvas = document.querySelector('#canvas').getBoundingClientRect();
        return {controls: {left: controls.left, top: controls.top, right: controls.right,
            bottom: controls.bottom}, canvasRight: canvas.right, canvasBottom: canvas.bottom,
            viewport: [window.innerWidth, window.innerHeight]};
    });

    expect(layout.controls.left).toBeGreaterThan(layout.viewport[0] * 0.5);
    expect(layout.controls.top).toBeLessThanOrEqual(1);
    expect(layout.controls.right).toBeGreaterThanOrEqual(layout.viewport[0] - 1);
    expect(layout.controls.bottom).toBeGreaterThanOrEqual(layout.viewport[1] - 1);
    expect(layout.canvasRight).toBeLessThanOrEqual(layout.controls.left + 1);
    expect(layout.canvasBottom).toBeLessThanOrEqual(layout.viewport[1] + 1);
});

test('web fullscreen keeps mobile controls visible', async ({page}) => {
    await page.setViewportSize({width: 844, height: 390});
    await page.goto(baseURL + gamePath, {waitUntil: 'networkidle'});
    await page.locator('input[value="网页全屏"]').click();
    await expect(page.locator('#screen_container')).toHaveClass(/html-fullscreen/);
    await expect(page.locator('#mobile_controls')).toBeVisible();
    await expect(page.locator('#screen_container #mobile_controls')).toHaveCount(1);
    const layout = await page.evaluate(() => ({
        canvasRight: document.querySelector('#canvas').getBoundingClientRect().right,
        controlsLeft: document.querySelector('#mobile_controls').getBoundingClientRect().left
    }));
    expect(layout.canvasRight).toBeLessThanOrEqual(layout.controlsLeft + 1);
});

test('desktop fullscreen controls are not blocked by the loader splash', async ({browser}) => {
    const page = await browser.newPage({viewport: {width: 1280, height: 720}});
    await page.goto(baseURL + gamePath, {waitUntil: 'networkidle'});
    await page.locator('input[value="网页全屏"]').click();
    await expect(page.locator('#screen_container')).toHaveClass(/html-fullscreen/);
    await page.close();
});

test('game fullscreen keeps mobile controls visible', async ({page}) => {
    await page.setViewportSize({width: 844, height: 390});
    await page.goto(baseURL + gamePath, {waitUntil: 'networkidle'});
    await page.locator('#game_focus_button').click();
    await expect.poll(() => page.locator('#canvas').evaluate(canvas => canvas.width), {timeout: 15000}).toBe(640);
    await page.locator('input[value="全屏游戏"]').click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement && document.fullscreenElement.id))
        .toBe('screen_container');
    await expect(page.locator('#mobile_controls')).toBeVisible();
    const canvasRatio = await page.locator('#canvas').evaluate(canvas => {
        const rect = canvas.getBoundingClientRect();
        return {rendered: rect.width / rect.height, intrinsic: canvas.width / canvas.height};
    });
    expect(Math.abs(canvasRatio.rendered - canvasRatio.intrinsic)).toBeLessThan(0.02);
    const layout = await page.evaluate(() => ({
        canvasRight: document.querySelector('#canvas').getBoundingClientRect().right,
        controlsLeft: document.querySelector('#mobile_controls').getBoundingClientRect().left
    }));
    expect(layout.canvasRight).toBeLessThanOrEqual(layout.controlsLeft + 1);
    await page.locator('input[value="退出全屏"]').click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBe(null);
});

test('rejected fullscreen request falls back to web fullscreen', async ({page}) => {
    await page.setViewportSize({width: 844, height: 390});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseURL + gamePath, {waitUntil: 'networkidle'});
    await page.locator('#screen_container').evaluate(element => {
        element.requestFullscreen = function () { return Promise.reject(new Error('fullscreen blocked')); };
        element.webkitRequestFullscreen = undefined;
    });
    await page.locator('input[value="全屏游戏"]').click();
    await expect(page.locator('#screen_container')).toHaveClass(/html-fullscreen/);
    await expect(page.locator('#mobile_controls')).toBeVisible();
    const layout = await page.evaluate(() => ({
        canvasRight: document.querySelector('#canvas').getBoundingClientRect().right,
        controlsLeft: document.querySelector('#mobile_controls').getBoundingClientRect().left
    }));
    expect(layout.canvasRight).toBeLessThanOrEqual(layout.controlsLeft + 1);
    expect(errors).toEqual([]);
});

test('exiting native fullscreen also clears a pre-existing web fullscreen', async ({page}) => {
    await page.setViewportSize({width: 844, height: 390});
    await page.goto(baseURL + gamePath, {waitUntil: 'networkidle'});
    await page.locator('input[value="网页全屏"]').click();
    await page.locator('input[value="全屏游戏"]').click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement && document.fullscreenElement.id))
        .toBe('screen_container');
    await page.locator('input[value="退出全屏"]').click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBe(null);
    await expect(page.locator('#screen_container')).not.toHaveClass(/html-fullscreen/);
    await expect(page.locator('#exit_button')).not.toHaveClass(/exit_fullscreen_show/);
});

test('mobile controls are usable and custom mappings survive reload', async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseURL + gamePath, {waitUntil: 'networkidle'});

    await expect(page.locator('#mobile_controls')).toBeVisible();
    await expect(page.locator('[data-gamepad-action="up"]')).toHaveCSS('min-height', '44px');

    await page.locator('[data-control="keyboard"]').click();
    await expect(page.locator('#virtual_keyboard')).toBeVisible();
    await expect(page.locator('[data-key-code="Enter"]')).toBeVisible();

    await page.locator('[data-control="mouse"]').click();
    await expect(page.locator('#virtual_trackpad')).toBeVisible();
    await expect(page.locator('[data-mouse-button="0"]')).toBeVisible();
    await expect(page.locator('[data-mouse-button="2"]')).toBeVisible();

    await page.locator('[data-control="mapping"]').click();
    await page.locator('select[data-mapping-action="a"]').selectOption('Space');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dosgame.controls.v1')).a)).toBe('Space');

    await page.reload({waitUntil: 'networkidle'});
    await expect(page.locator('[data-gamepad-action="a"]')).toHaveAttribute('data-bound-key', 'Space');
    await page.evaluate(() => {
        window.__mappedKeys = [];
        window.addEventListener('keydown', event => window.__mappedKeys.push(event.code), true);
    });
    await page.locator('[data-gamepad-action="a"]').tap();
    await expect.poll(() => page.evaluate(() => window.__mappedKeys)).toContain('Space');

    await page.locator('[data-control="mouse"]').tap();
    await page.evaluate(() => {
        window.__mouseButtons = [];
        document.querySelector('#canvas').addEventListener('mousedown', event => window.__mouseButtons.push(event.button));
    });
    await page.locator('[data-mouse-button="0"]').tap();
    await expect.poll(() => page.evaluate(() => window.__mouseButtons)).toEqual([0]);
    expect(errors).toEqual([]);
});

test('virtual keyboard events are consumed by DOSBox', async ({page}) => {
    const errors = [];
    const consoleMessages = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => consoleMessages.push(message.text()));
    await page.goto(baseURL + gamePath, {waitUntil: 'networkidle'});
    await page.evaluate(() => localStorage.removeItem('dosgame.controls.v1'));
    await page.reload({waitUntil: 'networkidle'});
    await page.locator('#game_focus_button').click();
    await expect.poll(() => page.locator('#canvas').evaluate(canvas => canvas.width), {timeout: 15000}).toBe(640);
    await expect.poll(() => consoleMessages.some(message => message.includes('DOSBox version')), {timeout: 15000}).toBe(true);
    await page.waitForTimeout(500);
    await page.evaluate(() => {
        window.__virtualKeys = [];
        ['keydown', 'keyup'].forEach(type => window.addEventListener(type, event => {
            window.__virtualKeys.push([type, event.code, event.keyCode, event.target.id,
                event.defaultPrevented]);
        }));
    });

    const start = page.locator('[data-gamepad-action="start"]');
    await start.tap();
    await start.tap();

    await page.locator('[data-control="keyboard"]').tap();
    const digit = page.locator('[data-key-code="Digit1"]');
    await digit.tap();
    await expect.poll(() => page.evaluate(() => window.__virtualKeys)).toEqual([
        ['keydown', 'Enter', 13, 'canvas', true], ['keyup', 'Enter', 13, 'canvas', true],
        ['keydown', 'Enter', 13, 'canvas', true], ['keyup', 'Enter', 13, 'canvas', true],
        ['keydown', 'Digit1', 49, 'canvas', true], ['keyup', 'Digit1', 49, 'canvas', true]
    ]);

    await page.screenshot({path: 'test-results/dosgame-mobile-controls.png', fullPage: true});
    expect(errors).toEqual([]);
});
