export const glowColors = {
  neutral: "#E4E7EB",
  green: "#2EE59D",
  blue: "#00FFFF",
  pink: "#FF0080",
  orange: "#FF8000",
  danger: "#FF4D3D",
} as const;

export type GlowTone = keyof typeof glowColors;
