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

test('virtual gamepad reaches the DOS game canvas', async ({page}) => {
    const errors = [];
    const consoleMessages = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => consoleMessages.push(message.text()));
    await page.goto(baseURL + gamePath, {waitUntil: 'networkidle'});
    await page.evaluate(() => localStorage.removeItem('dosgame.controls.v1'));
    await page.reload({waitUntil: 'networkidle'});
    await page.evaluate(() => {
        window.__virtualKeys = [];
        ['keydown', 'keyup'].forEach(type => window.addEventListener(type, event => {
            window.__virtualKeys.push([type, event.code, event.keyCode, event.target.id]);
        }, true));
    });

    await page.locator('#game_focus_button').click();
    await expect.poll(() => page.locator('#canvas').evaluate(canvas => canvas.width), {timeout: 15000}).toBe(640);
    await expect.poll(() => consoleMessages.some(message => message.includes('DOSBox version')), {timeout: 15000}).toBe(true);
    await page.waitForTimeout(500);

    const beforeEnter = await page.locator('#canvas').screenshot();
    await page.locator('#canvas').screenshot({path: 'test-results/canvas-before-enter.png'});
    const start = page.locator('[data-gamepad-action="start"]');
    await start.tap();
    await page.waitForTimeout(1200);
    const afterEnter = await page.locator('#canvas').screenshot();
    await page.locator('#canvas').screenshot({path: 'test-results/canvas-after-enter.png'});
    expect(afterEnter.equals(beforeEnter)).toBe(false);

    await start.tap();
    await page.waitForTimeout(500);
    await page.locator('#canvas').screenshot({path: 'test-results/canvas-after-second-enter.png'});

    await page.locator('[data-control="keyboard"]').tap();
    const digit = page.locator('[data-key-code="Digit1"]');
    await digit.tap();
    await page.waitForTimeout(300);
    await page.locator('#canvas').screenshot({path: 'test-results/canvas-after-digit.png'});
    await expect.poll(() => page.evaluate(() => window.__virtualKeys)).toEqual([
        ['keydown', 'Enter', 13, 'canvas'], ['keyup', 'Enter', 13, 'canvas'],
        ['keydown', 'Enter', 13, 'canvas'], ['keyup', 'Enter', 13, 'canvas'],
        ['keydown', 'Digit1', 49, 'canvas'], ['keyup', 'Digit1', 49, 'canvas']
    ]);

    await page.screenshot({path: 'test-results/dosgame-mobile-controls.png', fullPage: true});
    expect(errors).toEqual([]);
});
