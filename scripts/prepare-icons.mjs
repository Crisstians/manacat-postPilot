import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceIcon = path.join(rootDir, "src/assets/logo.png");
const buildDir = path.join(rootDir, "build");
const outputPng = path.join(buildDir, "icon.png");
const outputIco = path.join(buildDir, "icon.ico");

/** Build a Windows ICO that embeds a PNG (Vista+). */
const pngBufferToIco = (pngBuffer) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const directory = Buffer.alloc(16);
  directory[0] = 0; // width 256
  directory[1] = 0; // height 256
  directory[2] = 0;
  directory[3] = 0;
  directory.writeUInt16LE(1, 4);
  directory.writeUInt16LE(32, 6);
  directory.writeUInt32LE(pngBuffer.length, 8);
  directory.writeUInt32LE(22, 12);

  return Buffer.concat([header, directory, pngBuffer]);
};

await mkdir(buildDir, { recursive: true });

const png512 = await sharp(sourceIcon)
  .resize(512, 512, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

await writeFile(outputPng, png512);

const png256 = await sharp(png512).resize(256, 256).png().toBuffer();
await writeFile(outputIco, pngBufferToIco(png256));

console.log(`Generated ${outputPng}`);
console.log(`Generated ${outputIco}`);
