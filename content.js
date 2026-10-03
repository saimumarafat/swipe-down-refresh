(() => {
  if (window.top !== window) return;

  const HOLD_OFFSET = 70;
  const TRIGGER_RAW = 420;
  const BAND_SOFTNESS = 170;
  const GESTURE_GAP = 150;
  const RELEASE_GAP = 70;
  const MIN_SPIN_MS = 380;
  const NET_TIMEOUT_MS = 8000;
  const SPOKES = 8;
  const EASE = 'transform .2s cubic-bezier(.22,.9,.3,1)';

  let raw = 0;
  let lastWheel = 0;
  let valid = false;
  let busy = false;
  let releaseTimer = null;
  let body = document.body;

  const host = document.createElement('div');
  host.style.cssText =
    'all:initial;position:fixed;top:0;left:0;width:100%;height:0;z-index:2147483647;pointer-events:none;';
  const root = host.attachShadow({ mode: 'closed' });

  let lines = '';
  for (let i = 0; i < SPOKES; i++) {
    lines += `<line x1="10" y1="1.2" x2="10" y2="6.6" transform="rotate(${i * (360 / SPOKES)} 10 10)"/>`;
  }

  root.innerHTML = `
    <style>
      .wrap{position:absolute;left:50%;top:0;width:25px;height:25px;margin-left:-12.5px;opacity:0;
        will-change:transform,opacity;color:#8a8a8f}
      @media (prefers-color-scheme:dark){.wrap{color:#a8a8ad}}
      .wrap.anim{transition:transform .2s cubic-bezier(.22,.9,.3,1),opacity .14s ease}
      svg{width:25px;height:25px;display:block;overflow:visible}
      line{stroke:currentColor;stroke-width:2.5;stroke-linecap:round}
      .spin svg{animation:tick 600ms steps(8) infinite}
      @keyframes tick{to{transform:rotate(360deg)}}
    </style>
    <div class="wrap"><svg viewBox="0 0 20 20">${lines}</svg></div>`;

  const wrap = root.querySelector('.wrap');
  const spokeEls = [...root.querySelectorAll('line')];
  (document.documentElement || document).appendChild(host);

  function setSpokes(progress, spinning) {
    const shown = Math.ceil(progress * SPOKES);
    spokeEls.forEach((line, i) => {
      if (spinning) {
        line.style.opacity = String(Math.max(0.2, 1 - ((SPOKES - i) % SPOKES) * 0.115));
      } else {
        line.style.opacity = i < shown ? '0.95' : '0';
      }
    });
  }

  const saved = { transform: '', transition: '', willChange: '' };
  let savedTaken = false;

  function takeSaved() {
    if (savedTaken) return;
    saved.transform = body.style.transform;
    saved.transition = body.style.transition;
    saved.willChange = body.style.willChange;
    savedTaken = true;
  }

  function restoreBody() {
    body.style.transform = saved.transform;
    body.style.transition = saved.transition;
    body.style.willChange = saved.willChange;
    savedTaken = false;
  }

  function apply(y, animate, spinning, progressOverride) {
    takeSaved();
    body.style.willChange = 'transform';
    body.style.transition = animate ? EASE : 'none';
    body.style.transform = `translate3d(0,${y}px,0)`;

    const progress = progressOverride != null ? progressOverride : Math.min(y / HOLD_OFFSET, 1);
    wrap.classList.toggle('anim', animate);
    wrap.classList.toggle('spin', !!spinning);
    wrap.style.opacity = String(spinning ? 1 : Math.min(progress * 1.4, 1));
    const scale = spinning ? 1 : 0.6 + 0.4 * progress;
    wrap.style.transform = `translateY(${y * 0.4 - 12.5}px) scale(${scale})`;
    setSpokes(progress, spinning);
  }

  const band = (r) => HOLD_OFFSET * (1 - Math.exp(-r / BAND_SOFTNESS));

  function canScrollUp(el) {
    while (el && el !== document.documentElement && el !== body) {
      if (el.nodeType === 1) {
        const overflowY = getComputedStyle(el).overflowY;
        const scrollable = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
        if (scrollable && el.scrollHeight > el.clientHeight && el.scrollTop > 0) return true;
      }
      el = el.parentElement;
    }
    const scroller = document.scrollingElement || document.documentElement;
    return scroller.scrollTop > 0 || window.scrollY > 0;
  }

  function commit() {
    clearTimeout(releaseTimer);
    busy = true;
    valid = false;
    apply(HOLD_OFFSET, true, true);

    const fetchFresh = Promise.race([
      fetch(location.href, { cache: 'reload', credentials: 'same-origin' })
        .then((response) => response.arrayBuffer())
        .catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, NET_TIMEOUT_MS)),
    ]);
    const minSpin = new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS));

    Promise.all([fetchFresh, minSpin]).then(() => {
      body.style.transition = EASE;
      body.style.transform = 'translate3d(0,0,0)';
      wrap.classList.add('anim');
      wrap.style.opacity = '0';
      wrap.style.transform = 'translateY(-12.5px) scale(.8)';
      setTimeout(() => location.reload(), 210);
      setTimeout(() => {
        busy = false;
        raw = 0;
        wrap.classList.remove('spin');
        restoreBody();
      }, 5000);
    });
  }

  function release() {
    if (!valid) return;
    valid = false;
    raw = 0;
    apply(0, true, false);
    wrap.style.opacity = '0';
    setTimeout(restoreBody, 300);
  }

  window.addEventListener('wheel', (e) => {
    if (!body) body = document.body;
    if (!body || busy || e.ctrlKey || e.metaKey) return;

    const now = performance.now();
    const isNewGesture = now - lastWheel > GESTURE_GAP;
    lastWheel = now;

    if (isNewGesture) {
      raw = 0;
      valid = !canScrollUp(e.target);
    }
    if (!valid) return;

    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(release, RELEASE_GAP);

    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;

    if (dy < 0) {
      raw += -dy;
    } else if (dy > 0) {
      raw = Math.max(0, raw - dy);
    }

    if (raw >= TRIGGER_RAW) {
      commit();
      return;
    }

    const offset = band(raw);
    if (offset > 0.5) apply(offset, false, false, Math.min(raw / TRIGGER_RAW, 1));
  }, { passive: true });

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      busy = false;
      restoreBody();
      wrap.style.opacity = '0';
    }
  });
})();
