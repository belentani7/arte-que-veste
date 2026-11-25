/**
 * ═══════════════════════════════════════════════════════════════
 * ARTE QUE VESTE — Shader WebGL Xilogravura Nordestina
 * ═══════════════════════════════════════════════════════════════
 * Shader GLSL propio inspirado en tallado de xilogravura sobre
 * madera nordestina: surcos de gubia, vetas cálidas de terracota,
 * tinta de carbón y destellos de turquesa.
 *
 * Presupuesto GPU 60 fps:
 *   - DPR limitado a 1.75
 *   - Pausa automática fuera de viewport (IntersectionObserver)
 *   - Pausa automática en pestaña oculta (visibilitychange)
 *   - Frame estático único con prefers-reduced-motion: reduce
 *   - Control de pausa accesible (WCAG 2.2.2)
 *   - Manejo de webglcontextlost / webglcontextrestored
 *   - Degradación elegante a Canvas 2D / CSS puro sin WebGL
 */
(function () {
  'use strict';

  var DPR_CAP = 1.75;

  var VERTEX_SRC = [
    'attribute vec2 a_pos;',
    'void main() {',
    '  gl_Position = vec4(a_pos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAGMENT_SRC = [
    'precision mediump float;',
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform vec2 u_mouse;',
    '',
    'float hash21(vec2 p) {',
    '  p = fract(p * vec2(234.34, 435.345));',
    '  p += dot(p, p + 34.23);',
    '  return fract(p.x * p.y);',
    '}',
    '',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash21(i);',
    '  float b = hash21(i + vec2(1.0, 0.0));',
    '  float c = hash21(i + vec2(0.0, 1.0));',
    '  float d = hash21(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    '',
    'float fbm(vec2 p) {',
    '  float v = 0.0;',
    '  float amp = 0.5;',
    '  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);',
    '  for (int i = 0; i < 4; i++) {',
    '    v += amp * noise(p);',
    '    p = rot * p * 2.02 + vec2(13.1, 7.7);',
    '    amp *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / u_res.xy;',
    '  vec2 p = (gl_FragCoord.xy - 0.5 * u_res.xy) / max(1.0, min(u_res.x, u_res.y));',
    '  vec2 parallax = (u_mouse - 0.5) * 0.14;',
    '  vec2 q = p + parallax;',
    '  float t = u_time * 0.18;',
    '',
    '  // Vetas y surcos de xilogravura (relieve tallado)',
    '  float warp = fbm(vec2(q.x * 1.9 + t * 0.35, q.y * 2.6 - t * 0.22));',
    '  float field = fbm(q * 2.4 + vec2(warp * 1.4, -warp * 0.9) + t * 0.12);',
    '  float rings = abs(sin((field * 10.5 + q.y * 2.2) * 3.14159));',
    '  float groove = smoothstep(0.14, 0.42, rings);',
    '',
    '  // Trama sutil de talla manual',
    '  float hatch = smoothstep(0.35, 0.85, sin((q.x * 38.0 + field * 12.0)) * 0.5 + 0.5);',
    '',
    '  vec3 ink = vec3(0.085, 0.082, 0.076);',
    '  vec3 terracotta = vec3(0.768, 0.372, 0.235);',
    '  vec3 ochre = vec3(0.831, 0.604, 0.227);',
    '  vec3 turquoise = vec3(0.251, 0.878, 0.816);',
    '',
    '  vec3 ridgeCol = mix(terracotta, ochre, smoothstep(0.28, 0.72, warp));',
    '  float turqMask = smoothstep(0.62, 0.86, field) * (1.0 - groove * 0.55);',
    '  vec3 col = mix(ink, ridgeCol * 0.52, (1.0 - groove) * (0.72 + 0.28 * hatch));',
    '  col = mix(col, turquoise * 0.78, turqMask * 0.52);',
    '',
    '  float vignette = smoothstep(1.35, 0.2, length(p * vec2(0.85, 1.0)));',
    '  col *= (0.58 + 0.42 * vignette);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function drawCanvas2DFallback(canvas) {
    var ctx = null;
    try { ctx = canvas.getContext('2d'); } catch { return false; }
    if (!ctx) return false;
    var w = Math.max(1, canvas.clientWidth || 640);
    var h = Math.max(1, canvas.clientHeight || 360);
    canvas.width = w;
    canvas.height = h;

    var grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#141311');
    grad.addColorStop(0.55, '#2b1d17');
    grad.addColorStop(1, '#102421');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1.25;
    for (var i = 0; i < 18; i += 1) {
      ctx.beginPath();
      var baseY = (h / 18) * i;
      ctx.strokeStyle = i % 5 === 0 ? 'rgba(64,224,208,0.22)' : 'rgba(196,95,60,0.20)';
      for (var x = 0; x <= w; x += 24) {
        var y = baseY + Math.sin(x * 0.012 + i * 0.7) * 18 + Math.cos(x * 0.006 - i) * 10;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    return true;
  }

  function compileShader(gl, type, source) {
    var sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, source);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function initXilogravuraShader(canvasOrId, options) {
    var opts = options || {};
    var canvas = typeof canvasOrId === 'string' ? document.getElementById(canvasOrId) : canvasOrId;
    if (!canvas) return null;

    var prefersReduced = Boolean(
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
    var gl = null;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' })
        || canvas.getContext('experimental-webgl');
    } catch {
      gl = null;
    }

    if (!gl) {
      drawCanvas2DFallback(canvas);
      return {
        mode: 'fallback-2d',
        setPaused: function () {},
        destroy: function () {}
      };
    }

    var state = {
      program: null,
      buffer: null,
      uRes: null,
      uTime: null,
      uMouse: null,
      raf: null,
      destroyed: false,
      contextLost: false,
      inView: true,
      tabVisible: typeof document.hidden === 'boolean' ? !document.hidden : true,
      userPaused: prefersReduced,
      elapsed: 1.8,
      lastStamp: 0,
      mouse: { x: 0.5, y: 0.5 },
      targetMouse: { x: 0.5, y: 0.5 }
    };

    function setupGL() {
      var vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
      var fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
      if (!vs || !fs) return false;
      var program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return false;
      }

      gl.useProgram(program);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(program, 'a_pos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      state.program = program;
      state.buffer = buf;
      state.uRes = gl.getUniformLocation(program, 'u_res');
      state.uTime = gl.getUniformLocation(program, 'u_time');
      state.uMouse = gl.getUniformLocation(program, 'u_mouse');
      return true;
    }

    function resize() {
      if (state.contextLost || !state.program) return;
      var dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      var w = Math.max(1, Math.floor((canvas.clientWidth || window.innerWidth || 640) * dpr));
      var h = Math.max(1, Math.floor((canvas.clientHeight || 420) * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(state.uRes, canvas.width, canvas.height);
    }

    function drawFrame() {
      if (state.contextLost || !state.program) return;
      gl.uniform1f(state.uTime, state.elapsed);
      gl.uniform2f(state.uMouse, state.mouse.x, state.mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function shouldAnimate() {
      return !state.destroyed && !state.contextLost && state.inView && state.tabVisible && !state.userPaused;
    }

    function stopLoop() {
      if (state.raf !== null) {
        cancelAnimationFrame(state.raf);
        state.raf = null;
      }
      state.lastStamp = 0;
    }

    function tick(stamp) {
      if (!shouldAnimate()) {
        stopLoop();
        return;
      }
      if (state.lastStamp) {
        var dt = Math.min(0.05, Math.max(0, (stamp - state.lastStamp) * 0.001));
        state.elapsed += dt;
      }
      state.lastStamp = stamp;
      state.mouse.x += (state.targetMouse.x - state.mouse.x) * 0.06;
      state.mouse.y += (state.targetMouse.y - state.mouse.y) * 0.06;
      drawFrame();
      state.raf = requestAnimationFrame(tick);
    }

    function syncLoop() {
      if (shouldAnimate()) {
        if (state.raf === null) state.raf = requestAnimationFrame(tick);
      } else {
        stopLoop();
      }
    }

    if (!setupGL()) {
      drawCanvas2DFallback(canvas);
      return { mode: 'fallback-2d', setPaused: function () {}, destroy: function () {} };
    }

    resize();
    drawFrame();

    function onMouseMove(e) {
      if (!shouldAnimate()) return;
      var w = window.innerWidth || 1;
      var h = window.innerHeight || 1;
      state.targetMouse.x = e.clientX / w;
      state.targetMouse.y = 1.0 - e.clientY / h;
    }

    function onVisibilityChange() {
      state.tabVisible = !document.hidden;
      syncLoop();
    }

    function onContextLost(e) {
      e.preventDefault();
      state.contextLost = true;
      stopLoop();
    }

    function onContextRestored() {
      state.contextLost = false;
      if (setupGL()) {
        resize();
        drawFrame();
        syncLoop();
      }
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    canvas.addEventListener('webglcontextrestored', onContextRestored, false);

    var observer = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          state.inView = entry.isIntersecting;
          syncLoop();
        });
      }, { threshold: 0.05 });
      observer.observe(canvas);
    }

    var toggleBtn = opts.toggleButton
      ? (typeof opts.toggleButton === 'string' ? document.querySelector(opts.toggleButton) : opts.toggleButton)
      : null;

    function updateToggleUi() {
      if (!toggleBtn) return;
      toggleBtn.setAttribute('aria-pressed', String(state.userPaused));
      toggleBtn.textContent = state.userPaused ? 'Ativar fundo' : 'Pausar fundo';
    }

    if (toggleBtn) {
      updateToggleUi();
      toggleBtn.addEventListener('click', function () {
        state.userPaused = !state.userPaused;
        updateToggleUi();
        syncLoop();
      });
    }

    syncLoop();

    return {
      mode: prefersReduced ? 'webgl-static' : 'webgl',
      isPaused: function () { return !shouldAnimate(); },
      setPaused: function (paused) {
        state.userPaused = Boolean(paused);
        updateToggleUi();
        syncLoop();
      },
      destroy: function () {
        state.destroyed = true;
        stopLoop();
        if (observer) observer.disconnect();
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.removeEventListener('webglcontextrestored', onContextRestored);
        if (state.program) gl.deleteProgram(state.program);
        if (state.buffer) gl.deleteBuffer(state.buffer);
      }
    };
  }

  window.initXilogravuraShader = initXilogravuraShader;
})();
