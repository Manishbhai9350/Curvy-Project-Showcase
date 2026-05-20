import "./style.css";
import * as THREE from "three";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import { GetSceneBounds } from "./utils";

const canvas = document.querySelector("canvas");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x080808);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1000);
camera.position.z = 5;

const { width: SceneWidth, height: SceneHeight } = GetSceneBounds(renderer, camera);

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
  cardWidthFactor:   0.28,
  gapFactor:         0.06,
  cardCount:         6,
  snapDelay:         120,
  scrollEase:        0.08,
  maxScrollVelocity: 0.18,
  velocityEase:      0.04,
  expandEase:        0.14,  // how fast expand/collapse lerps (higher = snappier)
  expandSettleThreshold: 0.002, // how close current→target must be before expand fires
};

const CARD_W  = SceneWidth  * CONFIG.cardWidthFactor;
const CARD_H  = (CARD_W * SceneHeight) / SceneWidth;
const GAP     = SceneWidth  * CONFIG.gapFactor;
const STRIDE  = CARD_W + GAP;
const TOTAL_W = STRIDE * CONFIG.cardCount;

const EXPAND_SX = SceneWidth  / CARD_W;
const EXPAND_SY = SceneHeight / CARD_H;

// ─── CARDS ───────────────────────────────────────────────────────────────────
const COLORS = [
  new THREE.Color(0xe63946),
  new THREE.Color(0x457b9d),
  new THREE.Color(0x2a9d8f),
  new THREE.Color(0xe9c46a),
  new THREE.Color(0xf4a261),
  new THREE.Color(0x6a4c93),
];

const cards = [];

for (let i = 0; i < CONFIG.cardCount; i++) {
  const material = new CustomShaderMaterial({
    baseMaterial: THREE.MeshBasicMaterial,
    color: COLORS[i % COLORS.length],
    uniforms: {
      uVelocity:       { value: 0 },
      uScrollVelocity: { value: 0 },
      uExpand:         { value: 0 }, // 0 = card, 1 = fullscreen
      uWidth:          { value: SceneWidth / 2 },
    },
    vertexShader: /* glsl */ `
      uniform float uVelocity;
      uniform float uScrollVelocity;
      uniform float uExpand;
      uniform float uWidth;

      varying vec2 vScreenUV;

      void main() {
        vec3 pos = position;

        // undisplaced clip for screenUV base
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec2 screenUV = (clip.xy / clip.w) * 0.5 + 0.5;

        // suppress all displacement while expanded
        float IsActive = 1.0 - uExpand;

        // bend + Z pushback — both killed as card expands
        float bend = sin(screenUV.x * PI) * 2.0;
        pos.z -= bend * uScrollVelocity * 1.5 * IsActive;
        pos.z -= uScrollVelocity * 1.2 * IsActive;

        // reproject displaced pos for correct vScreenUV
        vec4 dispClip = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        vScreenUV = (dispClip.xy / dispClip.w) * 0.5 + 0.5;

        csm_Position = pos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uVelocity;
      uniform float uScrollVelocity;
      uniform float uExpand;

      varying vec2 vScreenUV;

      void main() {
        csm_FragColor = vec4(vScreenUV, 0.0, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_W, CARD_H, 40, 1),
    material,
  );

  mesh.position.x = i * STRIDE;
  // store per-card expand state directly on the mesh
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

// ─── EXPAND STATE ─────────────────────────────────────────────────────────────
let expandedIndex    = -1;   // which card is currently expanding/expanded
let isExpanded       = false; // blocks scroll input when true
let pendingExpandIdx = -1;   // set after snap, fires once scroll settles

// ─── SCROLL INPUT ─────────────────────────────────────────────────────────────
let isPointerDown = false;
let lastDragX     = 0;

function triggerCollapse() {
  if (!isExpanded) return;
  isExpanded       = false;
  expandedIndex    = -1;
  pendingExpandIdx = -1;
}

window.addEventListener("wheel", (e) => {
  if (isExpanded) {
    triggerCollapse();
    return; // eat this event, next wheel starts scrolling
  }
  const delta = e.deltaY * 0.003;
  scroll.target += delta;
  rawInputDelta += Math.abs(delta);
}, { passive: true });

let drag = { active: false, startX: 0, startScroll: 0 };

window.addEventListener("pointerdown", (e) => {
  isPointerDown    = true;
  drag.active      = true;
  drag.startX      = e.clientX;
  drag.startScroll = scroll.target;
  lastDragX        = e.clientX;
  if (isExpanded) triggerCollapse();
});
window.addEventListener("pointermove", (e) => {
  if (!drag.active || isExpanded) return;
  const dx = (e.clientX - drag.startX) / innerWidth;
  scroll.target = drag.startScroll - dx * SceneWidth * 1.4;
  rawInputDelta += Math.abs(e.clientX - lastDragX) / innerWidth * SceneWidth * 1.4 * 0.003;
  lastDragX = e.clientX;
});
window.addEventListener("pointerup",    () => { isPointerDown = false; drag.active = false; });
window.addEventListener("pointerleave", () => { isPointerDown = false; drag.active = false; });

// ─── SNAP ─────────────────────────────────────────────────────────────────────
let lastTarget = 0;
let restTimer  = null;

function scheduleSnap() {
  clearTimeout(restTimer);
  restTimer = setTimeout(() => {
    if (isPointerDown || isExpanded) return;

    const snapped = Math.round(scroll.target / STRIDE) * STRIDE;
    scroll.target = snapped;

    // which card index lands at centre after snap — queue it, don't expand yet
    const idx = ((Math.round(snapped / STRIDE) % CONFIG.cardCount) + CONFIG.cardCount) % CONFIG.cardCount;
    pendingExpandIdx = idx;
  }, CONFIG.snapDelay);
}

// ─── LAYOUT — returns raw x for each card ─────────────────────────────────────
function getLayoutX(i, offset) {
  let x = i * STRIDE - offset;
  x = ((x + TOTAL_W * 0.5) % TOTAL_W + TOTAL_W) % TOTAL_W - TOTAL_W * 0.5;
  return x;
}

// ─── ANIMATE ──────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  // scroll
  if (!isExpanded) {
    if (scroll.target !== lastTarget) {
      lastTarget = scroll.target;
      scheduleSnap();
    }
    scroll.current += (scroll.target - scroll.current) * scroll.ease;
  }

  // fire expand once scroll has fully settled after snap
  if (pendingExpandIdx !== -1 && !isExpanded) {
    const diff = Math.abs(scroll.target - scroll.current);
    if (diff < CONFIG.expandSettleThreshold) {
      expandedIndex    = pendingExpandIdx;
      isExpanded       = true;
      pendingExpandIdx = -1;
    }
  }

  velocity       = scroll.current - scroll.prev;
  scroll.prev    = scroll.current;

  const rawNorm   = THREE.MathUtils.clamp(rawInputDelta / CONFIG.maxScrollVelocity, 0, 1);
  scrollVelocity += (rawNorm - scrollVelocity) * CONFIG.velocityEase;
  rawInputDelta   = 0;

  // per-card
  for (let i = 0; i < CONFIG.cardCount; i++) {
    const mesh = cards[i];
    const mat  = mesh.material;
    const isActive = isExpanded && expandedIndex === i;

    // expand target
    mesh.userData.expandTarget   = isActive ? 1 : 0;
    mesh.userData.expandProgress = THREE.MathUtils.lerp(
      mesh.userData.expandProgress,
      mesh.userData.expandTarget,
      CONFIG.expandEase,
    );

    const ep      = mesh.userData.expandProgress;
    const layoutX = getLayoutX(i, scroll.current);

    // position: blend between carousel layout and locked centre
    mesh.position.x = THREE.MathUtils.lerp(layoutX, 0, ep);
    mesh.position.z = THREE.MathUtils.lerp(0, 0.05, ep);

    // scale: card → fullscreen
    mesh.scale.x = THREE.MathUtils.lerp(1, EXPAND_SX, ep);
    mesh.scale.y = THREE.MathUtils.lerp(1, EXPAND_SY, ep);

    // uniforms
    mat.uniforms.uVelocity.value       = velocity;
    mat.uniforms.uScrollVelocity.value = scrollVelocity;
    mat.uniforms.uExpand.value         = ep;
  }

  renderer.render(scene, camera);
}
animate();

// ─── RESIZE ───────────────────────────────────────────────────────────────────
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});