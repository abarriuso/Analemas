export function createCanvasResizer(cv, options = {}) {
  const {
    aspectRatio = 1,
    maxWidth = Infinity,
    maxHeight = Infinity,
    container = cv.parentElement,
    getDpr = () => window.devicePixelRatio || 1,
    onResize = () => {}
  } = options;

  let animationFrame = null;

  function resize() {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      if (!animationFrame) animationFrame = requestAnimationFrame(resize);
      return;
    }

    const dpr = getDpr();
    let cssW = rect.width;
    let cssH = rect.height;

    if (aspectRatio) {
      const targetH = cssW / aspectRatio;
      if (targetH <= cssH) cssH = targetH;
      else cssW = cssH * aspectRatio;
    }

    cssW = Math.min(cssW, maxWidth);
    cssH = Math.min(cssH, maxHeight);

    const bufferW = Math.round(cssW * dpr);
    const bufferH = Math.round(cssH * dpr);

    if (cv.width !== bufferW || cv.height !== bufferH) {
      cv.width = bufferW;
      cv.height = bufferH;
      cv.style.width = cssW + 'px';
      cv.style.height = cssH + 'px';
      const ctx = cv.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
      }
      onResize({ width: cssW, height: cssH, dpr });
    }
  }

  resize();

  const ro = new ResizeObserver(() => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(resize);
  });
  ro.observe(container);

  let winResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(winResizeTimer);
    winResizeTimer = setTimeout(resize, 100);
  }, { passive: true });

  return { resize, disconnect: () => { ro.disconnect(); if (animationFrame) cancelAnimationFrame(animationFrame); } };
}