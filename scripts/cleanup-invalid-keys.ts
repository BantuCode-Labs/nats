
import fs from 'fs';
import path from 'path';

const MESSAGES_DIR = path.resolve(process.cwd(), 'messages');
const LANGUAGES = ['en', 'id', 'ms', 'vi', 'th', 'tl'];

LANGUAGES.forEach(lang => {
  const filePath = path.join(MESSAGES_DIR, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    console.log(`Processing ${lang}.json...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);
    let changed = false;

    // Find keys with dots
    const keys = Object.keys(json);
    keys.forEach(key => {
      if (key.includes('.')) {
        console.log(`Removing invalid key: ${key}`);
        delete json[key];
        changed = true;
      }
    });

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(json, null, 4));
      console.log(`Updated ${lang}.json`);
    } else {
      console.log(`No invalid keys found in ${lang}.json`);
    }
  }
});
