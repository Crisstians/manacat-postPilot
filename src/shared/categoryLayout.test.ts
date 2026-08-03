import { describe, expect, it } from "vitest";
import { categoryShowsProductPlate, categoryUsesSize } from "./categoryLayout.js";

describe("categoryLayout", () => {
  it("enables size and product plate only for gresie and faianta", () => {
    expect(categoryUsesSize("gresie")).toBe(true);
    expect(categoryUsesSize("faianta")).toBe(true);
    expect(categoryShowsProductPlate("gresie")).toBe(true);
    expect(categoryShowsProductPlate("faianta")).toBe(true);

    expect(categoryUsesSize("vopsea")).toBe(false);
    expect(categoryUsesSize("parchet")).toBe(false);
    expect(categoryUsesSize("adezivi")).toBe(false);
    expect(categoryUsesSize("produs-general")).toBe(false);
    expect(categoryShowsProductPlate("parchet")).toBe(false);
  });
});
