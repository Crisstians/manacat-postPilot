/**
 * Randare internă (supersampling). Înainte de Facebook, `prepareForFacebook`
 * coboară la latura lungă 2048 + sharpen — ca Facebook să nu facă downscale agresiv.
 */
export const EXPORT_PIXEL_RATIO = 2;
export const EXPORT_OUTPUT_SCALE = 2;

export const exportOutputSize = (templateWidth: number, templateHeight: number) => ({
  width: Math.round(templateWidth * EXPORT_OUTPUT_SCALE),
  height: Math.round(templateHeight * EXPORT_OUTPUT_SCALE),
});
