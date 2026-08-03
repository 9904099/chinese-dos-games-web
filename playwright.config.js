'use strict';

const {defineConfig} = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    testMatch: '**/*.e2e.js',
    timeout: 30000,
    retries: 0,
    workers: 1,
    use: {
        headless: true,
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
            args: ['--enable-unsafe-swiftshader']
        } : undefined
    }
});
