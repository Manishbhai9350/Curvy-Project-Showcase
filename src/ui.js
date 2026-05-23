import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
gsap.registerPlugin(SplitText);

// ─── PROJECT DATA ─────────────────────────────────────────────────────────────
export const PROJECTS = [
  {
    index:    "01",
    image:    "/images/toWEBP/snapshot-1.webp",
    title:    "Forma",
    subtitle: "Brand Identity & Motion",
    desc:     "A full visual identity system for a next-generation architecture firm. Typeface, spatial grid, motion language.",
    tags:     ["Branding", "Motion", "Print"],
    year:     "2024",
  },
  {
    index:    "02",
    image:    "/images/toWEBP/snapshot-2.webp",
    title:    "Veil",
    subtitle: "Digital Experience",
    desc:     "An immersive web experience for a luxury fragrance house. Shader-driven product reveal, spatial audio.",
    tags:     ["WebGL", "Creative Dev", "UX"],
    year:     "2024",
  },
  {
    index:    "03",
    image:    "/images/toWEBP/snapshot-3.webp",
    title:    "Stratum",
    subtitle: "Visual Direction",
    desc:     "Campaign direction for an independent fashion label. Raw materiality meets digital precision.",
    tags:     ["Art Direction", "Campaign", "3D"],
    year:     "2023",
  },
  {
    index:    "04",
    image:    "/images/toWEBP/snapshot-4.webp",
    title:    "Pulse",
    subtitle: "Interactive Installation",
    desc:     "A data-driven generative installation for a music festival. Real-time audio reactive visuals.",
    tags:     ["Installation", "Generative", "Audio"],
    year:     "2023",
  },
  {
    index:    "05",
    image:    "/images/toWEBP/snapshot-5.webp",
    title:    "Crest",
    subtitle: "Product & Identity",
    desc:     "Brand system and packaging design for a precision hardware startup. Engineered minimalism.",
    tags:     ["Product", "Packaging", "Identity"],
    year:     "2023",
  },
  {
    index:    "06",
    image:    "/images/toWEBP/snapshot-6.webp",
    title:    "Liminal",
    subtitle: "Web & Motion",
    desc:     "Portfolio and case study platform for a creative studio. Scroll-driven narrative, bespoke transitions.",
    tags:     ["Web", "Motion", "Dev"],
    year:     "2024",
  },
  {
    index:    "07",
    image:    "/images/toWEBP/snapshot-7.webp",
    title:    "Obsidian",
    subtitle: "Campaign & Photography",
    desc:     "Visual campaign for a dark luxury skincare brand. High contrast editorial photography meets motion typography.",
    tags:     ["Campaign", "Photo", "Typography"],
    year:     "2024",
  },
  {
    index:    "08",
    image:    "/images/toWEBP/snapshot-8.webp",
    title:    "Drift",
    subtitle: "Spatial Interface",
    desc:     "An experimental 3D interface for a music streaming concept. Physics-driven navigation through sonic space.",
    tags:     ["3D", "UI/UX", "Audio"],
    year:     "2024",
  },
  {
    index:    "09",
    image:    "/images/toWEBP/snapshot-9.webp",
    title:    "Verdant",
    subtitle: "Brand & Packaging",
    desc:     "Complete brand world for an organic wellness label. Earthy materiality, hand-drawn systems, print production.",
    tags:     ["Branding", "Packaging", "Print"],
    year:     "2023",
  },
  {
    index:    "10",
    image:    "/images/toWEBP/snapshot-10.webp",
    title:    "Hollow",
    subtitle: "Interactive Film",
    desc:     "A branching narrative web experience for an independent film studio. Real-time shader transitions between scenes.",
    tags:     ["WebGL", "Narrative", "Film"],
    year:     "2025",
  },
  {
    index:    "11",
    image:    "/images/toWEBP/snapshot-11.webp",
    title:    "Axiom",
    subtitle: "Identity & Motion",
    desc:     "Brand identity and motion system for a fintech startup. Precision geometry, kinetic logomark, design tokens.",
    tags:     ["Identity", "Motion", "Fintech"],
    year:     "2025",
  },
];

// ─── BUILD DOM ────────────────────────────────────────────────────────────────
export function buildUI() {
  // ── loader lives on body directly, outside #ui's mix-blend-mode layer ────────
  const loaderEl = document.createElement("div");
  loaderEl.className = "loader";
  loaderEl.innerHTML = `
    <div class="loader-bar"><div class="loader-fill"></div></div>
    <span class="loader-label">Loading</span>
  `;
  document.body.appendChild(loaderEl);

  // ── everything else goes in #ui (blend layer) ─────────────────────────────
  const root = document.getElementById("ui");
  root.innerHTML = `
    <nav>
      <div class="nav-left">
        <span class="studio-name">Studio —</span>
        <span class="studio-sub">Visual Direction & Design</span>
      </div>
      <div class="nav-right">
        <a href="#">Projects</a>
        <a href="#">Play</a>
        <a href="#">About</a>
      </div>
    </nav>

    <div class="content-wrap">
      ${PROJECTS.map((p, i) => `
        <div class="project-slide" data-index="${i}">
          <div class="project-meta">
            <span class="project-index">${p.index} —</span>
            <span class="project-year">${p.year}</span>
          </div>
          <div class="title-clip">
            <h1 class="project-title">${p.title}</h1>
          </div>
          <p class="project-subtitle">${p.subtitle}</p>
          <p class="project-desc">${p.desc}</p>
          <div class="project-bottom">
            <div class="project-tags">
              ${p.tags.map(t => `<span class="tag">${t}</span>`).join("")}
            </div>
            <a href="#" class="view-link">View Project →</a>
          </div>
        </div>
      `).join("")}
    </div>

    <div class="bottom-bar">
      <div class="counter">
        <span class="counter-current">01</span>
        <span class="counter-sep">/</span>
        <span class="counter-total">0${PROJECTS.length}</span>
      </div>
      <div class="scroll-hint">
        <span class="hint-arrow">↓</span>
        <span class="hint-text">Scroll to explore</span>
      </div>
    </div>
  `;

  // SplitText every slide upfront
  document.querySelectorAll(".project-title").forEach(el => {
    el._split = new SplitText(el, { type: "chars" });
  });
  document.querySelectorAll(".project-subtitle").forEach(el => {
    el._split = new SplitText(el, { type: "lines" });
  });
  document.querySelectorAll(".project-desc").forEach(el => {
    el._split = new SplitText(el, { type: "lines" });
  });

  // hide all slides + nav + bottom bar until loader done
  gsap.set(".project-slide", { autoAlpha: 0 });
  gsap.set("nav, .bottom-bar", { autoAlpha: 0 });

  // set all chars/lines to their OFF positions immediately
  document.querySelectorAll(".project-slide").forEach(slide => _resetSlide(slide));
}

// ─── LOADER ───────────────────────────────────────────────────────────────────
export function runLoader(onComplete) {
  const loader = document.querySelector(".loader");
  const fill   = document.querySelector(".loader-fill");
  const label  = document.querySelector(".loader-label");

  const tl = gsap.timeline();

  tl.to(fill, {
    scaleX: 1,
    duration: 1.4,
    ease: "power2.inOut",
    transformOrigin: "left center",
  })
  .to(label, { opacity: 0, duration: 0.2 }, "<1.0")
  .to(loader, {
    autoAlpha: 0,
    duration: 0.4,
    ease: "power2.in",
    onComplete: () => {
      loader.style.display = "none"; // fully remove from paint
      gsap.to("nav",        { autoAlpha: 1, y: 0,   duration: 0.6, ease: "power2.out" });
      gsap.to(".bottom-bar",{ autoAlpha: 1,          duration: 0.6, delay: 0.1, ease: "power2.out" });
      if (onComplete) onComplete();
    },
  });
}

// ─── STATE ────────────────────────────────────────────────────────────────────
let currentSlide   = 0;
let activeTl       = null;
let isAnimatingOut = false;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function _getEls(slide) {
  return {
    title:    slide.querySelector(".project-title"),
    subtitle: slide.querySelector(".project-subtitle"),
    desc:     slide.querySelector(".project-desc"),
    tags:     slide.querySelectorAll(".tag"),
    meta:     slide.querySelector(".project-meta"),
    viewLink: slide.querySelector(".view-link"),
  };
}

function _resetSlide(slide) {
  const { title, subtitle, desc, tags, meta, viewLink } = _getEls(slide);
  gsap.set(title._split.chars,    { y: "105%", opacity: 1 });
  gsap.set(subtitle._split.lines, { y: "24px", opacity: 0 });
  gsap.set(desc._split.lines,     { y: "20px", opacity: 0 });
  gsap.set([...tags, viewLink],   { opacity: 0, y: "8px" });
  gsap.set(meta,                  { opacity: 0 });
}

// ─── KILL / ANIMATE OUT ───────────────────────────────────────────────────────
export function killCurrentContent() {
  if (isAnimatingOut) return;
  const slide = document.querySelector(`.project-slide[data-index="${currentSlide}"]`);
  if (!slide || slide.style.visibility === "hidden") return;

  isAnimatingOut = true;
  if (activeTl) { activeTl.kill(); activeTl = null; }

  const { title, subtitle, desc, tags, meta, viewLink } = _getEls(slide);

  const tl = gsap.timeline({
    onComplete: () => gsap.set(slide, { autoAlpha: 0 }),
  });

  tl.to(meta, { opacity: 0, duration: 0.18, ease: "power2.in" })
    .to(title._split.chars, {
      y: "105%", duration: 0.35,
      stagger: { each: 0.012, from: "end" },
      ease: "power2.in",
    }, "<0.02")
    .to(subtitle._split.lines, {
      y: "24px", opacity: 0, duration: 0.25, stagger: 0.04, ease: "power2.in",
    }, "<0.04")
    .to(desc._split.lines, {
      y: "20px", opacity: 0, duration: 0.22, stagger: 0.03, ease: "power2.in",
    }, "<0.02")
    .to([...tags, viewLink], {
      opacity: 0, y: "8px", duration: 0.18, stagger: 0.03, ease: "power2.in",
    }, "<");
}

// ─── TRANSITION IN ────────────────────────────────────────────────────────────
export function transitionTo(nextIdx) {
  const nextSlide = document.querySelector(`.project-slide[data-index="${nextIdx}"]`);
  if (nextIdx === currentSlide && nextSlide?.style.visibility !== "hidden") return;

  isAnimatingOut = false;

  const prevSlide = document.querySelector(`.project-slide[data-index="${currentSlide}"]`);
  if (prevSlide && prevSlide !== nextSlide) {
    if (activeTl) { activeTl.kill(); activeTl = null; }
    gsap.set(prevSlide, { autoAlpha: 0 });
  }

  currentSlide = nextIdx;

  if (nextSlide) {
    _resetSlide(nextSlide);
    gsap.set(nextSlide, { autoAlpha: 1 });
  }

  _animateIn(nextIdx);

  const counterEl = document.querySelector(".counter-current");
  gsap.to(counterEl, {
    y: "-100%", opacity: 0, duration: 0.15, ease: "power2.in",
    onComplete: () => {
      counterEl.textContent = String(nextIdx + 1).padStart(2, "0");
      gsap.fromTo(counterEl,
        { y: "100%", opacity: 0 },
        { y: "0%",   opacity: 1, duration: 0.25, ease: "power2.out" }
      );
    },
  });
}

// ─── ANIMATE IN ───────────────────────────────────────────────────────────────
function _animateIn(idx, delay = 0.08) {
  const slide = document.querySelector(`.project-slide[data-index="${idx}"]`);
  if (!slide) return;

  const { title, subtitle, desc, tags, meta, viewLink } = _getEls(slide);

  if (activeTl) activeTl.kill();

  activeTl = gsap.timeline({ delay });

  activeTl
    .to(meta, { opacity: 1, duration: 0.35, ease: "power2.out" })
    .to(title._split.chars, {
      y: "0%", duration: 0.65, stagger: 0.016, ease: "power3.out",
    }, "<0.04")
    .to(subtitle._split.lines, {
      y: "0px", opacity: 1, duration: 0.45, stagger: 0.05, ease: "power2.out",
    }, "<0.18")
    .to(desc._split.lines, {
      y: "0px", opacity: 1, duration: 0.4, stagger: 0.04, ease: "power2.out",
    }, "<0.08")
    .to([...tags, viewLink], {
      opacity: 1, y: "0px", duration: 0.3, stagger: 0.04, ease: "power2.out",
    }, "<0.06");
}

// ─── FIRST LOAD ───────────────────────────────────────────────────────────────
export function firstAnimateIn() {
  const slide = document.querySelector(`.project-slide[data-index="0"]`);
  if (!slide) return;
  _resetSlide(slide);
  gsap.set(slide, { autoAlpha: 1 });
  _animateIn(0, 0.2);
}