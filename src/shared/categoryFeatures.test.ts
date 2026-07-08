import { describe, expect, it } from "vitest";
import { featureOptionsForCategory, isValidFeatureForCategory } from "./categoryFeatures.js";

describe("categoryFeatures", () => {
  it("returns full gresie finish options list", () => {
    const options = featureOptionsForCategory("gresie");

    expect(options).toHaveLength(22);
    expect(options[0]).toBe("Matt");
    expect(options).toContain("Lucios");
    expect(options).toContain("Sculptat");
    expect(options).toContain("Cu efect 3D");
  });

  it("returns full faianta finish options list", () => {
    const options = featureOptionsForCategory("faianta");

    expect(options).toHaveLength(17);
    expect(options[0]).toBe("Mată");
    expect(options).toContain("Lucioasă");
    expect(options).toContain("Oglindă");
    expect(options).toContain("Cu efect 3D");
  });

  it("returns full vopsea finish options list", () => {
    const options = featureOptionsForCategory("vopsea");

    expect(options).toHaveLength(12);
    expect(options[0]).toBe("Mată");
    expect(options).toContain("Ultramată");
    expect(options).toContain("Decorativă");
  });

  it("returns full adezivi finish options list", () => {
    const options = featureOptionsForCategory("adezivi");

    expect(options).toHaveLength(6);
    expect(options[0]).toBe("Pulbere");
    expect(options).toContain("Mastic");
  });

  it("returns full parchet finish options list", () => {
    const options = featureOptionsForCategory("parchet");

    expect(options).toHaveLength(10);
    expect(options).toContain("Mat");
    expect(options).toContain("Ultramat");
    expect(options).toContain("Satinat");
    expect(options).toContain("Semi-lucios");
    expect(options).toContain("Lucios");
    expect(options).toContain("Lăcuit");
    expect(options).toContain("Uleiat");
    expect(options).toContain("Uleiat cu ceară");
    expect(options).toContain("Finisaj invizibil");
    expect(options).toContain("Lemn brut");
  });

  it("validates feature against category options", () => {
    expect(isValidFeatureForCategory("gresie", "Matt")).toBe(true);
    expect(isValidFeatureForCategory("gresie", "Polisat")).toBe(true);
    expect(isValidFeatureForCategory("faianta", "Mată")).toBe(true);
    expect(isValidFeatureForCategory("faianta", "Oglindă")).toBe(true);
    expect(isValidFeatureForCategory("vopsea", "Catifelată")).toBe(true);
    expect(isValidFeatureForCategory("vopsea", "Decorativă")).toBe(true);
    expect(isValidFeatureForCategory("adezivi", "Pastă")).toBe(true);
    expect(isValidFeatureForCategory("adezivi", "Mastic")).toBe(true);
    expect(isValidFeatureForCategory("parchet", "Mat")).toBe(true);
    expect(isValidFeatureForCategory("parchet", "Uleiat cu ceară")).toBe(true);
    expect(isValidFeatureForCategory("parchet", "Ultramată")).toBe(false);
    expect(isValidFeatureForCategory("vopsea", "Matt")).toBe(false);
  });
});
