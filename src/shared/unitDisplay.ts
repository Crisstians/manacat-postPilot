export const M2_UNIT_ICON_RELATIVE_PATH = "src/assets/unitati/m2Unitate.png";

export const isSquareMeterUnit = (unit: string): boolean => unit === "m²";

/** Text lângă preț: „lei” + icon pentru m², altfel „lei/L”, „lei/kg” etc. */
export const unitPriceSuffixText = (unit: string): string =>
  isSquareMeterUnit(unit) ? "lei" : `lei/${unit}`;
