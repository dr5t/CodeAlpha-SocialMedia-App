const fs = require('fs');
const path = require('path');

const baseDir = '/Users/shauryatiwari/Social-Media-App';

const filesToUpdate = [
  'public/profile.html',
  'public/js/post.js',
  'public/js/feed.js',
  'public/js/app.js',
  'public/js/profile.js'
];

const oldPathRegex = /<svg([^>]*)viewBox="0 0 24 24" fill="#0095f6">\s*<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"\s*\/?>\s*<\/svg>/g;

const newSvgPath = '<svg$1viewBox="0 0 24 24" fill="#22c55e"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.48 0-.938.09-1.36.25C14.775 2.48 13.51 1.5 12 1.5s-2.775.98-3.412 2.25c-.422-.16-.88-.25-1.36-.25C5.12 3.5 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.998 3.818 3.998.48 0 .938-.09 1.36-.25.637 1.27 1.902 2.25 3.412 2.25s2.775-.98 3.412-2.25c.422.16.88.25 1.36.25 2.11 0 3.82-1.79 3.82-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.8 3.8l-3.3-3.3 1.4-1.4 1.9 1.9 5.3-5.3 1.4 1.4-6.7 6.7z"/></svg>';

for (const relPath of filesToUpdate) {
  const fullPath = path.join(baseDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`);
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  if (oldPathRegex.test(content)) {
    const updated = content.replace(oldPathRegex, newSvgPath);
    fs.writeFileSync(fullPath, updated, 'utf8');
    console.log(`Successfully updated verified badge SVG in: ${relPath}`);
  } else {
    console.log(`No matching old verified badge SVG found in: ${relPath}`);
  }
}
console.log("Verified badges updated!");
