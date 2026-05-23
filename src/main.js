import "./style.css";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import { GetSceneBounds } from "./utils";
import { buildUI, transitionTo, killCurrentContent, runLoader, firstAnimateIn, PROJECTS } from "./ui.js";
import { TextureLoader } from "three";
import edgeWarpVert from "./shaders/edge-warp/vertex.glsl";
import edgeWarpFrag from "./shaders/edge-warp/fragment.glsl";

buildUI();

const canvas = document.querySelector("canvas");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0); // transparent — body bg shows through

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1000);
camera.position.z = 5;

const { width: SceneWidth, height: SceneHeight } = GetSceneBounds(renderer, camera);

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
  cardWidthFactor:          0.28,
  gapFactor:                0.06,
  cardCount:                11,
  snapDelay:                60,
  scrollEase:               0.08,
  maxScrollVelocity:        0.18,
  velocityEase:             0.04,
  expandEase:               0.14,
  expandSettleThreshold:    0.002,
};

const CARD_W  = SceneWidth  * CONFIG.cardWidthFactor;
const CARD_H  = (CARD_W * SceneHeight) / SceneWidth;
const GAP     = SceneWidth  * CONFIG.gapFactor;
const STRIDE  = CARD_W + GAP;
const TOTAL_W = STRIDE * CONFIG.cardCount;

const EXPAND_SX = SceneWidth  / CARD_W;
const EXPAND_SY = SceneHeight / CARD_H;

// ─── POSTPROCESSING — EDGE UV WARP ───────────────────────────────────────────
// shaders live in /shaders/edge-warp/vert.glsl + frag.glsl
const EdgeWarpShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount:  { value: 0.0 },
    uTime:    { value: 0.0 },
    uActive:    { value: 1.0 },
  },
  vertexShader:   edgeWarpVert,
  fragmentShader: edgeWarpFrag,
};

// alpha-aware render target so transparent bg passes through the composer
const rtParams = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
const renderTarget = new THREE.WebGLRenderTarget(innerWidth * Math.min(devicePixelRatio, 2), innerHeight * Math.min(devicePixelRatio, 2), rtParams);
const composer   = new EffectComposer(renderer, renderTarget);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const rgbPass = new ShaderPass(EdgeWarpShader);
rgbPass.renderToScreen = true;
composer.addPass(rgbPass);

// ─── THEME ────────────────────────────────────────────────────────────────────
let isDark = false;

function applyTheme(dark, animate = true) {
  const root = document.documentElement;
  if (animate) root.classList.add("theme-transitioning");
  root.setAttribute("data-theme", dark ? "dark" : "light");
  
  if (animate) {
    setTimeout(() => root.classList.remove("theme-transitioning"), 600);
  }
}

// theme toggle button — injected into existing nav
function injectThemeButton() {
  const nav = document.querySelector("nav");
  if (!nav) return;

  // stop ALL pointer/touch events on nav from bubbling to window listeners
  // prevents nav clicks from triggering the canvas pointerdown/drag handler
  nav.addEventListener("pointerdown", (e) => e.stopPropagation());
  nav.addEventListener("pointermove", (e) => e.stopPropagation());
  nav.addEventListener("pointerup",   (e) => e.stopPropagation());
  nav.addEventListener("touchstart",  (e) => e.stopPropagation(), { passive: true });
  nav.addEventListener("touchmove",   (e) => e.stopPropagation(), { passive: true });
  nav.addEventListener("touchend",    (e) => e.stopPropagation());

  const btn = document.createElement("button");
  btn.className  = "theme-toggle";
  btn.setAttribute("aria-label", "Toggle theme");
  btn.innerHTML  = `
    <span class="theme-icon theme-icon--moon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
      </svg>
    </span>
    <span class="theme-icon theme-icon--sun">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    </span>
  `;
  btn.addEventListener("click", () => {
    isDark = !isDark;
    btn.classList.toggle("is-light", !isDark);
    applyTheme(isDark);
  });
  nav.appendChild(btn);
}

// wait for buildUI to finish inserting nav
applyTheme(isDark, false); // apply default theme (light) immediately, no transition
requestAnimationFrame(injectThemeButton);

// ─── CARDS ───────────────────────────────────────────────────────────────────
const TLoader = new TextureLoader();
const cards   = [];

for (let i = 0; i < CONFIG.cardCount; i++) {
  const uniforms = {
    uVelocity:       { value: 0 },
    uScrollVelocity: { value: 0 },
    uExpand:         { value: 0 },
    uWidth:          { value: SceneWidth / 2 },
    uMap:            { value: null },
    uImageSize:      { value: new THREE.Vector2(1, 1) },
    uPlaneSize:      { value: new THREE.Vector2(CARD_W, CARD_H) },
  };

  console.log((i) % 11 + 1)

  TLoader.load(`/images/${(i) % 11 + 1}.jpg`, (txt) => {
    txt.colorSpace = THREE.SRGBColorSpace;
    uniforms.uImageSize.value.set(txt.image.width, txt.image.height);
    uniforms.uMap.value = txt;

  });

  const material = new CustomShaderMaterial({
    baseMaterial: THREE.MeshBasicMaterial,
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uVelocity;
      uniform float uScrollVelocity;
      uniform float uExpand;
      uniform float uWidth;

      varying vec2 vScreenUV;
      varying vec2 vUv;

      void main() {
        vec3 pos = position;
        vUv = uv;

        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec2 screenUV = (clip.xy / clip.w) * 0.5 + 0.5;

        float IsActive = 1.0 - uExpand;

        float bend = sin(screenUV.x * PI) * 2.0;
        pos.z -= bend * uScrollVelocity * 7.0 * IsActive;
        pos.z -= uScrollVelocity * 1.2 * IsActive;

        vec4 dispClip = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        vScreenUV = (dispClip.xy / dispClip.w) * 0.5 + 0.5;

        csm_Position = pos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec2 uImageSize;
      uniform vec2 uPlaneSize;

      varying vec2 vUv;

      vec2 getCenteredCoverUV(vec2 uv, vec2 img, vec2 plane) {
        vec2 centeredUV = uv - 0.5;

        float imgRatio   = img.x / img.y;
        float planeRatio = plane.x / plane.y;

        vec2 scale = vec2(1.0);

        if (planeRatio > imgRatio) {
          scale.y = imgRatio / planeRatio;
        } else {
          scale.x = planeRatio / imgRatio;
        }

        centeredUV *= scale;
        return centeredUV + 0.5;
      }

      void main() {
        vec2 uv = getCenteredCoverUV(vUv, uImageSize, uPlaneSize);
        csm_FragColor = texture2D(uMap, uv);
      }
    `,
  });

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_W, CARD_H, 40, 1),
    material,
  );

  mesh.position.x = i * STRIDE;
  mesh.userData.expandProgress = 0;
  mesh.userData.expandTarget   = 0;

  scene.add(mesh);
  cards.push(mesh);
}

// ─── SCROLL STATE ─────────────────────────────────────────────────────────────
const scroll = {
  current: 0,
  target:  0,
  prev:    0,
  ease:    CONFIG.scrollEase,
};

let rawInputDelta  = 0;
let velocity       = 0;
let scrollVelocity = 0;
let smoothRGB      = 0;   // smoothed value fed to shader
let smoothActive   = 0;   // uActive: lerps to 1 when scrolling, 0 when snapped
let isScrolling    = false; // flips on input, clears on snap settle

// ─── EXPAND STATE ─────────────────────────────────────────────────────────────
let expandedIndex    = -1;
let isExpanded       = false;
let pendingExpandIdx = -1;

// ─── INPUT HELPERS ────────────────────────────────────────────────────────────
let isPointerDown = false;
let lastDragX     = 0;

function triggerCollapse() {
  if (!isExpanded) return;
  isExpanded       = false;
  expandedIndex    = -1;
  pendingExpandIdx = -1;
}

// shared delta accumulator — normalised to scene units, consistent across devices
function addScrollDelta(sceneDelta) {
  scroll.target += sceneDelta;
  rawInputDelta += Math.abs(sceneDelta) / SceneWidth;
  isScrolling = true; // mark scrolling — uActive will lerp to 1
}

// ─── WHEEL ────────────────────────────────────────────────────────────────────
window.addEventListener("wheel", (e) => {
  killCurrentContent();
  if (isExpanded) { triggerCollapse(); return; }
  // deltaY in pixels → scene units (same scale as STRIDE)
  addScrollDelta(e.deltaY * 0.002 * (SceneWidth / 6));
}, { passive: true });

// ─── POINTER (mouse drag) ─────────────────────────────────────────────────────
const drag = { active: false };

window.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "touch") return; // handled by touch events
  isPointerDown = true;
  drag.active   = true;
  lastDragX     = e.clientX;
  if (isExpanded) triggerCollapse();
  else killCurrentContent();
});

window.addEventListener("pointermove", (e) => {
  if (!drag.active || isExpanded || e.pointerType === "touch") return;
  killCurrentContent();
  const dx         = e.clientX - lastDragX;
  lastDragX        = e.clientX;
  const sceneDelta = -(dx / innerWidth) * SceneWidth * 1.4;
  addScrollDelta(sceneDelta);
});

window.addEventListener("pointerup",    (e) => { if (e.pointerType !== "touch") { isPointerDown = false; drag.active = false; } });
window.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") { isPointerDown = false; drag.active = false; } });

// ─── TOUCH ────────────────────────────────────────────────────────────────────
let touchStartX = 0;

window.addEventListener("touchstart", (e) => {
  if (isExpanded) triggerCollapse();
  else killCurrentContent();
  drag.active = true;
  touchStartX = e.touches[0].clientX;
  lastDragX   = touchStartX;
  isPointerDown = true;
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  if (!drag.active || isExpanded) return;
  killCurrentContent();
  const x          = e.touches[0].clientX;
  const dx         = x - lastDragX;
  lastDragX        = x;
  const sceneDelta = -(dx / innerWidth) * SceneWidth * 1.4;
  addScrollDelta(sceneDelta);
}, { passive: true });

window.addEventListener("touchend",    () => { drag.active = false; isPointerDown = false; });
window.addEventListener("touchcancel", () => { drag.active = false; isPointerDown = false; });

// ─── SNAP ─────────────────────────────────────────────────────────────────────
let lastTarget = 0;
let restTimer  = null;

function scheduleSnap() {
  clearTimeout(restTimer);
  restTimer = setTimeout(() => {
    if (isPointerDown || isExpanded) return;
    const snapped = Math.round(scroll.target / STRIDE) * STRIDE;
    scroll.target = snapped;
    const idx = ((Math.round(snapped / STRIDE) % CONFIG.cardCount) + CONFIG.cardCount) % CONFIG.cardCount;
    pendingExpandIdx = idx;
  }, CONFIG.snapDelay);
}

// ─── LAYOUT ───────────────────────────────────────────────────────────────────
function getLayoutX(i, offset) {
  let x = i * STRIDE - offset;
  x = ((x + TOTAL_W * 0.5) % TOTAL_W + TOTAL_W) % TOTAL_W - TOTAL_W * 0.5;
  return x;
}

// ─── ANIMATE ──────────────────────────────────────────────────────────────────
let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  if (!isExpanded) {
    if (scroll.target !== lastTarget) {
      lastTarget = scroll.target;
      scheduleSnap();
    }
    scroll.current += (scroll.target - scroll.current) * scroll.ease;
  }

  if (pendingExpandIdx !== -1 && !isExpanded) {
    const diff = Math.abs(scroll.target - scroll.current);
    if (diff < CONFIG.expandSettleThreshold) {
      expandedIndex    = pendingExpandIdx;
      isExpanded       = true;
      isScrolling      = false; // snap settled — uActive lerps back to 0
      transitionTo(expandedIndex);
      pendingExpandIdx = -1;
    }
  }

  velocity = scroll.current - scroll.prev;
  scroll.prev = scroll.current;

  // velocity from rawInputDelta (0→1 range)
  const rawNorm   = THREE.MathUtils.clamp(rawInputDelta / CONFIG.maxScrollVelocity, 0, 1);
  scrollVelocity += (rawNorm - scrollVelocity) * CONFIG.velocityEase;
  rawInputDelta   = 0;

  // smooth warp amount
  const rgbTarget = scrollVelocity;
  smoothRGB += (rgbTarget - smoothRGB) * (rgbTarget > smoothRGB ? 0.25 : 0.04);

  // uActive: fast lerp to 1 on scroll start, slow lerp to 0 on snap settle
  const activeTarget = isScrolling ? 1.0 : 0.0;
  smoothActive += (activeTarget - smoothActive) * .15;

  // update postprocessing
  rgbPass.uniforms.uAmount.value  = smoothRGB;
  rgbPass.uniforms.uTime.value    = elapsed;
  rgbPass.uniforms.uActive.value  = smoothActive;

  for (let i = 0; i < CONFIG.cardCount; i++) {
    const mesh     = cards[i];
    const mat      = mesh.material;
    const isActive = isExpanded && expandedIndex === i;

    mesh.userData.expandTarget   = isActive ? 1 : 0;
    mesh.userData.expandProgress = THREE.MathUtils.lerp(
      mesh.userData.expandProgress,
      mesh.userData.expandTarget,
      CONFIG.expandEase,
    );

    const ep      = mesh.userData.expandProgress;
    const layoutX = getLayoutX(i, scroll.current);

    mesh.position.x = THREE.MathUtils.lerp(layoutX, 0, ep);
    mesh.position.z = THREE.MathUtils.lerp(0, 0.05, ep);
    mesh.scale.x    = THREE.MathUtils.lerp(1, EXPAND_SX, ep);
    mesh.scale.y    = THREE.MathUtils.lerp(1, EXPAND_SY, ep);

    mat.uniforms.uVelocity.value       = velocity;
    mat.uniforms.uScrollVelocity.value = scrollVelocity;
    mat.uniforms.uExpand.value         = ep;
  }

  // use composer instead of renderer.render so RGB shift applies
  composer.render();
}
animate();

runLoader(() => {
  scroll.target    = 0;
  scroll.current   = 0;
  pendingExpandIdx = 0;
  firstAnimateIn();
});

// ─── RESIZE ───────────────────────────────────────────────────────────────────
let resizeTimer = null;
window.addEventListener("resize", () => {
  // Debounce — reload after resize settles so SplitText and scene bounds recalculate cleanly
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    window.location.reload();
  }, 250);
});