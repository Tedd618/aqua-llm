/**
 * Bowl3D — Liquid Glass fish bowl renderer for the popup.
 *
 * Usage:
 *   Bowl3D.init(canvasEl, { totalMl, unlockedFish });
 *   Bowl3D.setFill(fraction);   // 0‒1
 *   Bowl3D.stop();
 */

const Bowl3D = (() => {
  let THREE; // set in init — needed by setFill and helpers
  let renderer, scene, camera, clock;
  let outer, inner, waterBodyMesh, waterSurface, rimMesh, shadowMesh;
  let liquidGlassMat, waterBodyMat, waterSurfaceMat;
  let fbo, animFrame;
  let fishSprites = [];
  let bubbles = [];
  let R, waterY, surfR, bowlTopY;
  let surfRBuild; // disc radius the surface geometry was created with

  // ── Shaders ────────────────────────────────────────────────────
  const lgVert = `
    varying vec3 vWorldNormal;
    varying vec3 vWorldPos;
    varying vec4 vClipPos;
    void main() {
      vec4 wp     = modelMatrix * vec4(position, 1.0);
      vWorldPos    = wp.xyz;
      vWorldNormal = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
      vClipPos     = projectionMatrix * viewMatrix * wp;
      gl_Position  = vClipPos;
    }
  `;

  const lgFrag = `
    uniform sampler2D uSceneTex;
    uniform vec3      uCamPos;
    uniform float     uIorR;
    uniform float     uIorG;
    uniform float     uIorB;
    uniform float     uRefract;
    uniform float     uChroma;
    uniform float     uClipY;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPos;
    varying vec4 vClipPos;
    void main() {
      if (vWorldPos.y > uClipY) discard;
      vec3 N = normalize(vWorldNormal);
      vec3 V = normalize(uCamPos - vWorldPos);
      vec2 uv = (vClipPos.xy / vClipPos.w) * 0.5 + 0.5;
      vec3 rR = refract(-V, N, 1.0 / uIorR);
      vec3 rG = refract(-V, N, 1.0 / uIorG);
      vec3 rB = refract(-V, N, 1.0 / uIorB);
      float r = texture2D(uSceneTex, uv + rR.xy * uRefract * uChroma).r;
      float g = texture2D(uSceneTex, uv + rG.xy * uRefract          ).g;
      float b = texture2D(uSceneTex, uv + rB.xy * uRefract * uChroma).b;
      vec3 color = vec3(r, g, b);
      color = mix(color, color * vec3(0.92, 0.95, 1.05), 0.35);
      vec3 H1 = normalize(V + normalize(vec3( 0.40,  0.70, 1.0)));
      vec3 H2 = normalize(V + normalize(vec3(-0.30, -0.50, 1.0)));
      vec3 H3 = normalize(V + normalize(vec3( 0.00,  0.90, 0.4)));
      color += vec3(pow(max(dot(N,H1),0.0),90.0)
                  + pow(max(dot(N,H2),0.0),50.0)*0.28
                  + pow(max(dot(N,H3),0.0),120.0)*0.55
                  + pow(max(dot(N,normalize(vec3(0.10,0.30,1.0))),0.0),6.0)*0.08) * 0.85;
      float fresnel = pow(1.0 - abs(dot(V, N)), 4.0);
      color += vec3(0.60, 0.78, 1.00) * fresnel * (0.5 + 0.5 * N.y) * 0.55;
      gl_FragColor = vec4(color, mix(0.04, 0.55, fresnel));
    }
  `;

  const waterVert = `
    uniform float time;
    varying vec2  vUv;
    varying vec3  vWorldPos;
    varying vec3  vViewDir;
    varying vec3  vNormal;
    #define PI 3.14159265
    vec3 gerstner(vec3 pos, vec2 dir, float A, float Q, float L, float spd,
                  inout vec3 T, inout vec3 B) {
      float k = 2.0 * PI / L;
      float c = sqrt(9.8 / k) * spd;
      vec2  d = normalize(dir);
      float f = k * (dot(d, pos.xz) - c * time);
      float s = sin(f), cs = cos(f);
      float qi = Q / (k * A);
      T += vec3(-qi*d.x*d.x*k*A*s, qi*d.x*k*A*cs, -qi*d.x*d.y*k*A*s);
      B += vec3(-qi*d.x*d.y*k*A*s, qi*d.y*k*A*cs, -qi*d.y*d.y*k*A*s);
      return vec3(qi*A*d.x*cs, A*s, qi*A*d.y*cs);
    }
    void main() {
      vUv = uv;
      vec3 pos = position;
      vec3 T = vec3(1,0,0), B = vec3(0,0,1);
      pos += gerstner(position, vec2( 1.00,  0.20), 0.005, 0.15, 0.42, 0.75, T, B);
      pos += gerstner(position, vec2( 0.48,  0.88), 0.003, 0.13, 0.30, 1.05, T, B);
      pos += gerstner(position, vec2(-0.70,  0.71), 0.003, 0.12, 0.24, 0.90, T, B);
      pos += gerstner(position, vec2(-0.92, -0.38), 0.002, 0.10, 0.20, 1.20, T, B);
      pos += gerstner(position, vec2( 0.20, -0.98), 0.002, 0.10, 0.16, 1.10, T, B);
      pos += gerstner(position, vec2( 0.64,  0.77), 0.001, 0.08, 0.13, 1.40, T, B);
      vNormal   = normalize(cross(B, T));
      vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
      vViewDir  = normalize(cameraPosition - vWorldPos);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const waterFrag = `
    uniform sampler2D normalMap;
    uniform float     time;
    uniform vec3      sunDir;
    varying vec2      vUv;
    varying vec3      vWorldPos;
    varying vec3      vViewDir;
    varying vec3      vNormal;
    void main() {
      vec2 uv1 = vUv * 4.5 + vec2( time * 0.018, time * 0.011);
      vec2 uv2 = vUv * 4.5 + vec2(-time * 0.013, time * 0.021);
      vec3 n1 = texture2D(normalMap, uv1).rgb * 2.0 - 1.0;
      vec3 n2 = texture2D(normalMap, uv2).rgb * 2.0 - 1.0;
      vec3 N  = normalize(vNormal + normalize(vec3(n1.xy + n2.xy, n1.z)) * 0.10);
      vec3 V  = normalize(vViewDir);
      float F0 = 0.02;
      float fresnel = F0 + (1.0-F0) * pow(1.0 - max(dot(V, N), 0.0), 5.0);
      vec3  H    = normalize(V + normalize(sunDir));
      float spec = pow(max(dot(N, H), 0.0), 80.0) * 0.5;
      vec3 waterCol = vec3(0.68, 0.86, 0.98);
      vec3 skyRefl  = vec3(0.85, 0.93, 1.00);
      vec3 color    = mix(waterCol, skyRefl, fresnel * 0.6) + vec3(1.0) * spec;
      gl_FragColor = vec4(color, 0.72);
    }
  `;

  // ── Build scene ────────────────────────────────────────────────
  function buildScene(THREE, totalMl) {
    R        = 1.5;
    const FILL = fillFraction(totalMl);
    waterY   = -R + 2 * R * FILL;
    surfR    = Math.sqrt(R*R - waterY*waterY);
    bowlTopY = R * 0.78;
    const rimR = Math.sqrt(R*R - bowlTopY*bowlTopY);

    const waterClip   = new THREE.Plane(new THREE.Vector3(0, -1, 0), waterY);
    const bowlTopClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), bowlTopY);

    // Liquid Glass outer
    liquidGlassMat = new THREE.ShaderMaterial({
      vertexShader: lgVert, fragmentShader: lgFrag,
      uniforms: {
        uSceneTex: { value: null },
        uCamPos:   { value: camera.position },
        uIorR:     { value: 1.490 },
        uIorG:     { value: 1.500 },
        uIorB:     { value: 1.520 },
        uRefract:  { value: 0.38  },
        uChroma:   { value: 0.055 },
        uClipY:    { value: bowlTopY },
      },
      transparent: true, side: THREE.FrontSide, depthWrite: false,
    });

    const shellGeo = new THREE.SphereGeometry(R, 80, 80);
    outer = new THREE.Mesh(shellGeo, liquidGlassMat);
    scene.add(outer);

    // Rim
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: 0xddeeff, transmission: 0.85, ior: 1.50, thickness: 0.06,
      roughness: 0.02, clearcoat: 1.0, clearcoatRoughness: 0.04, envMapIntensity: 0.0,
    });
    rimMesh = new THREE.Mesh(new THREE.TorusGeometry(rimR, 0.038, 20, 96), rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = bowlTopY;
    scene.add(rimMesh);

    // Water body
    waterBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xc8e8ff, transparent: true, opacity: 0.38, roughness: 0.1,
      clippingPlanes: [waterClip, bowlTopClip], side: THREE.FrontSide, depthWrite: false,
    });
    waterBodyMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 0.972, 80, 80), waterBodyMat);
    scene.add(waterBodyMesh);

    // Water surface
    const waterNormalTex = new THREE.TextureLoader().load(
      '../lib/waternormals.jpg',
      t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    );
    surfRBuild = surfR;
    const surfGeo = new THREE.CircleGeometry(surfR * 0.988, 128);
    surfGeo.rotateX(-Math.PI / 2);
    waterSurfaceMat = new THREE.ShaderMaterial({
      vertexShader: waterVert, fragmentShader: waterFrag,
      uniforms: {
        time:      { value: 0 },
        normalMap: { value: waterNormalTex },
        sunDir:    { value: new THREE.Vector3(3, 5, 4).normalize() },
      },
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
    });
    waterSurface = new THREE.Mesh(surfGeo, waterSurfaceMat);
    waterSurface.position.y = waterY;
    scene.add(waterSurface);

    // Shadow
    shadowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -R - 0.01;
    scene.add(shadowMesh);
  }

  // ── Fish sprites ────────────────────────────────────────────────
  // Converts white background → transparent via canvas so fish look
  // clean against the pale glass bowl.
  function loadFishTexture(THREE, url) {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = img.width; cv.height = img.height;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, cv.width, cv.height);
        for (let i = 0; i < d.data.length; i += 4) {
          const r = d.data[i], g = d.data[i+1], b = d.data[i+2];
          if (r > 210 && g > 210 && b > 210) d.data[i+3] = 0; // white → transparent
        }
        ctx.putImageData(d, 0, 0);
        const tex = new THREE.CanvasTexture(cv);
        resolve(tex);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function buildFish(THREE, unlockedFish) {
    fishSprites.forEach(s => scene.remove(s));
    fishSprites = [];
    if (!unlockedFish || unlockedFish.length === 0) return;

    // Swim zone: strictly BELOW the waterline, above the bowl's lower curve
    const Y_TOP    = waterY - 0.22;
    const Y_BOTTOM = -R * 0.55;
    const sizeMap  = { small: 0.30, medium: 0.42, large: 0.55, huge: 0.70 };

    await Promise.all(unlockedFish.slice(0, 8).map(async (fish, i) => {
      const tex = await loadFishTexture(THREE, `../assets/fish/${fish.sprite}`);
      if (!tex) return;

      // Depth parallax: back fish are slightly smaller, fainter, behind centre
      const z    = -0.35 + Math.random() * 0.7;
      const deep = (0.35 - z) / 0.7; // 0 = front, 1 = back
      const mat  = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.05,
        color: new THREE.Color(0.42, 0.50, 0.58), // dark blue-grey tint for visibility
        opacity: 1.0 - deep * 0.25,
      });
      const sprite = new THREE.Sprite(mat);
      const s = (sizeMap[fish.size] || 0.32) * (1.0 - deep * 0.2);
      sprite.scale.set(s * 1.4, s, 1);

      const y = Y_BOTTOM + Math.random() * (Y_TOP - Y_BOTTOM);
      sprite._swim = {
        x: -0.8 + Math.random() * 1.6, y, z,
        speed:    (0.10 + Math.random() * 0.10) * (Math.random() > 0.5 ? 1 : -1),
        bobPhase: Math.random() * Math.PI * 2,
        bobAmt:   0.03 + Math.random() * 0.04,
        bobSpd:   0.8 + Math.random() * 0.6,
      };
      sprite._sw = s * 1.4;
      scene.add(sprite);
      fishSprites.push(sprite);
    }));
  }

  // ── Bubbles ─────────────────────────────────────────────────────
  function buildBubbles(THREE) {
    bubbles.forEach(b => scene.remove(b.mesh));
    bubbles = [];
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xeef8ff, transparent: true, opacity: 0.38, roughness: 0, clearcoat: 1,
    });
    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), mat);
      mesh.scale.setScalar(0.010 + Math.random() * 0.018);
      const a = Math.random() * Math.PI * 2, r = Math.random() * surfR * 0.7;
      mesh.position.set(Math.cos(a)*r, -R + Math.random()*(waterY+R), Math.sin(a)*r);
      const d = { bx: Math.cos(a)*r, bz: Math.sin(a)*r, spd: 0.15+Math.random()*0.25, ph: Math.random()*Math.PI*2, w: 0.02+Math.random()*0.04 };
      bubbles.push({ mesh, d });
      scene.add(mesh);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────
  function fillFraction(ml) {
    // Camera sits at y=0.2. Water surface must stay above y=0.2 (i.e. fill > 57%)
    // so the camera is always submerged — gives the pale-blue-everywhere look.
    // Scale: 62% (0 mL) → 85% (max mL).
    if (ml <= 0) return 0.62;
    const maxMl = 300000;
    const t = Math.log1p(ml) / Math.log1p(maxMl);
    return 0.62 + t * 0.23;
  }

  // ── Public API ──────────────────────────────────────────────────
  function init(canvas, THREE_mod, { totalMl = 0, unlockedFish = [] } = {}) {
    THREE = THREE_mod; // store module-wide so setFill/helpers can use it
    const W = canvas.width  || 380;
    const H = canvas.height || 440;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xedf2f5);

    camera = new THREE.PerspectiveCamera(38, W / H, 0.01, 100);
    camera.position.set(0, 0.2, 6.5);
    camera.lookAt(0, -0.3, 0);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 5, 4);
    scene.add(key);
    const soft = new THREE.DirectionalLight(0xd0e8ff, 0.5);
    soft.position.set(-3, 2, -2);
    scene.add(soft);

    fbo = new THREE.WebGLRenderTarget(
      W * Math.min(devicePixelRatio, 2),
      H * Math.min(devicePixelRatio, 2),
      { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }
    );

    buildScene(THREE, totalMl);
    buildFish(THREE, unlockedFish);
    buildBubbles(THREE);

    clock = new THREE.Clock();
    animate();
  }

  function animate() {
    animFrame = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    waterSurfaceMat.uniforms.time.value = t;
    liquidGlassMat.uniforms.uCamPos.value.copy(camera.position);

    // Animate bubbles
    bubbles.forEach(({ mesh, d }) => {
      mesh.position.y += d.spd * 0.007;
      mesh.position.x = d.bx + Math.sin(t*1.1+d.ph)*d.w;
      mesh.position.z = d.bz + Math.cos(t*0.9+d.ph)*d.w;
      if (mesh.position.y > waterY - 0.04) {
        const a = Math.random()*Math.PI*2, r = Math.random()*surfR*0.7;
        d.bx = Math.cos(a)*r; d.bz = Math.sin(a)*r;
        d.ph = Math.random()*Math.PI*2;
        mesh.position.y = -R + 0.08;
      }
    });

    // Animate fish — swim zone strictly below the waterline
    const Y_TOP    = waterY - 0.22;
    const Y_BOTTOM = -R * 0.55;
    fishSprites.forEach(sprite => {
      const sw = sprite._swim;
      sw.x += sw.speed * 0.016;
      sw.bobPhase += sw.bobSpd * 0.016;
      const bob = Math.sin(sw.bobPhase) * sw.bobAmt;

      // Horizontal bound follows the bowl's circular cross-section at this depth
      const halfW = Math.max(0.5, Math.sqrt(Math.max(0.1, R*R - sw.y*sw.y)) * 0.62);
      if (sw.speed > 0 && sw.x >  halfW) { sw.x = -halfW; sw.y = Y_BOTTOM + Math.random() * (Y_TOP - Y_BOTTOM); }
      if (sw.speed < 0 && sw.x < -halfW) { sw.x =  halfW; sw.y = Y_BOTTOM + Math.random() * (Y_TOP - Y_BOTTOM); }

      sprite.position.set(sw.x, Math.min(sw.y + bob, Y_TOP), sw.z);
      const dir = sw.speed > 0 ? 1 : -1;
      sprite.scale.x = Math.abs(sprite._sw) * dir;
    });

    // Gentle camera sway — keeps the scene feeling alive
    camera.position.x = Math.sin(t * 0.15) * 0.08;
    camera.position.y = 0.2 + Math.sin(t * 0.11 + 1.0) * 0.03;
    camera.lookAt(0, -0.3, 0);

    // Two-pass render
    outer.visible = false;
    renderer.setRenderTarget(fbo);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    outer.visible = true;
    liquidGlassMat.uniforms.uSceneTex.value = fbo.texture;
    renderer.render(scene, camera);
  }

  function setFill(totalMl) {
    // Move water level without a full scene rebuild
    const FILL = fillFraction(totalMl);
    waterY = -R + 2 * R * FILL;
    surfR  = Math.sqrt(R*R - waterY*waterY);
    waterSurface.position.y = waterY;
    // Disc radius must match the bowl's cross-section at the new height
    const k = surfR / surfRBuild;
    waterSurface.scale.set(k, 1, k);
    waterBodyMat.clippingPlanes[0].constant = waterY;
  }

  function stop() {
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = null;
  }

  return { init, setFill, stop };
})();
