/**
 * Tank Renderer — Chrome Dino Pixel Art Edition
 *
 * Everything inside the bowl is drawn as crisp pixel rectangles.
 * No curves, no gradients on subjects. shape-rendering: crispEdges.
 * The bowl itself stays smooth (it's the container, not an illustration).
 *
 * Pixel unit (PX) = 3. Fish/decorations snap to this grid.
 */

const TankRenderer = (() => {
  const W = 300;
  const H = 340;
  const PX = 3; // base pixel unit

  // ── Palettes (decoration colours, time-of-day) ────────────
  const PALETTES = {
    dawn:   { sand: "#d8c8a0", plant: "#5a9a6a", rock: "#7a8a8a", coral: "#d48a7a" },
    day:    { sand: "#c8b888", plant: "#4a9a5a", rock: "#6a7a7a", coral: "#e08878" },
    sunset: { sand: "#c0a870", plant: "#4a8a5a", rock: "#5a6a6a", coral: "#c87a6a" },
    night:  { sand: "#807060", plant: "#3a6a4a", rock: "#3a4a4a", coral: "#7a5050" },
  };

  // ── Fish display sizes (px in the 300×340 SVG viewport) ──
  const FISH_SIZE = { small: 34, medium: 46, large: 58, huge: 76 };

  // ── Pixel rect helper ─────────────────────────────────────

  function pxRect(x, y, w, h, fill, opacity) {
    const r = svgEl("rect");
    setAttrs(r, {
      x: Math.round(x), y: Math.round(y),
      width: Math.round(w), height: Math.round(h),
      fill,
      "shape-rendering": "crispEdges",
    });
    if (opacity !== undefined) r.setAttribute("opacity", opacity);
    return r;
  }

  // ── Decorations ───────────────────────────────────────────

  function createSandbed(palette) {
    const g = svgEl("g");
    // Main sand band
    g.appendChild(pxRect(0, H - 28, W, 28, palette.sand, 0.95));
    // Pixel bumps on surface
    [18, 48, 80, 115, 155, 195, 228, 262, 290].forEach(bx => {
      g.appendChild(pxRect(bx, H - 30, PX * 2, PX, darken(palette.sand, 0.12), 0.5));
    });
    return g;
  }

  function createPebbles(palette) {
    const g = svgEl("g");
    [[60, H-28], [110, H-29], [170, H-28], [235, H-29], [280, H-28]].forEach(([x, y]) => {
      g.appendChild(pxRect(x, y, PX*3, PX*2, darken(palette.sand, 0.18), 0.5));
      g.appendChild(pxRect(x + PX, y - PX, PX*3, PX, darken(palette.sand, 0.18), 0.4));
    });
    return g;
  }

  function createPlant(x, palette, tall) {
    const g = svgEl("g");
    const baseY = H - 28;
    const segs = tall ? 10 : 6;
    for (let i = 0; i < segs; i++) {
      const side = i % 2 === 0 ? -PX * 1 : PX * 1;
      const segY = baseY - (i + 1) * PX * 3;
      // Stem pixel
      g.appendChild(pxRect(x - PX, segY, PX * 2, PX * 3, palette.plant, 0.8));
      // Leaf pixel on alternating sides
      g.appendChild(pxRect(x + side - PX, segY + PX, PX * 3, PX * 2, palette.plant, 0.65));
    }
    return g;
  }

  function createCoral(x, palette, variant) {
    const g = svgEl("g");
    const baseY = H - 28;
    const c = palette.coral;

    if (variant === "round") {
      // Stacked rounded pixel tower
      [[4,3],[5,2],[6,2],[5,2],[4,2],[3,2],[2,2]].forEach(([w, h], i) => {
        g.appendChild(pxRect(x - w * PX / 2, baseY - (i + 1) * PX * 2, w * PX, h * PX, c, 0.8));
      });
    } else {
      // Fan: central trunk + branching rows
      g.appendChild(pxRect(x - PX, baseY - PX*8, PX*2, PX*8, c, 0.8));
      // Left branch
      g.appendChild(pxRect(x - PX*6, baseY - PX*14, PX*6, PX*2, c, 0.65));
      g.appendChild(pxRect(x - PX*5, baseY - PX*16, PX*2, PX*2, c, 0.6));
      // Center top
      g.appendChild(pxRect(x - PX, baseY - PX*16, PX*2, PX*4, c, 0.65));
      g.appendChild(pxRect(x - PX, baseY - PX*18, PX*2, PX*2, c, 0.55));
      // Right branch
      g.appendChild(pxRect(x, baseY - PX*14, PX*6, PX*2, c, 0.65));
      g.appendChild(pxRect(x + PX*3, baseY - PX*16, PX*2, PX*2, c, 0.6));
    }
    return g;
  }

  function createRock(x, palette) {
    const g = svgEl("g");
    const baseY = H - 28;
    // Pixel staircase rock shape
    [
      [x - PX*4, baseY - PX*2, PX*9, PX*2],
      [x - PX*5, baseY - PX*4, PX*11, PX*2],
      [x - PX*4, baseY - PX*6, PX*8, PX*2],
      [x - PX*2, baseY - PX*8, PX*5, PX*2],
    ].forEach(([rx, ry, rw, rh]) => {
      g.appendChild(pxRect(rx, ry, rw, rh, palette.rock, 0.6));
    });
    return g;
  }

  function createAnemone(x, palette) {
    const g = svgEl("g");
    const baseY = H - 28;
    const c = palette.coral;
    // Base
    g.appendChild(pxRect(x - PX, baseY - PX*4, PX*2, PX*4, c, 0.7));
    // Tentacle tops — pixel bumps spread out
    const tips = [-PX*5, -PX*3, -PX, PX, PX*3, PX*5];
    tips.forEach(dx => {
      const h = Math.abs(dx) < PX*2 ? PX*12 : PX*8;
      g.appendChild(pxRect(x + dx - PX, baseY - PX*4 - h, PX*2, h, c, 0.55));
      g.appendChild(pxRect(x + dx - PX, baseY - PX*4 - h - PX, PX*2, PX, c, 0.4));
    });
    return g;
  }

  function createShell(x) {
    const g = svgEl("g");
    const baseY = H - 28;
    // Simple spiral shell in pixels
    [
      [x - PX*2, baseY - PX*4, PX*5, PX*2],
      [x - PX*3, baseY - PX*2, PX*7, PX*2],
      [x - PX*2, baseY,        PX*5, PX*2],
      [x,        baseY - PX*3, PX*2, PX*2],
    ].forEach(([rx, ry, rw, rh]) => {
      g.appendChild(pxRect(rx, ry, rw, rh, "#e8d8c8", 0.65));
    });
    return g;
  }

  // ── Fish builder ──────────────────────────────────────────

  function createFish(fishData, y) {
    const g = svgEl("g");
    g.classList.add("fish");

    const sz = FISH_SIZE[fishData.size] || FISH_SIZE.small;
    const half = sz / 2;

    const img = svgEl("image");
    img.setAttribute("href", `../assets/fish/${fishData.sprite}`);
    img.setAttribute("x", -half);
    img.setAttribute("y", -half);
    img.setAttribute("width", sz);
    img.setAttribute("height", sz);
    // multiply: white bg disappears into whatever is behind, grey art stays
    img.setAttribute("style", "mix-blend-mode:multiply; image-rendering:pixelated;");
    g.appendChild(img);

    g._swimData = {
      x: 30 + Math.random() * (W - 60),
      y,
      speed: 16 + Math.random() * 14,
      direction: Math.random() > 0.5 ? 1 : -1,
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: 1 + Math.random() * 0.8,
      bobAmount: 2 + Math.random() * 3,
    };

    return g;
  }

  // ── Pixel bubble ──────────────────────────────────────────

  function createBubble(container) {
    const cx = 50 + Math.random() * (W - 100);
    const size = PX * (1 + Math.round(Math.random()));
    const r = svgEl("rect");
    setAttrs(r, {
      x: cx, y: H - 15,
      width: size, height: size,
      fill: "none",
      stroke: "rgba(255,255,255,0.3)",
      "stroke-width": 1,
      "shape-rendering": "crispEdges",
    });
    r._bubbleData = {
      x: cx, y: H - 15,
      speed: 14 + Math.random() * 20,
      wobble: Math.random() * Math.PI * 2,
      wobbleAmount: 2 + Math.random() * 4,
      size,
    };
    container.appendChild(r);
    return r;
  }

  // ── Helpers ───────────────────────────────────────────────

  function svgEl(tag) { return document.createElementNS("http://www.w3.org/2000/svg", tag); }

  function setAttrs(el, attrs) {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  }

  function darken(hex, amt) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    const f = 1 - amt;
    return `rgb(${Math.round(r*f)},${Math.round(g*f)},${Math.round(b*f)})`;
  }

  function getTimeOfDay() {
    const h = new Date().getHours();
    if (h >= 5 && h < 8) return "dawn";
    if (h >= 8 && h < 17) return "day";
    if (h >= 17 && h < 20) return "sunset";
    return "night";
  }

  // ── Decoration layout ─────────────────────────────────────

  const DECO_LAYOUT = [
    { key: "pebbles",      build: p => createPebbles(p) },
    { key: "plant-small",  build: p => createPlant(50, p, false) },
    { key: "plant-small",  build: p => createPlant(255, p, false) },
    { key: "rock",         build: p => createRock(88, p) },
    { key: "rock",         build: p => createRock(218, p) },
    { key: "plant-tall",   build: p => createPlant(148, p, true) },
    { key: "coral-small",  build: p => createCoral(185, p, "round") },
    { key: "coral-fan",    build: p => createCoral(108, p, "fan") },
    { key: "coral-branch", build: p => createCoral(245, p, "round") },
    { key: "anemone",      build: p => createAnemone(192, p) },
    { key: "shell",        build: p => createShell(132) },
    { key: "shell",        build: p => createShell(262) },
  ];

  // ── Main render ───────────────────────────────────────────

  let animFrame = null;
  let fishes = [];
  let bubblesList = [];
  let bubbleTimer = 0;

  function render(state) {
    const { totalMl, unlockedFish } = state;
    const tier = TankConfig.getTier(totalMl);
    const time = getTimeOfDay();
    const palette = { ...PALETTES[time], coral: PALETTES[time].coral };

    // Water level — single 2 px horizontal line
    const waterY = 220 - (tier.level - 1) * 18;
    const waterFill = document.getElementById("waterFill");
    waterFill.setAttribute("y", waterY);
    waterFill.setAttribute("height", 2);
    waterFill.setAttribute("fill", "#3a3a3a");
    waterFill.removeAttribute("opacity");

    // Decorations
    const decoGroup = document.getElementById("decorations");
    decoGroup.innerHTML = "";
    decoGroup.appendChild(createSandbed(palette));

    const decos = new Set(tier.decorations);
    for (const item of DECO_LAYOUT) {
      if (decos.has(item.key)) decoGroup.appendChild(item.build(palette));
    }

    // Fish
    const fishGroup = document.getElementById("fishGroup");
    fishGroup.innerHTML = "";
    fishes = [];

    const FISH_Y_MIN = waterY + 24;
    const FISH_Y_MAX = H - 60;

    const fishToShow = (unlockedFish || [TankConfig.fish[0]]).slice(0, tier.maxFish);
    for (let i = 0; i < fishToShow.length; i++) {
      const y = FISH_Y_MIN + ((i / Math.max(fishToShow.length - 1, 1)) * (FISH_Y_MAX - FISH_Y_MIN)) + (Math.random() - 0.5) * 14;
      const fish = createFish(fishToShow[i], Math.max(y, FISH_Y_MIN));
      fishGroup.appendChild(fish);
      fishes.push(fish);
    }

    // Bubbles
    const bubbleGroup = document.getElementById("bubbles");
    bubbleGroup.innerHTML = "";
    bubblesList = [];

    // Animate
    if (animFrame) cancelAnimationFrame(animFrame);
    let lastTime = performance.now();
    bubbleTimer = 0;

    function animate(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      for (const f of fishes) {
        const d = f._swimData;
        d.x += d.speed * d.direction * dt;
        d.bobPhase += d.bobSpeed * dt;
        // Pixel-snap the bob for that retro feel
        const rawBob = Math.sin(d.bobPhase) * d.bobAmount;
        const by = d.y + Math.round(rawBob / PX) * PX;

        if (d.direction === 1 && d.x > 280) { d.x = 20; d.y = FISH_Y_MIN + Math.random() * (FISH_Y_MAX - FISH_Y_MIN); }
        else if (d.direction === -1 && d.x < 20) { d.x = 280; d.y = FISH_Y_MIN + Math.random() * (FISH_Y_MAX - FISH_Y_MIN); }

        const sx = d.direction === -1 ? -1 : 1;
        f.setAttribute("transform", `translate(${Math.round(d.x)}, ${by}) scale(${sx}, 1)`);
      }

      bubbleTimer += dt;
      if (bubbleTimer > 1.8 + Math.random() * 2) {
        bubbleTimer = 0;
        if (bubblesList.length < 5) bubblesList.push(createBubble(bubbleGroup));
      }

      for (let i = bubblesList.length - 1; i >= 0; i--) {
        const b = bubblesList[i];
        const bd = b._bubbleData;
        bd.y -= bd.speed * dt;
        bd.wobble += 1.5 * dt;
        const wx = Math.round(bd.x + Math.sin(bd.wobble) * bd.wobbleAmount);

        if (bd.y < waterY - 10) {
          b.remove();
          bubblesList.splice(i, 1);
        } else {
          b.setAttribute("x", wx);
          b.setAttribute("y", Math.round(bd.y));
          b.setAttribute("opacity", Math.max(0, Math.min(0.4, ((bd.y - waterY) / (H - waterY)) * 0.45)));
        }
      }

      animFrame = requestAnimationFrame(animate);
    }

    animFrame = requestAnimationFrame(animate);
  }

  function stop() {
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = null;
  }

  return { render, stop, getTimeOfDay, PALETTES };
})();
