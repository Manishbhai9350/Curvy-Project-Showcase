uniform sampler2D tDiffuse;
uniform float     uAmount;
uniform float     uTime;
uniform float     uActive;
uniform vec2      uMouse;      // smoothed mouse in UV space (0→1, Y flipped)
uniform vec2      uResolution;
uniform float     uScrollVelocity;


varying vec2 vUv;

// ── simplex noise ─────────────────────────────────────────────────────────────
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(
     0.211324865405187,
     0.366025403784439,
    -0.577350269189626,
     0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                         + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m  = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m * m * m;
  vec3 x  = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p  = p * 2.1 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  float t = uTime * 0.2;
  float ar = uResolution.x / uResolution.y; // aspect ratio for correct distance

  // ── edge warp (existing) ──────────────────────────────────────────────────
  float leftBand  = 1.0 - smoothstep(0.0, 0.4, vUv.x);
  float rightBand = smoothstep(0.6, 1.0, vUv.x);
  float xMask     = max(leftBand, rightBand);
  float mask      = pow(xMask, 3.0) * 3.0;

  vec2 noiseUV  = vUv * 1000.0 + vec2(t * (step(vUv.x, 0.5) - 0.5) / 0.5, 0.0) * 10.0;
  float scale = mix(1.0, 1000.0, xMask); // 1 → 5 stretch

  noiseUV.y -= 0.5;
  noiseUV.y *= scale;
  noiseUV.y += 0.5;

  float dx = fbm(noiseUV + vec2(0.0, 0.0)) * 0.1;
  float dy = fbm(noiseUV + vec2(5.3, 3.1)) * 0.1;

  float maskY    = max(1.0 - abs(vUv.y - 0.5) / 0.2, 0.0);
  vec2 warpedUV  = vUv + vec2(dx, dy) * mask * maskY * uActive;

  // ── mouse repulsion ───────────────────────────────────────────────────────
  // correct for aspect ratio so radius is circular in screen space
  vec2  toMouse     = warpedUV - uMouse;
  toMouse.x        *= ar;                      // stretch X by AR to make it circular

  float dist        = length(toMouse);

  float radius      = 0.1;                    // repulsion radius in UV space (tune this)
  float strength    = 0.12;                    // max push distance in UV (tune this)

  // smooth falloff: full push at dist=0, zero push at dist=radius
  float falloff     = 1.0 - smoothstep(0.0, radius, dist);
  falloff           = falloff * falloff * falloff;       // quadratic — sharper centre, soft edge

  // push direction: away from mouse
  vec2 pushDir      = normalize(toMouse / vec2(ar, 1.0)); // un-correct AR for UV space
  vec2 repulsion    = pushDir * falloff * strength;

  // apply repulsion — works on top of edge warp, so noised regions get pushed too
  warpedUV         -= repulsion;

  // ── colour decay on warped edges ──────────────────────────────────────────
  vec4 col       = texture2D(tDiffuse, warpedUV);
  float colorDecay = max(smoothstep(1.0, 0.1, mask / 6.0), 0.1);
  if (uActive <= 0.5) colorDecay = 1.0;
  col           *= colorDecay;

  // col = vec4(repulsion,0.0,0.0);

  // col *= min(dist / radius,1.0);

  gl_FragColor   = col;
}