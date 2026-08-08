(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    else {
        root.DosGameControls = api;
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var KEY_CATALOG = [
        ['ArrowUp', 'ArrowUp', 38, '↑'], ['ArrowDown', 'ArrowDown', 40, '↓'],
        ['ArrowLeft', 'ArrowLeft', 37, '←'], ['ArrowRight', 'ArrowRight', 39, '→'],
        ['Enter', 'Enter', 13, 'Enter'], ['Escape', 'Escape', 27, 'Esc'],
        ['PageUp', 'PageUp', 33, 'PgUp'], ['PageDown', 'PageDown', 34, 'PgDn'],
        ['Space', ' ', 32, 'Space'], ['Tab', 'Tab', 9, 'Tab'],
        ['Backspace', 'Backspace', 8, '⌫'], ['ControlLeft', 'Control', 17, 'Ctrl'],
        ['AltLeft', 'Alt', 18, 'Alt'], ['ShiftLeft', 'Shift', 16, 'Shift'],
        ['F1', 'F1', 112, 'F1'], ['F2', 'F2', 113, 'F2'], ['F3', 'F3', 114, 'F3'],
        ['F4', 'F4', 115, 'F4'], ['F5', 'F5', 116, 'F5'], ['F6', 'F6', 117, 'F6'],
        ['F7', 'F7', 118, 'F7'], ['F8', 'F8', 119, 'F8'], ['F9', 'F9', 120, 'F9'],
        ['F10', 'F10', 121, 'F10'], ['F11', 'F11', 122, 'F11'], ['F12', 'F12', 123, 'F12']
    ];
    var letter;
    var digit;
    for (digit = 0; digit <= 9; digit += 1) {
        KEY_CATALOG.push(['Digit' + digit, String(digit), 48 + digit, String(digit)]);
    }
    for (letter = 65; letter <= 90; letter += 1) {
        KEY_CATALOG.push(['Key' + String.fromCharCode(letter), String.fromCharCode(letter + 32), letter,
            String.fromCharCode(letter)]);
    }

    var KEY_BY_CODE = {};
    KEY_CATALOG.forEach(function (item) {
        KEY_BY_CODE[item[0]] = {code: item[0], key: item[1], keyCode: item[2], label: item[3]};
    });

    var DEFAULT_BINDINGS = {
        up: KEY_BY_CODE.ArrowUp,
        down: KEY_BY_CODE.ArrowDown,
        left: KEY_BY_CODE.ArrowLeft,
        right: KEY_BY_CODE.ArrowRight,
        a: KEY_BY_CODE.KeyZ,
        b: KEY_BY_CODE.KeyX,
        x: KEY_BY_CODE.KeyA,
        y: KEY_BY_CODE.KeyS,
        start: KEY_BY_CODE.Enter,
        select: KEY_BY_CODE.Escape,
        pageup: KEY_BY_CODE.PageUp,
        pagedown: KEY_BY_CODE.PageDown
    };
    var STORAGE_KEY = 'dosgame.controls.v1';

    function cloneKey(key) {
        return {code: key.code, key: key.key, keyCode: key.keyCode, label: key.label};
    }

    function defaultBindings() {
        var result = {};
        Object.keys(DEFAULT_BINDINGS).forEach(function (action) {
            result[action] = cloneKey(DEFAULT_BINDINGS[action]);
        });
        return result;
    }

    function loadBindings(storage) {
        var bindings = defaultBindings();
        var saved;
        try {
            saved = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
        }
        catch (error) {
            saved = {};
        }
        if (!saved || typeof saved !== 'object') {
            saved = {};
        }
        Object.keys(bindings).forEach(function (action) {
            var code = saved[action] && (saved[action].code || saved[action]);
            if (KEY_BY_CODE[code]) {
                bindings[action] = cloneKey(KEY_BY_CODE[code]);
            }
        });
        return bindings;
    }

    function saveBindings(storage, bindings) {
        var saved = {};
        Object.keys(DEFAULT_BINDINGS).forEach(function (action) {
            var key = bindings[action];
            saved[action] = KEY_BY_CODE[key && key.code] ? key.code : DEFAULT_BINDINGS[action].code;
        });
        try {
            storage.setItem(STORAGE_KEY, JSON.stringify(saved));
            return true;
        }
        catch (error) {
            return false;
        }
    }

    function browserKeyboardEvent(type, key) {
        var event = new KeyboardEvent(type, {
            key: key.key,
            code: key.code,
            keyCode: key.keyCode,
            which: key.keyCode,
            bubbles: true,
            cancelable: true
        });
        if (event.keyCode !== key.keyCode) {
            try {
                Object.defineProperty(event, 'keyCode', {get: function () { return key.keyCode; }});
                Object.defineProperty(event, 'which', {get: function () { return key.keyCode; }});
            }
            catch (ignore) {
                // Older browsers already expose the constructor values.
            }
        }
        return event;
    }

    function InputController(target, eventFactory) {
        this.target = target;
        this.eventFactory = eventFactory || browserKeyboardEvent;
        this.sources = {};
        this.codeCounts = {};
    }

    InputController.prototype.press = function (source, key) {
        if (this.sources[source]) {
            return;
        }
        this.sources[source] = key;
        this.codeCounts[key.code] = (this.codeCounts[key.code] || 0) + 1;
        if (this.codeCounts[key.code] === 1) {
            this.target.focus();
            this.target.dispatchEvent(this.eventFactory('keydown', key));
        }
    };

    InputController.prototype.release = function (source) {
        var key = this.sources[source];
        if (!key) {
            return;
        }
        delete this.sources[source];
        this.codeCounts[key.code] -= 1;
        if (this.codeCounts[key.code] === 0) {
            delete this.codeCounts[key.code];
            this.target.dispatchEvent(this.eventFactory('keyup', key));
        }
    };

    InputController.prototype.releaseAll = function () {
        var self = this;
        Object.keys(this.sources).forEach(function (source) {
            self.release(source);
        });
    };

    function browserMouseEvent(type, options) {
        return new MouseEvent(type, Object.assign({bubbles: true, cancelable: true, view: window}, options));
    }

    function MouseController(canvas, eventFactory) {
        this.canvas = canvas;
        this.eventFactory = eventFactory || browserMouseEvent;
        this.clientX = null;
        this.clientY = null;
    }

    MouseController.prototype.position = function () {
        var rect = this.canvas.getBoundingClientRect();
        if (this.clientX === null || this.clientY === null) {
            this.clientX = rect.left + rect.width / 2;
            this.clientY = rect.top + rect.height / 2;
        }
        return rect;
    };

    MouseController.prototype.dispatch = function (type, button, movementX, movementY) {
        this.position();
        this.canvas.dispatchEvent(this.eventFactory(type, {
            button: button,
            buttons: type === 'mousedown' ? (button === 2 ? 2 : 1) : 0,
            clientX: this.clientX,
            clientY: this.clientY,
            screenX: this.clientX,
            screenY: this.clientY,
            movementX: movementX || 0,
            movementY: movementY || 0
        }));
    };

    MouseController.prototype.move = function (deltaX, deltaY) {
        var rect = this.position();
        var oldX = this.clientX;
        var oldY = this.clientY;
        this.clientX = Math.max(rect.left, Math.min(rect.left + rect.width, this.clientX + deltaX));
        this.clientY = Math.max(rect.top, Math.min(rect.top + rect.height, this.clientY + deltaY));
        this.dispatch('mousemove', 0, this.clientX - oldX, this.clientY - oldY);
    };

    MouseController.prototype.click = function (button) {
        this.canvas.focus();
        this.dispatch('mousedown', button, 0, 0);
        this.dispatch('mouseup', button, 0, 0);
    };

    var KEYBOARD_ROWS = [
        ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6'],
        ['F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
        ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'],
        ['Digit7', 'Digit8', 'Digit9', 'Digit0', 'Backspace'],
        ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'],
        ['KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
        ['ControlLeft', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG'],
        ['KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Enter'],
        ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'],
        ['KeyB', 'KeyN', 'KeyM', 'ArrowUp'],
        ['AltLeft', 'Space', 'ArrowLeft', 'ArrowDown', 'ArrowRight']
    ];

    function bindVirtualKey(button, sourcePrefix, keyProvider, input) {
        function source(event) {
            return sourcePrefix + ':' + event.pointerId;
        }
        button.addEventListener('pointerdown', function (event) {
            event.preventDefault();
            if (button.setPointerCapture) {
                try {
                    button.setPointerCapture(event.pointerId);
                }
                catch (ignore) {
                    // Programmatic pointer events do not own an active pointer.
                }
            }
            button.classList.add('is-pressed');
            input.press(source(event), keyProvider());
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (type) {
            button.addEventListener(type, function (event) {
                event.preventDefault();
                button.classList.remove('is-pressed');
                input.release(source(event));
            });
        });
    }

    function renderKeyboard(documentRef, container, input) {
        KEYBOARD_ROWS.forEach(function (row, rowIndex) {
            var rowElement = documentRef.createElement('div');
            rowElement.className = 'virtual-keyboard-row';
            row.forEach(function (code) {
                var key = KEY_BY_CODE[code];
                var button = documentRef.createElement('button');
                button.type = 'button';
                button.className = 'virtual-key';
                button.textContent = key.label;
                button.setAttribute('aria-label', key.label);
                button.dataset.keyCode = code;
                bindVirtualKey(button, 'keyboard-' + rowIndex + '-' + code, function () { return key; }, input);
                rowElement.appendChild(button);
            });
            container.appendChild(rowElement);
        });
    }

    function renderMappingEditor(documentRef, container, bindings, storage, gamepadButtons) {
        var labels = {up: '上', down: '下', left: '左', right: '右', a: 'A', b: 'B', x: 'X', y: 'Y',
            start: '开始', select: '选择', pageup: 'PageUp', pagedown: 'PageDown'};
        Object.keys(DEFAULT_BINDINGS).forEach(function (action) {
            var row = documentRef.createElement('label');
            var select = documentRef.createElement('select');
            row.className = 'mapping-row';
            row.appendChild(documentRef.createTextNode(labels[action]));
            KEY_CATALOG.forEach(function (item) {
                var option = documentRef.createElement('option');
                option.value = item[0];
                option.textContent = item[3];
                option.selected = bindings[action].code === item[0];
                select.appendChild(option);
            });
            select.dataset.mappingAction = action;
            select.addEventListener('change', function () {
                bindings[action] = cloneKey(KEY_BY_CODE[select.value]);
                saveBindings(storage, bindings);
                if (gamepadButtons[action]) {
                    gamepadButtons[action].dataset.boundKey = bindings[action].label;
                }
            });
            row.appendChild(select);
            container.appendChild(row);
        });
    }

    function init(documentRef, storage) {
        var rootElement = documentRef.getElementById('mobile_controls');
        var canvas = documentRef.getElementById('canvas');
        if (!rootElement || !canvas) {
            return null;
        }
        if (!storage) {
            try {
                storage = window.localStorage;
            }
            catch (ignore) {
                storage = null;
            }
        }
        var input = new InputController(canvas);
        var mouse = new MouseController(canvas);
        var bindings = loadBindings(storage);
        var gamepadButtons = {};

        canvas.addEventListener('click', function () { canvas.focus(); });
        canvas.focus();
        var splash = documentRef.getElementById('emularity-splash-screen');
        var splashObserver = null;
        function stopCanvasActivation() {
            rootElement.removeEventListener('pointerdown', activateCanvas, true);
            if (splashObserver) {
                splashObserver.disconnect();
                splashObserver = null;
            }
        }
        function activateCanvas(event) {
            if (!event.target.closest('[data-control-panel]')) {
                return;
            }
            if (splash && splash.style.display === 'none') {
                stopCanvasActivation();
                return;
            }
            canvas.click();
            canvas.focus();
        }
        rootElement.addEventListener('pointerdown', activateCanvas, true);
        if (splash && window.MutationObserver) {
            splashObserver = new window.MutationObserver(function () {
                if (splash.style.display === 'none') {
                    stopCanvasActivation();
                }
            });
            splashObserver.observe(splash, {attributes: true, attributeFilter: ['style']});
        }

        rootElement.querySelectorAll('[data-gamepad-action]').forEach(function (button) {
            var action = button.dataset.gamepadAction;
            gamepadButtons[action] = button;
            button.dataset.boundKey = bindings[action].label;
            bindVirtualKey(button, 'gamepad-' + action, function () { return bindings[action]; }, input);
        });

        rootElement.querySelectorAll('[data-control]').forEach(function (tab) {
            tab.addEventListener('click', function () {
                var selected = tab.dataset.control;
                rootElement.querySelectorAll('[data-control]').forEach(function (item) {
                    item.setAttribute('aria-selected', item.dataset.control === selected ? 'true' : 'false');
                });
                rootElement.querySelectorAll('[data-control-panel]').forEach(function (panel) {
                    panel.hidden = panel.dataset.controlPanel !== selected;
                });
                input.releaseAll();
            });
        });

        renderKeyboard(documentRef, documentRef.getElementById('virtual_keyboard'), input);
        renderMappingEditor(documentRef, documentRef.getElementById('mapping_editor'), bindings, storage, gamepadButtons);
        documentRef.getElementById('reset_mappings').addEventListener('click', function () {
            try {
                storage.removeItem(STORAGE_KEY);
            }
            catch (ignore) {
                // Storage can be unavailable in private or restricted contexts.
            }
            window.location.reload();
        });

        var trackpad = documentRef.getElementById('virtual_trackpad');
        var lastPoint = {};
        trackpad.addEventListener('pointerdown', function (event) {
            event.preventDefault();
            try {
                trackpad.setPointerCapture(event.pointerId);
            }
            catch (ignore) {
                // Programmatic pointer events do not own an active pointer.
            }
            lastPoint[event.pointerId] = {x: event.clientX, y: event.clientY};
        });
        trackpad.addEventListener('pointermove', function (event) {
            var last = lastPoint[event.pointerId];
            if (!last) {
                return;
            }
            event.preventDefault();
            mouse.move((event.clientX - last.x) * 1.5, (event.clientY - last.y) * 1.5);
            lastPoint[event.pointerId] = {x: event.clientX, y: event.clientY};
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (type) {
            trackpad.addEventListener(type, function (event) { delete lastPoint[event.pointerId]; });
        });
        rootElement.querySelector('[data-mouse-button="0"]').addEventListener('click', function () { mouse.click(0); });
        rootElement.querySelector('[data-mouse-button="2"]').addEventListener('click', function () { mouse.click(2); });

        window.addEventListener('blur', function () { input.releaseAll(); });
        documentRef.addEventListener('visibilitychange', function () {
            if (documentRef.hidden) {
                input.releaseAll();
            }
        });
        return {input: input, mouse: mouse, bindings: bindings};
    }

    return {
        DEFAULT_BINDINGS: DEFAULT_BINDINGS,
        KEY_CATALOG: KEY_CATALOG,
        KEYBOARD_ROWS: KEYBOARD_ROWS,
        InputController: InputController,
        MouseController: MouseController,
        loadBindings: loadBindings,
        saveBindings: saveBindings,
        init: init
    };
}));
