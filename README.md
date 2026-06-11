# Scroll-Driven Portfolio Card Effect

## What this effect is
This project is a cinematic portfolio experience where a row of project cards feels like a physical strip of images that can be scrolled, bent, and gently warped by the cursor. The core idea is to make the interface feel tactile and alive rather than flat and static.

The effect combines:
- a scroll-driven 3D plane gallery
- per-plane deformation that makes cards bend as they move
- a mouse-reactive post-processing warp that pushes the image around the cursor
- procedural edge noise that gives the composition a subtle organic, cinematic texture

## Core ideation
The effect is built around a simple visual metaphor:
- a horizontal sequence of project cards behaves like a ribbon or film strip
- movement should feel like the strip is being physically pulled or flexed
- interaction should feel reactive and expressive, not just decorative

The result is a portfolio UI that feels more like a living scene than a traditional grid or slider.

## How the effect is built
The implementation is centered in [src/main.js](src/main.js) and uses Three.js plus a custom shader pipeline.

### 1. The scene setup
- A transparent WebGL canvas is created with Three.js
- A perspective camera is used to give the cards a slight depth feel
- A post-processing composer is added so the final image can be warped after the scene is rendered

### 2. The cards are planes
Each project is rendered as a plane mesh with an image texture applied through a custom shader material.
- the planes are arranged horizontally
- each card has its own shader uniforms for motion and expansion state
- the cards are scaled and positioned as the user scrolls and selects one

### 3. Scroll logic drives motion
The scene tracks:
- a target scroll position
- a smoothed current scroll value
- velocity based on how fast the user scrolls or drags

That velocity is fed into the shader so the cards react with motion intensity instead of simply moving linearly.

## Core logic of the plane bends
Each plane is deformed in the vertex shader using a simple but expressive rule:
- the original position of each vertex is read
- the vertex is offset in the Z direction based on scroll velocity
- a sine-based bend is applied across the plane using screen-space UVs
- the amount of bend increases when the card is active and decreases when it settles

In practical terms, this makes the card feel like it is being gently flexed as it moves, creating a subtle wave or arching motion.

The important part is that the bend is not random. It is driven by the scroll state and the card’s expansion state, so it stays coherent and readable.

## Core logic of the mouse interaction
The mouse effect is applied in the post-processing shader rather than directly on the geometry.

The fragment shader:
- samples the rendered scene
- converts the cursor position into UV space
- computes how far each pixel is from the mouse
- applies a smooth push away from the cursor when the pointer is near

This creates the feeling that the image is being gently pushed and pulled by the cursor, almost like a soft magnetic distortion.

## Core logic of the edge noise
The edge effect is created by warping the rendered image using procedural noise.

The shader:
- creates a mask for the left and right edges of the image
- applies a noise-driven offset to those areas
- uses multiple fbm/simplex-style noise layers for a richer texture
- makes the warp stronger near the outer edges
- slightly reduces color intensity in those warped regions to make the effect feel more organic

This is what gives the composition its subtle grainy, cinematic, almost film-like edge shimmer.

## Why it feels good
The effect works because it layers three different motion systems together:
1. a grounded scroll system that gives structure
2. a geometry bend that adds physicality
3. a post-process warp that adds a sense of life and responsiveness

That combination makes the whole experience feel less like a static website and more like a handcrafted digital object.

## Files involved
- [src/main.js](src/main.js) — scene setup, card creation, scroll behavior, expand animation, mouse input
- [src/shaders/edge-warp/fragment.glsl](src/shaders/edge-warp/fragment.glsl) — mouse repulsion and edge noise
- [src/shaders/edge-warp/vertex.glsl](src/shaders/edge-warp/vertex.glsl) — pass-through vertex stage for the post-process pass
