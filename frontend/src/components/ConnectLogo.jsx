/**
 * .connect Brand Logo System
 *
 * Variants:
 *   "wordmark"  — icon + ".connect" text  (navbar, sidebar, auth)
 *   "icon"      — icon only               (app icon, avatar, small placements)
 *   "favicon"   — ultra-compact icon      (16–32px)
 *
 * The icon concept: three nodes arranged in a tight triangle,
 * connected by signal arcs — communicating interconnection,
 * community, and real-time messaging without using a chat bubble.
 * The primary node pulses with a soft glow to suggest live presence.
 */

import React from "react";

// ─── Brand tokens ────────────────────────────────────────────────────────────
const C = {
  primary:  "#14B8A6",
  secondary:"#2DD4BF",
  accent:   "#5EEAD4",
  bg:       "#050816",
};

// ─── Core icon SVG (32 × 32 viewBox) ─────────────────────────────────────────
function IconMark({ size = 32, glow = true, className = "" }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label=".connect icon"
    >
      <defs>
        {/* Radial gradient for primary node */}
        <radialGradient id={`ng-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={C.accent}    stopOpacity="1" />
          <stop offset="100%" stopColor={C.primary}   stopOpacity="1" />
        </radialGradient>

        {/* Arc stroke gradient */}
        <linearGradient id={`ag-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={C.primary}   stopOpacity="0.9" />
          <stop offset="100%" stopColor={C.secondary} stopOpacity="0.4" />
        </linearGradient>

        {/* Glow filter */}
        {glow && (
          <filter id={`gf-${id}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}

        {/* Outer glow for primary node */}
        {glow && (
          <filter id={`nf-${id}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>

      {/*
        Three nodes:
          A — top-center    (16, 5.5)   primary / "hub"
          B — bottom-left   (5.5, 24)   secondary
          C — bottom-right  (26.5, 24)  secondary

        Connection arcs curve outward slightly to feel organic,
        not mechanical.
      */}

      {/* Arc A→B */}
      <path
        d="M 15.2 7.8 Q 6 12 7.2 22.2"
        stroke={`url(#ag-${id})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        filter={glow ? `url(#gf-${id})` : undefined}
      />

      {/* Arc A→C */}
      <path
        d="M 16.8 7.8 Q 26 12 24.8 22.2"
        stroke={`url(#ag-${id})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        filter={glow ? `url(#gf-${id})` : undefined}
      />

      {/* Arc B→C (base) */}
      <path
        d="M 7.8 24.5 Q 16 28.5 24.2 24.5"
        stroke={`url(#ag-${id})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        filter={glow ? `url(#gf-${id})` : undefined}
      />

      {/* Node B — bottom-left */}
      <circle cx="5.5" cy="24" r="2.6" fill={C.secondary} opacity="0.85" />

      {/* Node C — bottom-right */}
      <circle cx="26.5" cy="24" r="2.6" fill={C.secondary} opacity="0.85" />

      {/* Node A — primary hub (top, larger, glowing) */}
      {glow && (
        <circle
          cx="16" cy="5.5" r="5"
          fill={C.primary}
          opacity="0.18"
          filter={`url(#nf-${id})`}
        />
      )}
      <circle
        cx="16" cy="5.5" r="3.2"
        fill={`url(#ng-${id})`}
        filter={glow ? `url(#nf-${id})` : undefined}
      />

      {/* Signal dot on arc A→B midpoint — suggests live data */}
      <circle cx="10.2" cy="14.5" r="1.1" fill={C.accent} opacity="0.7" />

      {/* Signal dot on arc A→C midpoint */}
      <circle cx="21.8" cy="14.5" r="1.1" fill={C.accent} opacity="0.7" />
    </svg>
  );
}

// ─── App Icon (rounded square, for sidebar / avatar contexts) ────────────────
function AppIcon({ size = 36, className = "" }) {
  const id = React.useId().replace(/:/g, "");
  const r = size * 0.28; // corner radius
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label=".connect app icon"
    >
      <defs>
        <linearGradient id={`bg-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#0d2a26" />
          <stop offset="100%" stopColor="#071a18" />
        </linearGradient>
        <radialGradient id={`ng2-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={C.accent}   />
          <stop offset="100%" stopColor={C.primary}  />
        </radialGradient>
        <linearGradient id={`ag2-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={C.primary}   stopOpacity="0.95" />
          <stop offset="100%" stopColor={C.secondary} stopOpacity="0.5"  />
        </linearGradient>
        <filter id={`gf2-${id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feComposite in="SourceGraphic" in2="b" operator="over" />
        </filter>
      </defs>

      {/* Background tile */}
      <rect width="36" height="36" rx={r} fill={`url(#bg-${id})`} />
      {/* Subtle inner border */}
      <rect width="36" height="36" rx={r} fill="none"
        stroke="rgba(94,234,212,0.15)" strokeWidth="1" />

      {/* Arcs — scaled to 36×36 canvas, nodes shifted down slightly */}
      <path d="M 17.2 9.5 Q 7.5 14 8.8 25.5"
        stroke={`url(#ag2-${id})`} strokeWidth="1.6" strokeLinecap="round" fill="none"
        filter={`url(#gf2-${id})`} />
      <path d="M 18.8 9.5 Q 28.5 14 27.2 25.5"
        stroke={`url(#ag2-${id})`} strokeWidth="1.6" strokeLinecap="round" fill="none"
        filter={`url(#gf2-${id})`} />
      <path d="M 9.5 27 Q 18 31.5 26.5 27"
        stroke={`url(#ag2-${id})`} strokeWidth="1.6" strokeLinecap="round" fill="none"
        filter={`url(#gf2-${id})`} />

      {/* Secondary nodes */}
      <circle cx="7"  cy="27" r="2.8" fill={C.secondary} opacity="0.9" />
      <circle cx="29" cy="27" r="2.8" fill={C.secondary} opacity="0.9" />

      {/* Primary node glow halo */}
      <circle cx="18" cy="8" r="5.5" fill={C.primary} opacity="0.15"
        filter={`url(#gf2-${id})`} />
      {/* Primary node */}
      <circle cx="18" cy="8" r="3.4" fill={`url(#ng2-${id})`}
        filter={`url(#gf2-${id})`} />

      {/* Signal dots */}
      <circle cx="11.5" cy="17" r="1.2" fill={C.accent} opacity="0.75" />
      <circle cx="24.5" cy="17" r="1.2" fill={C.accent} opacity="0.75" />
    </svg>
  );
}

// ─── Favicon (16×16, ultra-minimal) ─────────────────────────────────────────
function Favicon({ size = 16, className = "" }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 16 16"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      className={className} aria-label=".connect favicon">
      <defs>
        <radialGradient id={`fng-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={C.accent}  />
          <stop offset="100%" stopColor={C.primary} />
        </radialGradient>
      </defs>
      {/* Three dots — minimal node representation */}
      <circle cx="8"  cy="2.5" r="2"   fill={`url(#fng-${id})`} />
      <circle cx="2"  cy="13" r="1.6"  fill={C.secondary} opacity="0.9" />
      <circle cx="14" cy="13" r="1.6"  fill={C.secondary} opacity="0.9" />
      {/* Connecting lines */}
      <line x1="7.2" y1="4.2" x2="3"   y2="11.6" stroke={C.primary}   strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
      <line x1="8.8" y1="4.2" x2="13"  y2="11.6" stroke={C.primary}   strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
      <line x1="3.6" y1="13" x2="12.4" y2="13"   stroke={C.secondary} strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

// ─── Wordmark (icon + text) ───────────────────────────────────────────────────
function Wordmark({ size = "md", glow = true, className = "" }) {
  const iconSize = size === "sm" ? 22 : size === "lg" ? 40 : 28;
  const textClass =
    size === "sm" ? "text-[0.95rem]" :
    size === "lg" ? "text-[1.5rem]"  :
                    "text-[1.15rem]";

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <IconMark size={iconSize} glow={glow} />
      <span className={`font-bold tracking-tight leading-none ${textClass}`}>
        <span style={{ color: C.accent }}>.</span>
        <span className="text-white">connect</span>
      </span>
    </div>
  );
}

// ─── Exports ─────────────────────────────────────────────────────────────────
export { IconMark, AppIcon, Favicon, Wordmark };
export default Wordmark;
