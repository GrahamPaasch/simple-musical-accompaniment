const fs = require('fs');
const path = require('path');

// simple smoke test to ensure main HTML file references the main script
const htmlPath = path.join(__dirname, 'index.html');
try {
  const html = fs.readFileSync(htmlPath, 'utf8');
  if (html.includes('script.js')) {
    console.log('index.html links to script.js');
  } else {
    console.error('index.html does not link to script.js');
    process.exit(1);
  }
} catch (err) {
  console.error('Could not read index.html:', err.message);
  process.exit(1);
}
