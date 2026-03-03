export const designTokens = {
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
  },
  typography: {
    h1: { size: 32, lineHeight: 40, weight: 700 },
    h2: { size: 24, lineHeight: 32, weight: 600 },
    h3: { size: 20, lineHeight: 28, weight: 600 },
    h4: { size: 18, lineHeight: 26, weight: 600 },
    body: { size: 14, lineHeight: 22, weight: 400 },
    small: { size: 13, lineHeight: 20, weight: 400 },
    caption: { size: 12, lineHeight: 18, weight: 500 },
  },
  radii: {
    input: 8,
    button: 10,
    card: 12,
    modal: 16,
    pill: 999,
  },
} as const;

export type DesignTokens = typeof designTokens;
