/**
 * Spacing scale (SPEC §9), in layout units.
 *
 * One numeric scale for slot insets, gaps and shape padding throughout a
 * VectorUI scene.
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type SpaceToken = keyof typeof space;
