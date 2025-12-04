<script lang="ts">
    export let horizontal = false;
    export let left = false;
    export let top = false;
    export let size = 300;
    export let minSize = 150;
    export let maxSize = 500;

    $: sign = left || top ? -1 : 1;

    let prevX = 0, prevY = 0;
    function onMouseDown(e: MouseEvent) {
        e.preventDefault();
        prevX = e.screenX;
        prevY = e.screenY;
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }

    function onMouseMove(e: MouseEvent) {
        e.preventDefault();

        let dx = e.screenX - prevX;
        let dy = e.screenY - prevY;
        prevX = e.screenX;
        prevY = e.screenY;

        size += (horizontal ? dy : dx) * sign;
        if (size < minSize) {
            size = minSize;
        }
        else if (size > maxSize) {
            size = maxSize;
        }
    }

    function onMouseUp(e: MouseEvent) {
        e.preventDefault();
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
    }
    function onKeyDown(e: KeyboardEvent) {
        if (horizontal) {
            if (e.key === 'ArrowUp') { size = Math.max(minSize, size - 10); }
            if (e.key === 'ArrowDown') { size = Math.min(maxSize, size + 10); }
        } else {
            if (e.key === 'ArrowLeft') { size = Math.max(minSize, size - 10); }
            if (e.key === 'ArrowRight') { size = Math.min(maxSize, size + 10); }
        }
    }
</script>

<div class="sash" class:horizontal class:left class:top role="slider" aria-label="Resize panel" aria-orientation={horizontal ? 'horizontal' : 'vertical'} aria-valuemin={minSize} aria-valuemax={maxSize} aria-valuenow={size} tabindex="0" on:mousedown={onMouseDown} on:mouseup={onMouseUp} on:keydown={onKeyDown}>
</div>

<style>
    .sash {
        position: absolute;
        background-color: transparent;
        transition: background-color 0.1s 0.1s;

        cursor: ew-resize;
        width: 6px;
        height: 100%;
        top: 0;
        right: -3px;
        z-index: 9999;
    }

    .sash.left {
        left: -3px;
        right: unset;
    }

    .sash.horizontal {
        cursor: ns-resize;
        height: 6px;
        width: 100%;
        top: unset;
        right: unset;
        left: 0;
        bottom: -3px;
    }

    .sash.horizontal.top {
        bottom: unset;
        top: -3px;
    }

    .sash:hover {
        background-color: var(--vscode-sash-hoverBorder);
    }
</style>