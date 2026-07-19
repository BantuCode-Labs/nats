import fs from 'fs';
import path from 'path';

// Configuration
const MESSAGES_DIR = path.resolve(process.cwd(), 'messages');
const SOURCE_DIR = path.resolve(process.cwd(), 'app');
const LANGUAGES = ['en', 'id', 'ms', 'vi', 'th', 'tl'];

// Types
type KeyMap = Map<string, Set<string>>; // Namespace -> Set<Key>
type FileKeyMap = Map<string, KeyMap>; // FilePath -> KeyMap (for reporting location)

// Regex patterns
// Matches: const t = useTranslations("Namespace");
const USE_TRANSLATIONS_REGEX = /const\s+(\w+)\s*=\s*useTranslations\(\s*["']([^"']+)["']\s*\)/g;

// Matches: t("key") or t('key')
// We need to capture the variable name to match with the namespace
const T_CALL_REGEX = /\b(\w+)\s*\(\s*["']([^"']+)["']\s*(?:,.*)?\)/g;

// Matches: t.rich("key"), t.markup("key"), t.raw("key")
const T_METHOD_REGEX = /\b(\w+)\.(?:rich|markup|raw)\s*\(\s*["']([^"']+)["']\s*(?:,.*)?\)/g;

interface ValidationResult {
  missingKeys: {
    lang: string;
    namespace: string;
    key: string;
    files: string[];
  }[];
  unusedKeys: {
    lang: string;
    namespace: string;
    key: string;
  }[];
}

// Helper to recursively find files
function findFiles(dir: string, extension: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(filePath, extension));
    } else if (filePath.endsWith(extension)) {
      results.push(filePath);
    }
  });

  return results;
}

// Helper to flatten JSON object to keys
function flattenKeys(obj: any, prefix = ''): Record<string, string> {
  let result: Record<string, string> = {};

  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const nested = flattenKeys(obj[key], prefix ? `${prefix}.${key}` : key);
      result = { ...result, ...nested };
    } else {
      result[prefix ? `${prefix}.${key}` : key] = obj[key];
    }
  }

  return result;
}

// Helper to unflatten keys back to object
function unflattenKeys(flat: Record<string, string>): any {
  const result: any = {};

  for (const key in flat) {
    const parts = key.split('.');
    let current = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = flat[key];
      } else {
        current[part] = current[part] || {};
        current = current[part];
      }
    }
  }

  return result;
}

// Generate default value from key
function generateDefaultValue(key: string): string {
  // Take the last part of the key
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];

  // Handle snake_case and camelCase
  return lastPart
    // Replace underscores with spaces
    .replace(/_/g, ' ')
    // Insert space before capital letters (camelCase)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Capitalize first letter of each word
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Scan source code for usage
function scanSourceCode(dir = SOURCE_DIR): { usage: KeyMap; fileUsage: FileKeyMap } {
  const files = findFiles(dir, '.tsx').concat(findFiles(dir, '.ts'));
  const usage: KeyMap = new Map();
  const fileUsage: FileKeyMap = new Map();

  console.log(`Scanning ${files.length} files...`);

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');

    // Find all translation hooks usage
    const hookMatches = [...content.matchAll(USE_TRANSLATIONS_REGEX)];
    const varToNamespace = new Map<string, string>();

    hookMatches.forEach(match => {
      const [_, varName, namespace] = match;
      varToNamespace.set(varName, namespace);
    });

    if (varToNamespace.size === 0) return;

    // Find all t() calls
    const callMatches = [...content.matchAll(T_CALL_REGEX)];
    const methodMatches = [...content.matchAll(T_METHOD_REGEX)];
    const allMatches = [...callMatches, ...methodMatches];

    allMatches.forEach(match => {
      const [_, varName, key] = match;
      const namespace = varToNamespace.get(varName);

      if (namespace) {
        // Add to global usage
        if (!usage.has(namespace)) {
          usage.set(namespace, new Set());
        }
        usage.get(namespace)!.add(key);

        // Add to file usage
        if (!fileUsage.has(file)) {
          fileUsage.set(file, new Map());
        }
        if (!fileUsage.get(file)!.has(namespace)) {
          fileUsage.get(file)!.set(namespace, new Set());
        }
        fileUsage.get(file)!.get(namespace)!.add(key);
      }
    });
  });

  return { usage, fileUsage };
}

export {
  scanSourceCode,
  generateDefaultValue,
  flattenKeys,
  unflattenKeys,
  findFiles,
  MESSAGES_DIR,
  SOURCE_DIR,
  LANGUAGES
};

// Main function
async function main() {
  const isCheckMode = process.argv.includes('--check');
  console.log(`Starting i18n validation... (Mode: ${isCheckMode ? 'Check' : 'Fix'})`);

  // 1. Scan source code
  const { usage, fileUsage } = scanSourceCode();

  // 2. Load existing translations
  const translations: Record<string, any> = {};
  LANGUAGES.forEach(lang => {
    const filePath = path.join(MESSAGES_DIR, `${lang}.json`);
    if (fs.existsSync(filePath)) {
      translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else {
      translations[lang] = {};
    }
  });

  // 3. Validate and collect missing keys
  const missingKeys: { lang: string, fullPath: string, key: string }[] = [];

  LANGUAGES.forEach(lang => {
    // Flatten the entire translation object for easy lookup
    const langFlat = flattenKeys(translations[lang]);

    usage.forEach((keys, namespace) => {
      keys.forEach(key => {
        // Construct the full path expected in the JSON
        // namespace could be "General.Departments"
        // key could be "title"
        // fullPath = "General.Departments.title"
        const fullPath = `${namespace}.${key}`;

        if (!langFlat[fullPath]) {
          missingKeys.push({ lang, fullPath, key });
        }
      });
    });
  });

  // 4. Report results
  if (missingKeys.length > 0) {
    console.log('\nMissing keys found:');
    missingKeys.forEach(({ lang, fullPath }) => {
      console.log(`[${lang}] ${fullPath}`);
    });

    console.log(`\nFound ${missingKeys.length} missing translation keys.`);

    if (isCheckMode) {
      console.error('Check failed: Missing translation keys found.');
      process.exit(1);
    }

    console.log('Adding missing keys...');

    // 5. Add missing keys
    let changesCount = 0;

    LANGUAGES.forEach(lang => {
      const langMissing = missingKeys.filter(m => m.lang === lang);
      if (langMissing.length === 0) return;

      const currentTranslations = translations[lang];

      langMissing.forEach(({ fullPath, key }) => {
        // We need to set nested property based on fullPath
        const parts = fullPath.split('.');
        let current = currentTranslations;

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (i === parts.length - 1) {
            // Only set if not exists (double check)
            if (!current[part]) {
              const defaultValue = generateDefaultValue(key);
              current[part] = defaultValue;
              changesCount++;
            }
          } else {
            current[part] = current[part] || {};
            current = current[part];
          }
        }
      });

      // Write back to file
      const filePath = path.join(MESSAGES_DIR, `${lang}.json`);
      fs.writeFileSync(filePath, JSON.stringify(currentTranslations, null, 4));
      console.log(`Updated ${filePath}`);
    });

    console.log(`\nSuccessfully added ${changesCount} missing keys.`);

  } else {
    console.log('\nNo missing keys found. All translations are up to date!');
  }
}

// Only run main if called directly
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
