const positions = new Map();

// A visible slider also works on systems that hide native scrollbars.
export function renderTableScrollControls(id) {
  return `<div class="table-scroll-controls" data-table-controls="${id}" hidden>
    <button type="button" class="secondary-button compact" data-table-direction="-1" aria-controls="${id}" aria-label="Desplazar tabla a la izquierda">←</button>
    <label class="table-scroll-slider"><span>Desplazar tabla</span><input type="range" min="0" max="0" value="0" step="1" aria-label="Desplazamiento horizontal de la tabla" aria-controls="${id}" /></label>
    <button type="button" class="secondary-button compact" data-table-direction="1" aria-controls="${id}" aria-label="Desplazar tabla a la derecha">→</button>
  </div>`;
}
export function bindTableScrollControls(root = document) {
  const observers = [];
  root.querySelectorAll('[data-table-controls]').forEach(controls => {
    const viewport = root.getElementById(controls.dataset.tableControls);
    if (!viewport) return;
    const slider = controls.querySelector('input');
    const buttons = [...controls.querySelectorAll('button')];
    const sync = () => {
      const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      controls.hidden = max < 2;
      slider.max = String(max);
      slider.value = String(Math.round(viewport.scrollLeft));
      slider.setAttribute('aria-valuetext', `${max ? Math.round(viewport.scrollLeft / max * 100) : 0}%`);
      buttons[0].disabled = viewport.scrollLeft < 1;
      buttons[1].disabled = viewport.scrollLeft >= max - 1;
      positions.set(viewport.id, viewport.scrollLeft);
    };
    viewport.scrollLeft = positions.get(viewport.id) || 0;
    viewport.addEventListener('scroll', sync, { passive: true });
    slider.addEventListener('input', () => { viewport.scrollLeft = Number(slider.value); sync(); });
    buttons.forEach(button => button.addEventListener('click', () => {
      viewport.scrollLeft += Number(button.dataset.tableDirection) * Math.max(160, viewport.clientWidth * .7);
      sync();
    }));
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(sync);
      observer.observe(viewport);
      if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
      observers.push(observer);
    }
    sync();
  });
  return () => observers.forEach(observer => observer.disconnect());
}
