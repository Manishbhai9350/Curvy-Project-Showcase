import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { Clock } from "three";
import { GetSceneBounds } from "./utils";
import { ShaderMaterial } from "three";
import { GetBackgroundMesh } from "./background";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import GUI from "lil-gui";

const { PI } = Math;
const canvas = document.querySelector("canvas");
canvas.width = innerWidth;
canvas.height = innerHeight;

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});

renderer.setClearColor(0x000000);

const camera = new THREE.PerspectiveCamera(
  70,
  innerWidth / innerHeight,
  1,
  1000,
);
camera.position.z = 5;

const Manager = new THREE.LoadingManager();
const Draco = new DRACOLoader(Manager);
const GLB = new GLTFLoader(Manager);
const TextureLoader = new THREE.TextureLoader(Manager);
Draco.setDecoderPath("/draco/");
Draco.setDecoderConfig({ type: "wasm" });
GLB.setDRACOLoader(Draco);

const { width: SceneWidth, height: SceneHeight } = GetSceneBounds(
  renderer,
  camera,
);

// const gui = new GUI();

const CONFIG = {
  width: 3.5,
  height: 2,
  spacing: 3.5 + 0.5,
  friction: 0.8,
  maxVelocity: 24,
};

const clampVelocity = (v) =>
  Math.max(-CONFIG.maxVelocity, Math.min(CONFIG.maxVelocity, v));

const background = GetBackgroundMesh({
  width: SceneWidth,
  height: SceneHeight,
});
background.material.uniforms.uResolution.value.set(innerWidth, innerHeight);
background.material.uniforms.maxVelocity.value = CONFIG.maxVelocity;

scene.add(background);

const Cards = [];
for (let i = 0; i < 10; i++) {
  const cardMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0,
    metalness: 0,
    transmission: .8,
    thickness: 1,
    ior: 1.5,
  });

  cardMaterial.uniforms = {
    uVelocity: { value: 0 },
    uPositionX: { value: 0 },
    maxVelocity: { value: CONFIG.maxVelocity },
  };

  cardMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uVelocity = cardMaterial.uniforms.uVelocity;
    shader.uniforms.maxVelocity = cardMaterial.uniforms.maxVelocity;
    shader.uniforms.uPositionX = cardMaterial.uniforms.uPositionX;

    shader.vertexShader = shader.vertexShader.replace(
      `#include <common>`,
      `#include <common>
      uniform float uVelocity;
      uniform float maxVelocity;
      uniform float uPositionX;`,
    );

    shader.vertexShader = shader.vertexShader.replace(
      `#include <project_vertex>`,
      `#include <project_vertex>

      float velocityProg = uVelocity / maxVelocity;
      float worldX = uPositionX + transformed.x;
      float dist = abs(worldX);
      float warpStrength = 1.0 - smoothstep(0.0, 5.0, dist);
      warpStrength = warpStrength * warpStrength;
      transformed.x += sin(uv.y * PI) * velocityProg;
      transformed.z += warpStrength * 2.5 * abs(velocityProg);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);`,
    );

    cardMaterial.userData.shader = shader;
  };

  const card = new THREE.Mesh(
    // new THREE.BoxGeometry(CONFIG.width, CONFIG.height, 0.1, 100, 100, 100),
    new THREE.PlaneGeometry(CONFIG.width, CONFIG.height, 100, 100),
    cardMaterial,
  );

  Cards.push(card);
  scene.add(card);
}

// new OrbitControls(camera,canvas)

// --- Scroll state ---
let offset = 0;
let velocity = 0;

// --- Drag state ---
const drag = {
  active: false,
  lastX: 0,
  lastTime: 0,
  rawVelocity: 0,
};

function onPointerDown(e) {
  drag.active = true;
  const clientX = e.clientX ?? e.touches?.[0].clientX;
  drag.lastX = clientX;
  drag.lastTime = performance.now();
  drag.rawVelocity = 0;
  velocity = 0;
}

function onPointerMove(e) {
  if (!drag.active) return;
  const clientX = e.clientX ?? e.touches?.[0].clientX;
  const now = performance.now();
  const dt = (now - drag.lastTime) / 1000;

  const dxPx = drag.lastX - clientX;
  const dxWorld = (dxPx / innerWidth) * SceneWidth;

  offset += dxWorld;
  if (dt > 0) drag.rawVelocity = (dxWorld / dt) * 10;

  drag.lastX = clientX;
  drag.lastTime = now;
}

function onPointerUp() {
  if (!drag.active) return;
  drag.active = false;
  velocity = clampVelocity(drag.rawVelocity);
}

canvas.addEventListener("mousedown", onPointerDown);
canvas.addEventListener("mousemove", onPointerMove);
canvas.addEventListener("mouseup", onPointerUp);
canvas.addEventListener("mouseleave", onPointerUp);
canvas.addEventListener("touchstart", (e) => onPointerDown(e.touches[0]), {
  passive: true,
});
canvas.addEventListener("touchmove", (e) => onPointerMove(e.touches[0]), {
  passive: true,
});
canvas.addEventListener("touchend", onPointerUp);
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    velocity += (e.deltaY / innerHeight) * SceneWidth * 2;
    velocity = clampVelocity(velocity);
  },
  { passive: true },
);

// --- Animation loop ---
const clock = new Clock();
let PrevTime = clock.getElapsedTime();

function Animate() {
  const CurrentTime = clock.getElapsedTime();
  const DT = CurrentTime - PrevTime;
  PrevTime = CurrentTime;

  if (!drag.active) {
    velocity *= CONFIG.friction;
    offset += velocity * DT;
  }

  if (background) {
    background.material.uniforms.uTime.value = CurrentTime;
    background.material.uniforms.uVelocity.value +=
      (velocity - background.material.uniforms.uVelocity.value) * 0.08;
  }

  const totalWidth = Cards.length * CONFIG.spacing;
  const edge = SceneWidth / 2 + CONFIG.width / 2;

  Cards.forEach((card, i) => {
    let x = (i * CONFIG.spacing - offset) % totalWidth;
    if (x < -edge - CONFIG.width) x += totalWidth;
    if (x > edge + CONFIG.width) x -= totalWidth;
    card.position.x = x;
    const shader = card.material.userData.shader;
    if (shader) {
      shader.uniforms.uVelocity.value +=
        (velocity - shader.uniforms.uVelocity.value) * 0.08;
      shader.uniforms.uPositionX.value = x;
    }
  });

  renderer.render(scene, camera);
  requestAnimationFrame(Animate);
}

requestAnimationFrame(Animate);

// --- Resize ---
function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  renderer.setSize(innerWidth, innerHeight);
}

window.addEventListener("resize", resize);
