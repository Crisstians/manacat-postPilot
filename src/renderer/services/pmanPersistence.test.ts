import { afterEach, describe, expect, it, vi } from "vitest";
import { embedImageRefForPman } from "./pmanPersistence";

describe("embedImageRefForPman", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps data urls as-is", async () => {
    const dataUrl = "data:image/png;base64,abc123";
    await expect(embedImageRefForPman(dataUrl)).resolves.toBe(dataUrl);
  });

  it("keeps empty refs as-is", async () => {
    await expect(embedImageRefForPman("")).resolves.toBe("");
  });

  it("embeds local file paths via electron IPC", async () => {
    const readImageAsDataUrl = vi.fn().mockResolvedValue({
      success: true,
      dataUrl: "data:image/jpeg;base64,embedded",
    });
    vi.stubGlobal("window", {
      manacatApi: { readImageAsDataUrl },
    });

    const result = await embedImageRefForPman("C:\\Users\\test\\photo.jpg");
    expect(readImageAsDataUrl).toHaveBeenCalledWith("C:\\Users\\test\\photo.jpg");
    expect(result).toBe("data:image/jpeg;base64,embedded");
  });
});
