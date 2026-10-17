"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "./Brand";

const SEEN_KEY = "mv-intro-seen";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Whether to play the intro: once per browser session, never with reduced motion.
 * Returns [show, markDone].
 */
export function useIntroOnce(): [boolean, () => void] {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // Storage blocked: treat as seen rather than replaying on every page.
      seen = true;
    }
    if (!seen && !prefersReducedMotion()) setShow(true);
  }, []);
  const done = useCallback(() => {
    setShow(false);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Ignore.
    }
  }, []);
  return [show, done];
}

/**
 * The brand intro: the real logo blooms in on the lavender backdrop (scale + soft blur), two rings
 * ripple out, then the overlay fades away. About 1.2s. A tap, click or Esc skips it at once.
 * GSAP is loaded only when the intro plays.
 */
export default function Intro({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const rings = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const killRef = useRef<() => void>(() => {});

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    killRef.current();
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    let cancelled = false;
    import("gsap").then(({ gsap }) => {
      if (cancelled || !root.current || !logo.current || !rings.current) return;
      const tl = gsap.timeline({ onComplete: finish });
      tl.fromTo(rings.current.children, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 0.14, duration: 1, ease: "power2.out", stagger: 0.12 }, 0)
        .fromTo(logo.current, { scale: 0.86, opacity: 0, filter: "blur(6px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.75, ease: "power3.out" }, 0)
        .to(root.current, { opacity: 0, duration: 0.3, ease: "power1.in" }, "+=0.2");
      killRef.current = () => tl.kill();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
      killRef.current();
    };
  }, [finish]);

  return (
    <div
      ref={root}
      role="presentation"
      onPointerDown={finish}
      className="fixed inset-0 z-dialog grid place-items-center overflow-hidden bg-lavender px-10"
      style={{ backgroundImage: "radial-gradient(120% 90% at 85% 0%, rgb(var(--mv-lavender-glow)) 0%, transparent 55%)" }}
    >
      <div ref={rings} aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="absolute h-72 w-72 rounded-full border border-primary opacity-0" />
        <span className="absolute h-96 w-96 rounded-full border border-primary opacity-0" />
      </div>
      <div ref={logo} className="relative w-72 max-w-full opacity-0">
        <Logo priority className="max-w-none" />
      </div>
      <button
        type="button"
        onClick={finish}
        className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] rounded-full border border-primary/40 bg-surface/60 px-3 py-1 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft"
      >
        Skip
      </button>
    </div>
  );
}
