import * as THREE from "three";
import { Mesh, ShaderMaterial } from "three";
import glossy from "./shaders/background/gradients/glossy.glsl";
import chroma from "./shaders/background/gradients/chroma.glsl";
import chromaV2 from "./shaders/background/gradients/chroma.v2.glsl";
import marsh from "./shaders/background/gradients/marsh.glsl";

const vertexShader = /*glsl*/ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = marsh;

export const GetBackgroundMesh = ({
  width: SceneWidth,
  height: SceneHeight,
}) => {
  const background = new Mesh(
    new THREE.PlaneGeometry(SceneWidth, SceneHeight, 1, 1), // no need for segments on a flat bg
    new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
        uVelocity: { value: 0 },
        maxVelocity: { value: 0 },
      },
      vertexShader,
      fragmentShader,
    }),
  );

  //   background.position.z = -0.1; // push just behind cards
  return background;
};
