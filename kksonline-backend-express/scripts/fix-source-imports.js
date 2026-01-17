#!/usr/bin/env node

/**
 * Script to remove .ts extensions from import/export statements in TypeScript source files
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

/**
 * Recursively process all .ts files in the src directory
 */
function fixSourceImports(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`Error: Directory ${dir} not found`);
    return 0;
  }

  const files = fs.readdirSync(dir);
  let totalFixed = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      totalFixed += fixSourceImports(filePath);
    } else if (file.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // Replace .ts extensions in import statements
      // Pattern: import ... from "./path/to/file.ts" -> import ... from "./path/to/file"
      content = content.replace(/from\s+(["'])(\.\.?\/[^"']+)\.ts\1/g, (match, quote, importPath) => {
        return `from ${quote}${importPath}${quote}`;
      });

      // Replace .ts extensions in export statements
      // Pattern: export ... from "./path/to/file.ts" -> export ... from "./path/to/file"
      content = content.replace(/export\s+.*?\s+from\s+(["'])(\.\.?\/[^"']+)\.ts\1/g, (match, quote, importPath) => {
        return match.replace(`${quote}${importPath}.ts${quote}`, `${quote}${importPath}${quote}`);
      });

      // Handle dynamic imports
      // Pattern: import("./path/to/file.ts") -> import("./path/to/file")
      content = content.replace(/import\((["'])(\.\.?\/[^"']+)\.ts\1\)/g, (match, quote, importPath) => {
        return `import(${quote}${importPath}${quote})`;
      });

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        totalFixed++;
        console.log(`✓ Fixed imports in ${path.relative(srcDir, filePath)}`);
      }
    }
  }

  return totalFixed;
}

// Run the fix
console.log('Removing .ts extensions from TypeScript source files...\n');
const fixed = fixSourceImports(srcDir);

if (fixed === 0) {
  console.log('\nℹ No import fixes needed (all imports already correct)');
} else {
  console.log(`\n✓ Import fixes completed (${fixed} file(s) updated)`);
}
