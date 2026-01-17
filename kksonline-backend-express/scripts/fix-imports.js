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
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixImports(filePath);
    } else if (file.endsWith('.js') && !file.endsWith('.config.js')) {
      // Skip .config.js files as they might be external
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Replace .ts extensions with .js in require() statements
      // Pattern: require("./path/to/file.ts") -> require("./path/to/file.js")
      content = content.replace(/require\(['"](\.\.?\/[^'"]+)\.ts['"]\)/g, (match, importPath) => {
        modified = true;
        return `require('${importPath}.js')`;
      });

      // Replace .ts extensions in import statements (if using ES modules)
      // Pattern: import ... from "./path/to/file.ts" -> import ... from "./path/to/file.js"
      content = content.replace(/from\s+['"](\.\.?\/[^'"]+)\.ts['"]/g, (match, importPath) => {
        modified = true;
        return `from '${importPath}.js'`;
      });

      // Replace .ts extensions in export statements
      // Pattern: export ... from "./path/to/file.ts" -> export ... from "./path/to/file.js"
      content = content.replace(/from\s+['"](\.\.?\/[^'"]+)\.ts['"]/g, (match, importPath) => {
        modified = true;
        return `from '${importPath}.js'`;
      });

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Fixed imports in ${path.relative(distDir, filePath)}`);
      }
    }
  }
}

// Run the fix
if (fs.existsSync(distDir)) {
  console.log('Fixing .ts to .js extensions in compiled files...');
  fixImports(distDir);
  console.log('✓ Import fixes completed');
} else {
  console.error('Error: dist directory not found. Run "npm run build" first.');
  process.exit(1);
}
