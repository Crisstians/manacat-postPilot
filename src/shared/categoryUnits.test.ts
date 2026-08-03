import { describe, expect, it } from "vitest";
import { unitForCategory } from "./categoryUnits.js";

describe("unitForCategory", () => {
  it("returns m² for gresie, faianta and parchet", () => {
    expect(unitForCategory("gresie")).toBe("m²");
    expect(unitForCategory("faianta")).toBe("m²");
    expect(unitForCategory("parchet")).toBe("m²");
  });

  it("returns buc for vopsea", () => {
    expect(unitForCategory("vopsea")).toBe("buc");
  });

  it("returns kg for adezivi", () => {
    expect(unitForCategory("adezivi")).toBe("kg");
  });

  it("returns buc for produs-general", () => {
    expect(unitForCategory("produs-general")).toBe("buc");
  });
});
