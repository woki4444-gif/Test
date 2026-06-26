// Run with: node scripts/generate-icons.js
// Generates simple SVG-based PNG icons for the PWA
// Requires: npm install canvas (optional) — or just use the SVG approach below

const fs = require("fs");
const path = require("path");

// Minimal SVG icon with Portuguese flag colours
const svgIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#006600"/>
  <rect x="${size * 0.38}" width="${size * 0.62}" height="${size}" rx="0" fill="#FF0000"/>
  <circle cx="${size * 0.38}" cy="${size * 0.5}" r="${size * 0.22}" fill="#FFD700" stroke="#003399" stroke-width="${size * 0.03}"/>
  <text x="${size * 0.5}" y="${size * 0.58}" text-anchor="middle" font-family="serif" font-size="${size * 0.3}" fill="white" font-weight="bold">PT</text>
</svg>`;

const publicDir = path.join(__dirname, "..", "public");
fs.writeFileSync(path.join(publicDir, "icon-192.svg"), svgIcon(192));
fs.writeFileSync(path.join(publicDir, "icon-512.svg"), svgIcon(512));

console.log("SVG icons written to public/. For PNG, convert them with:");
console.log("  npx sharp-cli --input public/icon-192.svg --output public/icon-192.png");
console.log("  npx sharp-cli --input public/icon-512.svg --output public/icon-512.png");
console.log("");
console.log("Or use any SVG→PNG converter. The manifest.json references .png files.");
console.log("For a quick test, you can rename the SVG files to .png — some browsers accept it.");
