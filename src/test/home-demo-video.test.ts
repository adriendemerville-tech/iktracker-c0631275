// @vitest-environment node
import { describe, expect, it } from "vitest";
import { HOME_JSON_LD_SCRIPTS } from "@/lib/home-schemas";

describe("home demonstration video", () => {
  it("adds one accurate VideoObject without replacing existing schemas", () => {
    const schemas = HOME_JSON_LD_SCRIPTS.map((script) => JSON.parse(script.children));
    const videos = schemas.filter((schema) => schema["@type"] === "VideoObject");
    expect(videos).toHaveLength(1);
    expect(videos[0]).toMatchObject({
      name: "Démonstration IKtracker",
      thumbnailUrl: "https://iktracker.fr/video/iktracker-home-v1-poster.jpg",
      contentUrl: "https://iktracker.fr/video/iktracker-home-v1.mp4",
      uploadDate: "2026-10-10",
      duration: "PT45S",
    });
    expect(schemas.some((schema) => schema["@type"] === "SoftwareApplication")).toBe(true);
    expect(schemas.some((schema) => schema["@type"] === "FAQPage")).toBe(true);
  });
});