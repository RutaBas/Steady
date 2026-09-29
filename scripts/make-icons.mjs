// Dev-only: render the Steady mark to PNG icons with headless Chrome/Edge.
// Usage: node scripts/make-icons.mjs
import { writeFileSync, mkdtempSync, existsSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const browsers = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
];
const browser = browsers.find(existsSync);
if (!browser) throw new Error("No Chrome/Edge found");

// Full-bleed square: iOS and Android apply their own corner mask.
// scale < 1 shrinks the mark toward the centre (maskable safe zone).
const mark = (scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" fill="#2F6F6A"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path d="M112 318 C172 318 196 246 256 262 C316 278 340 206 392 206" fill="none" stroke="#FFFFFF" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="392" cy="206" r="34" fill="#D5E8E4" stroke="#FFFFFF" stroke-width="14"/>
  </g></svg>`;

const out = resolve("icons");
const tmp = mkdtempSync(join(tmpdir(), "steady-icons-"));
const jobs = [
  ["apple-touch-icon-180.png", 180, 1],
  ["icon-192.png", 192, 1],
  ["icon-512.png", 512, 1],
  ["icon-maskable-512.png", 512, 0.8],
];
for (const [name, size, scale] of jobs) {
  const html = join(tmp, name + ".html");
  writeFileSync(html, `<!doctype html><html><body style="margin:0;background:#2F6F6A"><div style="width:${size}px;height:${size}px">${mark(scale)}</div></body></html>`);
  const png = join(tmp, name);
  execFileSync(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
    `--window-size=${size},${size}`, `--screenshot=${png}`, "file:///" + html.replace(/\\/g, "/")], { stdio: "ignore" });
  copyFileSync(png, join(out, name));
  console.log("wrote icons/" + name);
}
