function htmlFullscreen() {
    var screenContainer = document.getElementById('screen_container');
    var exitButton = document.getElementById('exit_button');
    if (screenContainer.classList.contains('html-fullscreen')) {
        screenContainer.classList.remove('html-fullscreen');
        exitButton.classList.remove('exit_fullscreen_show');
    }
    else {
        screenContainer.classList.add('html-fullscreen');
        exitButton.classList.add('exit_fullscreen_show');
    }
}

function gameFullscreen() {
    var screenContainer = document.getElementById('screen_container');
    var request = screenContainer.requestFullscreen || screenContainer.webkitRequestFullscreen;
    if (request) {
        try {
            var result = request.call(screenContainer);
            if (result && typeof result.then === 'function') {
                result.then(function () {
                    document.getElementById('exit_button').classList.add('exit_fullscreen_show');
                }, function () {
                    htmlFullscreen();
                });
            }
            else {
                document.getElementById('exit_button').classList.add('exit_fullscreen_show');
            }
        }
        catch (error) {
            htmlFullscreen();
        }
    }
    else {
        htmlFullscreen();
    }
}

function exitGameFullscreen() {
    var screenContainer = document.getElementById('screen_container');
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        screenContainer.classList.remove('html-fullscreen');
        exit.call(document);
    }
    else if (screenContainer.classList.contains('html-fullscreen')) {
        htmlFullscreen();
    }
}

function syncFullscreenExitButton() {
    var hasNativeFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    var hasWebFullscreen = document.getElementById('screen_container').classList.contains('html-fullscreen');
    if (!hasNativeFullscreen && !hasWebFullscreen) {
        document.getElementById('exit_button').classList.remove('exit_fullscreen_show');
    }
}

document.addEventListener('fullscreenchange', syncFullscreenExitButton);
document.addEventListener('webkitfullscreenchange', syncFullscreenExitButton);

if (window.DosGameControls) {
    window.dosGameControls = window.DosGameControls.init(document);
}