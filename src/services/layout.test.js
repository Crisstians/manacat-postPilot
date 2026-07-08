import { describe, expect, it } from "vitest";
import { computeContainRect } from "./layout";
describe("computeContainRect", () => {
    it("keeps full width for wider image", () => {
        const result = computeContainRect({
            sourceWidth: 1200,
            sourceHeight: 600,
            target: { x: 100, y: 200, width: 300, height: 300 },
        });
        expect(result.width).toBe(300);
        expect(result.height).toBe(150);
        expect(result.y).toBe(275);
    });
    it("keeps full height for taller image", () => {
        const result = computeContainRect({
            sourceWidth: 600,
            sourceHeight: 1200,
            target: { x: 100, y: 200, width: 300, height: 300 },
        });
        expect(result.height).toBe(300);
        expect(result.width).toBe(150);
        expect(result.x).toBe(175);
    });
});
