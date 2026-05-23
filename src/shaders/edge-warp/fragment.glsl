uniform sampler2D tDiffuse;
uniform float     uAmount; // 0 idle → 1 full scroll
uniform float     uTime;
uniform float     uActive;

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
  vec2 i1  = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy  -= i1;
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
  g.x  = a0.x  * x0.x   + h.x  * x0.y;
  g.yz = a0.yz * x12.xz  + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// ── layered simplex fbm ───────────────────────────────────────────────────────
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p  = p * 2.1 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;  // range ≈ -1 → +1
}

void main() {
  float t = uTime * 0.2;

  // ── X-band mask: active only in [0, 0.2] and [0.8, 1.0] ─────────────────
  // map each band to 0→1 then smooth
  float leftBand  = 1.0 - smoothstep(0.0, 0.4, vUv.x);   // 1 at x=0, 0 at x=0.2
  float rightBand = smoothstep(0.6, 1.0, vUv.x);          // 0 at x=0.8, 1 at x=1.0
  float xMask = max(leftBand, rightBand);
  xMask = pow(xMask, 3.0) * 3.0; // sharpen slightly

  // ── Y-mask: grows toward top and bottom edges ─────────────────────────────
  // float ey    = abs(vUv.y - 0.5) * 2.0;  // 0 = vertical centre, 1 = top/bottom
  // float yMask = smoothstep(0.0, 1.0, ey); // gentle full-height gradient
  // yMask = pow(yMask, 0.7);               // bias toward edges

  // combined mask — corner regions get maximum warp
  // float mask = xMask * (0.3 + yMask * 0.7);
  float mask = xMask;

  // ── noise coords — different speeds on x/y for organic drift ─────────────
  vec2 noiseUV = vUv * 1000.0 + vec2(t * (step(vUv.x,.5) - .5) / .5,0.0) * 10.0;

  // two independent noise fields for dx and dy
  float dx = fbm(noiseUV + vec2(0.0,  0.0)) * .1;
  float dy = fbm(noiseUV + vec2(5.3,  3.1)) * .1;
  // float base = 0.0;
  // base += step(vUv.x,.5);
  // float theta = base + snoise(noiseUV) * 1.0 * 3.1415926;
  // float dx = cos(theta) * .3;
  // float dy = cos(base) * .1;

  // ── total displacement magnitude ──────────────────────────────────────────
  // idle: very subtle living warp; scroll: grows noticeably
  // float amt = uAmount * mask;

  float maskY = max((1.0 - abs(vUv.y - .5) / .2),0.0);

  vec2 warpedUV = vUv + vec2(dx, dy) * mask * maskY * uActive;

  // pure UV sample — zero colour modification
  gl_FragColor = texture2D(tDiffuse, warpedUV);


  // gl_FragColor = vec4(warpedUV,mask,1.0);
  // gl_FragColor = vec4(maskY,maskY,maskY,1.0);
  // gl_FragColor = vec4(mask,mask,mask,1.0);

}
