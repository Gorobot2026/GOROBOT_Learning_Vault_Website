/* GO ROBOT Learning Vault — Trainer Loy Krathong FX
 * กระทงลอยน้ำ + พลุ + โดรนโชว์ข้อความ เป็น overlay โปร่งใสบนหน้า Trainer
 * - ไม่แตะพื้นหลังหน้าเดิม, คลิกทะลุได้ (pointer-events:none)
 * - ทำงานเฉพาะตอน #trainerView แสดงอยู่ (ไม่ต้องแก้ trainer.js)
 * - มีปุ่ม ✨ เปิด/ปิด มุมขวาล่าง (จำค่าไว้ในเครื่อง) */
(function () {
  'use strict';
  var TEXTS = ['GOROBOT', 'น้องฐา'];            // ข้อความโดรน
  var COLORS = ['#5b4ce8', '#ec4899'];          // สีโดรนของแต่ละข้อความ
  var HOLD = 8.5;                               // วินาทีที่ค้างแต่ละข้อความ
  var KEY = 'trainerFxOn';

  var view, main, cv, ctx, btn;
  var W = 0, H = 0, DPR = 1, waterTop = 0;
  var krathongs = [], rockets = [], parts = [], drones = [], targets = [];
  var running = false, raf = 0, last = 0, T = 0, nextLaunch = 1, enabled = true;
  var show = { phase: -1, t: 0 };
  var R = function (a, b) { return a + Math.random() * (b - a); };

  function storedOn() {
    try { var v = localStorage.getItem(KEY); if (v !== null) return v === '1'; } catch (e) {}
    return !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function saveOn(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }

  function build() {
    view = document.getElementById('trainerView');
    main = document.querySelector('.main-area') || document.body;
    if (!view) return false;
    var st = document.createElement('style');
    st.textContent =
      '#trainerFx{position:fixed;top:0;left:0;z-index:30;pointer-events:none;display:none}' +
      '#trainerFxBtn{position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);z-index:31;display:none;' +
      'font:600 13px Prompt,Inter,sans-serif;padding:8px 14px;border-radius:999px;cursor:pointer;' +
      'background:#fff;color:#5b4ce8;border:1px solid #dcd6fe;box-shadow:0 4px 12px rgba(15,23,42,.12)}' +
      '#trainerFxBtn:hover{background:#f2f0ff}#trainerFxBtn.off{color:#94a3b8;border-color:#e8ecf4}';
    document.head.appendChild(st);
    cv = document.createElement('canvas'); cv.id = 'trainerFx'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv); ctx = cv.getContext('2d');
    btn = document.createElement('button'); btn.id = 'trainerFxBtn'; btn.type = 'button';
    btn.onclick = function () { enabled = !enabled; saveOn(enabled); sync(); };
    document.body.appendChild(btn);
    return true;
  }

  function isTrainerVisible() { return view && !view.hidden && view.offsetParent !== null; }

  function sync() {
    var vis = isTrainerVisible();
    btn.style.display = vis ? 'block' : 'none';
    btn.textContent = enabled ? '✨ เอฟเฟกต์ลอยกระทง: เปิด' : '✨ เอฟเฟกต์ลอยกระทง: ปิด';
    btn.className = enabled ? '' : 'off';
    if (vis && enabled) start(); else stop();
  }

  function resize() {
    var rect = main.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(rect.width)); H = window.innerHeight;
    cv.style.left = rect.left + 'px'; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    waterTop = H * 0.78;
    krathongs = [];
    var n = Math.max(4, Math.round(W / 230));
    for (var i = 0; i < n; i++) {
      var d = R(0, 1);
      krathongs.push({ x: R(-100, W), y: waterTop + 26 + d * (H - waterTop - 60), s: .5 + d * .6, v: 7 + d * 13, ph: R(0, 6.28), hue: i % 3 });
    }
    layoutText();
  }

  /* ---------- จุดของโดรนจากข้อความ ---------- */
  function samplePoints(txt, step) {
    var o = document.createElement('canvas'); o.width = W; o.height = H;
    var c = o.getContext('2d'), fs = 200;
    c.font = '800 ' + fs + 'px Prompt, sans-serif';
    var tw = c.measureText(txt).width;
    fs = Math.min(fs * Math.min(W * .8, 900) / tw, H * .24);
    c.font = '800 ' + fs + 'px Prompt, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
    c.fillText(txt, W / 2, H * .36);
    var d = c.getImageData(0, 0, W, H).data, pts = [];
    for (var y = 0; y < H; y += step) for (var x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 140) pts.push({ x: x, y: y });
    return pts;
  }
  function layoutText() {
    var step = Math.max(5, Math.round(Math.min(W, H) / 70)), sets, mx;
    do {
      sets = TEXTS.map(function (t) { return samplePoints(t, step); });
      mx = Math.max.apply(null, sets.map(function (s) { return s.length; }));
      step++;
    } while (mx > 400);
    sets.forEach(function (s) { s.sort(function (a, b) { return a.x - b.x || a.y - b.y; }); });
    targets = sets;
    while (drones.length < mx) drones.push({ x: R(0, W), y: H + 20, vx: 0, vy: 0, a: 0, ta: 0, tx: W / 2, ty: H, p: R(0, 6.28), col: COLORS[0] });
    drones.length = mx;
    if (show.phase >= 0 && show.phase < TEXTS.length) assign(show.phase);
  }
  function assign(k) {
    var pts = targets[k]; if (!pts || !pts.length) return;
    drones.forEach(function (d, i) {
      var p = pts[i % pts.length]; d.tx = p.x; d.ty = p.y; d.ta = i < pts.length ? 1 : 0; d.col = COLORS[k % COLORS.length];
    });
  }

  /* ---------- ลำดับโชว์ ---------- */
  function startShow() {
    show.phase = 0; show.t = 0;
    drones.forEach(function (d) { d.x = R(0, W); d.y = H + R(10, 60); d.vx = d.vy = 0; d.a = 0; });
    assign(0);
  }
  function updateShow(dt) {
    show.t += dt;
    if (show.phase === -1) { if (show.t > 1.5) startShow(); return; }
    if (show.phase < TEXTS.length) {
      if (show.t > HOLD) {
        show.phase++; show.t = 0;
        if (show.phase < TEXTS.length) assign(show.phase);
        else drones.forEach(function (d) { d.tx = d.x + R(-80, 80); d.ty = -40; d.ta = 0; });
      }
    } else if (show.phase === TEXTS.length) {
      if (Math.random() < dt * 6) launch();
      if (show.t > 5) { show.phase = -2; show.t = 0; }
    } else if (show.phase === -2 && show.t > 8) { show.phase = -1; show.t = 0; }
  }

  /* ---------- พลุ ---------- */
  function launch() { rockets.push({ x: R(W * .08, W * .92), y: waterTop, ty: R(H * .1, waterTop * .55), vy: -R(380, 520), h: R(0, 360) }); }
  function burst(x, y, h) {
    var n = Math.round(R(70, 110)), ring = Math.random() < .35;
    for (var i = 0; i < n; i++) {
      var a = i / n * 6.283, sp = ring ? 190 : R(40, 230);
      parts.push({ x: x, y: y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: R(1.3, 2.2), age: 0, h: h + R(-18, 18) });
    }
  }
  function updateFireworks(dt) {
    nextLaunch -= dt; if (nextLaunch <= 0) { launch(); nextLaunch = R(1.4, 3); }
    for (var i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i]; r.y += r.vy * dt; r.vy *= .992;
      if (r.y <= r.ty) { burst(r.x, r.y, r.h); rockets.splice(i, 1); }
    }
    for (var j = parts.length - 1; j >= 0; j--) {
      var p = parts[j]; p.age += dt; if (p.age > p.life) { parts.splice(j, 1); continue; }
      p.px = p.x; p.py = p.y; p.vx *= .985; p.vy = p.vy * .985 + 95 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  function updateDrones(dt) {
    var damp = Math.pow(.02, dt);
    drones.forEach(function (d) {
      d.vx += (d.tx - d.x) * 3.2 * dt; d.vy += (d.ty - d.y) * 3.2 * dt;
      d.vx *= damp; d.vy *= damp; d.x += d.vx * dt; d.y += d.vy * dt;
      d.a += (d.ta - d.a) * Math.min(1, dt * 3);
    });
  }

  /* ---------- วาด (ปรับสีให้เห็นชัดบนพื้นหลังสว่าง) ---------- */
  function drawFx() {
    ctx.lineCap = 'round';
    rockets.forEach(function (r) {
      ctx.strokeStyle = 'rgba(245,158,11,.95)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y + 16); ctx.stroke();
    });
    parts.forEach(function (p) {
      var f = 1 - p.age / p.life;
      ctx.strokeStyle = 'hsla(' + p.h + ',92%,52%,' + f + ')'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
    });
    var now = performance.now();
    drones.forEach(function (d) {
      if (d.a < .02) return;
      var tw = .8 + .2 * Math.sin(now / 180 + d.p);
      ctx.globalAlpha = d.a * tw;
      var g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 11);
      g.addColorStop(0, 'rgba(255,196,80,.55)'); g.addColorStop(1, 'rgba(255,196,80,0)');
      ctx.fillStyle = g; ctx.fillRect(d.x - 11, d.y - 11, 22, 22);
      ctx.fillStyle = d.col; ctx.beginPath(); ctx.arc(d.x, d.y, 3.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d.x, d.y, 1.2, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    });
  }
  function drawWater(t) {
    var g = ctx.createLinearGradient(0, waterTop - 30, 0, H);
    g.addColorStop(0, 'rgba(60,90,200,0)'); g.addColorStop(.25, 'rgba(60,90,200,.10)'); g.addColorStop(1, 'rgba(40,60,160,.26)');
    ctx.fillStyle = g; ctx.fillRect(0, waterTop - 30, W, H - waterTop + 30);
    ctx.lineWidth = 1;
    for (var i = 0; i < 20; i++) {
      var f = i / 20, y = waterTop + 6 + f * f * (H - waterTop - 6);
      ctx.strokeStyle = 'rgba(60,90,200,' + (.05 + f * .14) + ')'; ctx.beginPath();
      for (var x = 0; x <= W; x += 14) {
        var yy = y + Math.sin(x * .012 + t * (.6 + f) + i) * (1.5 + f * 4);
        x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
      }
      ctx.stroke();
    }
  }
  function drawKrathong(k, t) {
    var s = k.s, y = k.y + Math.sin(t * 1.1 + k.ph) * 2.5 * s, tilt = Math.sin(t * .9 + k.ph) * .04;
    ctx.save(); ctx.translate(k.x, y); ctx.rotate(tilt); ctx.scale(s, s);
    var rg = ctx.createRadialGradient(0, 16, 0, 0, 16, 70);
    rg.addColorStop(0, 'rgba(255,150,40,.30)'); rg.addColorStop(1, 'rgba(255,150,40,0)');
    ctx.save(); ctx.scale(1, .35); ctx.fillStyle = rg; ctx.fillRect(-70, -50, 140, 140); ctx.restore();
    var lg = ctx.createLinearGradient(0, -8, 0, 14); lg.addColorStop(0, '#58b04a'); lg.addColorStop(1, '#1d5a2c');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(0, 2, 50, 11, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#a5e08a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, 48, 9, 0, Math.PI, 6.283); ctx.stroke();
    var pc = [['#ffb3d4', '#ff5fa2'], ['#fff', '#ffc2e0'], ['#ffd86b', '#ff9d2e']][k.hue];
    for (var row = 0; row < 2; row++) {
      var n = row ? 9 : 7, sc = row ? .8 : 1;
      for (var i = 0; i < n; i++) {
        var u = (i / (n - 1)) * 2 - 1;
        ctx.save(); ctx.translate(u * 36 * sc, -4 - row * 4); ctx.rotate(u * .55);
        var pg = ctx.createLinearGradient(0, 0, 0, -24 * sc); pg.addColorStop(0, pc[row ? 0 : 1]); pg.addColorStop(1, pc[row ? 1 : 0]);
        ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-8 * sc, -12 * sc, 0, -26 * sc); ctx.quadraticCurveTo(8 * sc, -12 * sc, 0, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(190,70,130,.35)'; ctx.lineWidth = .8; ctx.stroke();
        ctx.restore();
      }
    }
    ctx.fillStyle = '#ffcc33';
    for (var j = -3; j <= 3; j++) { ctx.beginPath(); ctx.arc(j * 12, 3, 5, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = '#fff6df'; ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1;
    ctx.fillRect(-2.5, -34, 5, 26); ctx.strokeRect(-2.5, -34, 5, 26);
    var fl = 1 + Math.sin(t * 14 + k.ph) * .12 + Math.sin(t * 23 + k.ph * 2) * .08;
    var fg = ctx.createRadialGradient(0, -42, 0, 0, -42, 46);
    fg.addColorStop(0, 'rgba(255,170,50,.5)'); fg.addColorStop(1, 'rgba(255,170,50,0)');
    ctx.fillStyle = fg; ctx.fillRect(-46, -88, 92, 92);
    ctx.fillStyle = '#ffa90f'; ctx.beginPath(); ctx.ellipse(0, -42, 4 * fl, 9 * fl, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff7b0'; ctx.beginPath(); ctx.ellipse(0, -40, 2, 5 * fl, 0, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
    updateShow(dt); updateFireworks(dt); updateDrones(dt);
    krathongs.forEach(function (k) { k.x += k.v * dt; if (k.x > W + 80) k.x = -80; });
    ctx.clearRect(0, 0, W, H);
    drawFx();
    drawWater(T);
    ctx.save(); ctx.beginPath(); ctx.rect(0, waterTop, W, H - waterTop); ctx.clip();
    ctx.globalAlpha = .18; ctx.translate(0, waterTop * 2); ctx.scale(1, -1); drawFx(); ctx.restore(); ctx.globalAlpha = 1;
    krathongs.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (k) { drawKrathong(k, T); });
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    cv.style.display = 'block'; running = true;
    var go = function () { resize(); show.phase = -1; show.t = 0; rockets = []; parts = []; last = performance.now(); raf = requestAnimationFrame(frame); };
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('800 100px Prompt', 'GOROBOT'), document.fonts.load('800 100px Prompt', 'น้องฐา')]).catch(function () {}).then(function () { if (running) go(); });
    } else go();
  }
  function stop() {
    running = false; cancelAnimationFrame(raf);
    if (cv) { cv.style.display = 'none'; }
  }

  function init() {
    if (!build()) return;
    enabled = storedOn();
    new MutationObserver(sync).observe(view, { attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
    window.addEventListener('resize', function () { if (running) resize(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else sync(); });
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
