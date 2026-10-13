import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
if ("scrollRestoration" in history) history.scrollRestoration = "manual";   // the story always starts at beat one

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

// in-page links go through Lenis so the smooth scroll and the story stay in sync
document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
  const target = document.querySelector(a.getAttribute("href"));
  if (!target) return;
  e.preventDefault();
  lenis.scrollTo(target, { offset: a.getAttribute("href") === "#top" ? -9999 : 0, duration: 1.4 });
}));

// nav turns solid once the story is underway
lenis.on("scroll", ({ scroll }) => document.body.classList.toggle("scrolled", scroll > 80));

// three.js loads after the page text, so the poster and copy paint first
import("./stage.js").then(({ initStage }) => initStage({
  lenis,
  modelYaw: 0,
  beats: [
    { pos: [2.3, 1.55, 5.2], look: [-1.0, 1.0, 0.43], yaw: -0.35 },   // hero three-quarter, bottle right
    { pos: [1.35, 1.75, 2.0], look: [0.4, 1.42, -0.27], yaw: 0.6 },  // macro on collar and cap, bottle left
    { pos: [0, 1.05, 6.0], look: [-1.25, 1.0, 0], yaw: 1.7 },       // side profile, bottle right
    { pos: [-3.4, 5.0, 3.6], look: [0.55, 0.55, 0.5], yaw: 3.3 },    // from above, the water and ripples
    { pos: [3.6, 1.4, 5.4], look: [0.95, 1.0, -0.62], yaw: 6.0 },      // resting frame, bottle left
  ],
  hotspots: [
    { id: "cap", at: [0, 1.88, 0.13], normal: [0, 0.4, 1] },
    { id: "print", at: [0, 0.98, 0.39], normal: [0, 0, 1] },
    { id: "glass", at: [0.3, 0.55, 0.25], normal: [0.75, 0, 0.65] },
    { id: "base", at: [-0.27, 0.12, 0.28], normal: [-0.7, 0, 0.7] },
  ],
  lightModes: {
    morning: { exposure: 1.0, key: 2.2, keyColor: "#ffffff", rim: 70, warm: 50, fog: "#e9f0f8" },
    water:   { exposure: 1.04, key: 1.5, keyColor: "#e4eeff", rim: 140, warm: 15, fog: "#dce8f5" },
    golden:  { exposure: 1.06, key: 2.7, keyColor: "#ffe2c2", rim: 35, warm: 130, fog: "#f4ebe4" },
  },
})).catch(() => document.body.classList.add("stage-failed"));

// reveals: sections rise in softly as they enter
if (!REDUCED) {
  gsap.utils.toArray(".reveal").forEach((el) => {
    gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  });
}

// story copy: each beat fades in and out around its centre so only one is ever on screen
gsap.utils.toArray("#story .beat").forEach((beat, i) => {
  if (REDUCED) return;
  const tl = gsap.timeline({ scrollTrigger: { trigger: beat, start: "top 75%", end: "bottom 25%", scrub: true } });
  if (i === 0) tl.to(beat, { opacity: 1, duration: 0.6 });
  else tl.fromTo(beat, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 }).to(beat, { opacity: 1, duration: 0.4 });
  tl.to(beat, { opacity: 0, y: -40, duration: 0.3 });
});

// routine: morning / night
const flow = document.querySelector(".flow");
document.querySelectorAll("[data-time]").forEach((b) => {
  if (b.tagName !== "BUTTON") return;
  b.addEventListener("click", () => {
    flow.dataset.time = b.dataset.time;
    document.querySelectorAll("button[data-time]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });
});

// tilt on product photos (desktop only, at most 5 degrees)
if (matchMedia("(hover: hover) and (pointer: fine)").matches && !REDUCED) {
  document.querySelectorAll(".product img, .ritual__img img").forEach((img) => {
    const card = img.parentElement;
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(img, { rotateY: x * 5, rotateX: -y * 5, scale: 1.03, duration: 0.5, ease: "power2.out" });
    });
    card.addEventListener("pointerleave", () => gsap.to(img, { rotateY: 0, rotateX: 0, scale: 1, duration: 0.7 }));
  });
}

// the question form: the contact details are still placeholders, so it confirms on the page.
// Once a real inbox exists, see README for switching it to a mailto: or a form service.
const form = document.getElementById("ask");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  form.querySelectorAll("input, textarea, button").forEach((el) => (el.disabled = true));
  form.querySelector(".ask__done").hidden = false;
});

document.getElementById("year").textContent = new Date().getFullYear();

if (import.meta.env.DEV) { window.__lenis = lenis; window.__ST = ScrollTrigger; }
