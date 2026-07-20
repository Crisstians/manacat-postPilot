import { describe, expect, it } from "vitest";
import { buildFacebookPostUrl } from "./facebookPostUrl.js";

describe("buildFacebookPostUrl", () => {
  it("builds page posts URL from Graph pageId_postId", () => {
    expect(buildFacebookPostUrl("123456789_987654321")).toBe(
      "https://www.facebook.com/123456789/posts/987654321",
    );
  });

  it("falls back to facebook.com/{id} for other ids", () => {
    expect(buildFacebookPostUrl("abc")).toBe("https://www.facebook.com/abc");
  });
});
