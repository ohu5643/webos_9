export default class WindowManager {
    constructor() {
        this.zIndex = 100;
    }

    createWindow(title, content) {
        const windowEl = document.createElement('div');

        windowEl.className = 'window';

        windowEl.innerHTML = `
            <div class="window-header">
                <span>${title}</span>

<div class="window-buttons">

    <button class="min-btn">
        ─
    </button>

    <button class="max-btn">
        □
    </button>

    <button class="close-btn">
        ✕
    </button>

</div>
            </div>

            <div class="window-content">
                ${content}
            </div>
        `;

        windowEl.style.left = '100px';
        windowEl.style.top = '100px';
        windowEl.style.zIndex = this.zIndex++;

        document.getElementById('desktop').appendChild(windowEl);

        this.makeDraggable(windowEl);

        windowEl.addEventListener('mousedown', () => {
            windowEl.style.zIndex = this.zIndex++;
        });

        windowEl
    .querySelector('.close-btn')
    .addEventListener('click', () => {
        windowEl.remove();
    });

windowEl
    .querySelector('.min-btn')
    .addEventListener('click', () => {

        if (
            windowEl.dataset.maximized ===
            'true'
        ) {
            return;
        }

        const content =
            windowEl.querySelector(
                '.window-content'
            );

        if (
            content.style.display ===
            'none'
        ) {

            content.style.display =
                '';

            windowEl.style.height =
                windowEl.dataset.oldMinHeight
                || '400px';

        }

        else {

            windowEl.dataset.oldMinHeight =
                getComputedStyle(
                    windowEl
                ).height;

            content.style.display =
                'none';

            windowEl.style.height =
                '40px';

        }

    });

windowEl
    .querySelector('.max-btn')
    .addEventListener('click', () => {

        if (
            windowEl.dataset.maximized ===
            'true'
        ) {

            windowEl.style.left =
                windowEl.dataset.oldLeft;

            windowEl.style.top =
                windowEl.dataset.oldTop;

            windowEl.style.width =
                windowEl.dataset.oldWidth;

            windowEl.style.height =
                windowEl.dataset.oldHeight;

            windowEl.dataset.maximized =
                'false';

        }

        else {

            windowEl.dataset.oldLeft =
                windowEl.style.left;

            windowEl.dataset.oldTop =
                windowEl.style.top;

            windowEl.dataset.oldWidth =
    getComputedStyle(windowEl)
    .width;

windowEl.dataset.oldHeight =
    getComputedStyle(windowEl)
    .height;    

            windowEl.style.left =
                '0';

            windowEl.style.top =
                '0';

            windowEl.style.width =
                '100%';

            windowEl.style.height =
                'calc(100% - 48px)';

            windowEl.dataset.maximized =
                'true';

        }

    });

        return windowEl;
    }

    makeDraggable(windowEl) {
        const header = windowEl.querySelector('.window-header');

        let dragging = false;

        let offsetX = 0;
        let offsetY = 0;

        header.addEventListener('mousedown', (e) => {
            dragging = true;

            offsetX = e.clientX - windowEl.offsetLeft;
            offsetY = e.clientY - windowEl.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {

    if (!dragging) return;

    if (
        windowEl.dataset.maximized ===
        'true'
    ) return;

            windowEl.style.left =
                e.clientX - offsetX + 'px';

            windowEl.style.top =
                e.clientY - offsetY + 'px';
        });

        document.addEventListener('mouseup', () => {
            dragging = false;
        });
    }
}