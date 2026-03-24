uniform float uTime;
uniform float uVelocity;
uniform float maxVelocity;
uniform vec2 uResolution;
varying vec2 vUv;

// --- Simplex Noise ---
vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
}
vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
    vec2 uv = (vUv * uResolution - 0.5 * uResolution) / uResolution.y;

    // --- Marsh Ember palette ---
    vec3 dark1 = vec3(0.188, 0.149, 0.110); // #30261c
    vec3 dark2 = vec3(0.251, 0.220, 0.192); // #403831
    vec3 teal1 = vec3(1., 84., 210.) / 255.; // #0b8185
    vec3 teal2 = vec3(26., 116., 120.) / 255.; // #1f5f61

    float t = uTime * .2;

    // layered noise fields
    float n1 = snoise(vec3(uv * 1.2 + t, t * 1.7));
    float n2 = snoise(vec3(uv * 2.4 - t * 0.5, t * 0.3 + 1.5));
    float n3 = snoise(vec3(uv * 0.6 + vec2(t * 0.3, -t * 0.2), t * 0.15 + 3.0));

    // slow vertical drift — teal rises from bottom
    float vertical = smoothstep(-0.8, 0.8, uv.y + n3 * 0.4) * 1.3 ;
    vertical += snoise(vec3(vertical + uv.x,1.0 - vertical,t));

    // ember pulse — warm dark core in the center
    float dist = snoise(vec3(length(uv) * .10,length(uv) * -.10,t * .1));
    float ember = smoothstep(0.9, 0.0, dist + n1 * 0.3);

    // ripple between teal tones
    float ripple = smoothstep(-1.0, 1.0, n2 + n1 * 0.5);

    // build up color in layers
    vec3 col = dark1;                                        // base
    col = mix(col, dark2, smoothstep(0.0, 1.0, n1 * 0.5 + 0.5));   // warm grain
    col = mix(col, teal2, smoothstep(0.2, 0.8, vertical));          // teal rise
    col = mix(col, teal1, smoothstep(0.4, 0.9, vertical + ripple * 0.1)); // bright teal peak
    col = mix(col, dark1 * 0.6, ember * 0.7);               // ember core darkening
    col = mix(col, dark2, smoothstep(0.6, 1.0, dist));      // edge vignette

    // subtle high freq noise grain
    float grain = snoise(vec3(uv * 300.0, t * 3.0)) * 0.03;
    col += grain * .5 * abs(uVelocity / maxVelocity);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}