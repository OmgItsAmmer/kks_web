#!/usr/bin/env node

/**
 * Post-build script to fix .ts extensions to .js in compiled JavaScript files
 * This ensures Node.js can properly resolve imports after TypeScript compilation
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

/**
 * Recursively process all .js files in the dist directory
 */
function fixImports(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const files = fs.readdirSync(dir);
  let totalFixed = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixImports(filePath);
    } else if (file.endsWith('.js') && !file.endsWith('.config.js')) {
      // Skip .config.js files as they might be external
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // Replace .ts extensions with .js in require() statements
      // Pattern: require("./path/to/file.ts") -> require("./path/to/file.js")
      // This handles both single and double quotes
      content = content.replace(/require\((["'])(\.\.?\/[^"']+)\.ts\1\)/g, (match, quote, importPath) => {
        return `require(${quote}${importPath}.js${quote})`;
      });

      // Replace .ts extensions in import statements (if using ES modules)
      // Pattern: import ... from "./path/to/file.ts" -> import ... from "./path/to/file.js"
      content = content.replace(/from\s+(["'])(\.\.?\/[^"']+)\.ts\1/g, (match, quote, importPath) => {
        return `from ${quote}${importPath}.js${quote}`;
      });

      // Replace .ts extensions in export statements
      content = content.replace(/export\s+.*?\s+from\s+(["'])(\.\.?\/[^"']+)\.ts\1/g, (match, quote, importPath) => {
        return match.replace(`${quote}${importPath}.ts${quote}`, `${quote}${importPath}.js${quote}`);
      });

      // Handle any relative path strings ending in .ts (most comprehensive pattern)
      // This catches all remaining cases like variable assignments, etc.
      content = content.replace(/(["'])(\.\.?\/[^"']+)\.ts\1/g, (match, quote, importPath) => {
        // Only replace relative imports (not node_modules or absolute paths)
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          return `${quote}${importPath}.js${quote}`;
        }
        return match;
      });

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        totalFixed++;
        console.log(`✓ Fixed imports in ${path.relative(distDir, filePath)}`);
      }
    }
  }

  return totalFixed;
}

// Run the fix
console.log('Fixing .ts to .js extensions in compiled files...');
const fixed = fixImports(distDir);

if (fixed === undefined || fixed === 0) {
  if (!fs.existsSync(distDir)) {
    console.error('Error: dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }
  console.log('ℹ No import fixes needed (all imports already correct)');
} else {
  console.log(`✓ Import fixes completed (${fixed} file(s) updated)`);
}

// Verify critical files exist
const criticalFiles = [
  path.join(distDir, 'index.js'),
  path.join(distDir, 'config', 'env.config.js')
];

for (const file of criticalFiles) {
  if (!fs.existsSync(file)) {
    console.warn(`⚠ Warning: Expected file not found: ${file}`);
  }
}

