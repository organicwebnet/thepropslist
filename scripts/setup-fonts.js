import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Using a direct CDN URL for the OpenDyslexic font
const FONT_URL = 'https://opendyslexic.org/content/OpenDyslexic-Regular.woff2';
const FONTS_DIR = path.join(dirname(__dirname), 'public', 'fonts');
const FONT_PATH = path.join(FONTS_DIR, 'OpenDyslexic-Regular.woff2');

// Create fonts directory if it doesn't exist
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}

// Download the font file
console.log('Downloading OpenDyslexic font...');
https.get(FONT_URL, {
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': '*/*'
  }
}, (response) => {
  if (response.statusCode === 200) {
    const file = fs.createWriteStream(FONT_PATH);
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Font downloaded successfully!');
    });
  } else {
    console.error(`Failed to download font. Status code: ${response.statusCode}`);
  }
}).on('error', (err) => {
  console.error('Error downloading font:', err.message);
}); 