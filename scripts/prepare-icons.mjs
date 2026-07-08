import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceIcon = path.join(rootDir, "src/assets/logo.png");
const buildDir = path.join(rootDir, "build");
const outputIcon = path.join(buildDir, "icon.png");

await mkdir(buildDir, { recursive: true });

await sharp(sourceIcon)
  .resize(512, 512, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(outputIcon);

console.log(`Generated ${outputIcon}`);
