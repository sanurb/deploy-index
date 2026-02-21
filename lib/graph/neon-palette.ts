import { Color } from "three";

/**
 * Neon palette — 8 restrained hues mapped deterministically to owner/kind.
 *
 * Rules:
 *  - Most nodes stay dim (brightness ~0.12); only focus/hover/selected glow.
 *  - White is NEVER a node color — reserved for packets and micro-accents.
 *  - Additive blending means darker color = more transparent visually.
 *  - Bloom picks up anything above ~0.4 brightness.
 */

const NEON_HUES: readonly Color[] = [
  new Color(0x00e5ff), // cyan
  new Color(0xff00e5), // magenta
  new Color(0x8b5cf6), // violet
  new Color(0x84cc16), // lime
  new Color(0xf59e0b), // amber
  new Color(0x3b82f6), // electric blue
  new Color(0xec4899), // hot pink
  new Color(0x14b8a6), // teal
];

const neonCache = new Map<string, Color>();

/** Deterministic neon hue from a colorKey (owner hash). */
export function neonColorFromKey(colorKey: string): Color {
  if (!colorKey) return NEON_HUES[0].clone();
  const cached = neonCache.get(colorKey);
  if (cached) return cached.clone();

  let hash = 0;
  for (const ch of colorKey) {
    hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  }
  const base = NEON_HUES[Math.abs(hash) % NEON_HUES.length];
  neonCache.set(colorKey, base);
  return base.clone();
}

/** Scale a neon color's brightness for additive blending. */
export function scaledNeon(color: Color, brightness: number): Color {
  return color.clone().multiplyScalar(brightness);
}

/** Neon color as CSS hex string for DOM elements. */
export function neonHex(colorKey: string): string {
  return `#${neonColorFromKey(colorKey).getHexString()}`;
}

// Scene constants — Vercel/Linear-style dark base
export const NEON_BG = 0x05070b;
export const NEON_BG_CSS = "#05070B";
export const NEON_BG_DEEP = 0x0b1020;
export const NEON_BG_DEEP_CSS = "#0B1020";
export const NEON_FOG = 0x070a12;
