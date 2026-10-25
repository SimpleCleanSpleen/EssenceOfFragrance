// A little burst of hearts and sparkles. Skipped when reduced motion is preferred.

import { prefersReducedMotion } from './util.js';

const BITS = ['♥', '✦', '★', '♡', '✧', '❀'];
const COLORS = ['#FF5FA2', '#C9B6FF', '#A8D8FF', '#FFB3D4', '#8E44C9', '#FFD6E8'];

export function confetti(count = 36) {
  if (prefersReducedMotion()) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.textContent = BITS[i % BITS.length];
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 220;
    s.style.setProperty('--x', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--y', `${Math.sin(angle) * dist - 120}px`);
    s.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    s.style.color = COLORS[i % COLORS.length];
    s.style.fontSize = `${14 + Math.random() * 18}px`;
    s.style.animationDelay = `${Math.random() * 120}ms`;
    layer.appendChild(s);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1800);
}
