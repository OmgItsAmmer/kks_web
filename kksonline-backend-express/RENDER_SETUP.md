# Render Deployment Setup - Quick Fix

## 🔧 Current Issue

Render is running `npm install` instead of your build command, causing the compiled output to have `.ts` extensions that Node.js can't resolve.

## ✅ Solution: Update Build Command in Render Dashboard

1. **Go to Render Dashboard** → Your Service → Settings
2. **Find "Build Command"** section
3. **Replace** the build command with:
   ```bash
   npm ci && npm run build
   ```
   OR use the script:
   ```bash
   chmod +x .render-build.sh && ./.render-build.sh
   ```

4. **Start Command** should be:
   ```bash
   npm start
   ```

5. **Save Changes** and trigger a new deployment

## 🚀 Alternative: Use render.yaml

If you're creating a new service:

1. Ensure `render.yaml` is in your repository root (or in `kksonline-backend-express/`)
2. When creating the service, Render should auto-detect it
3. If not, you can manually import the service using:
   ```bash
   render blueprint launch render.yaml
   ```

## 📋 Build Process

The build now runs:
1. `npm ci` - Clean install dependencies
2. `prisma generate` - Generate Prisma client
3. `tsc` - Compile TypeScript to JavaScript
4. `tsc-alias` - Resolve path aliases (`@config/*` etc.)
5. `scripts/fix-imports.js` - Fix `.ts` → `.js` extensions in compiled output

## ✅ Verification

After deployment, check the build logs. You should see:
```
🔨 Starting build process...
📦 Installing dependencies...
🗄️ Generating Prisma client...
🔧 Compiling TypeScript...
🔄 Resolving path aliases...
🔀 Fixing import extensions...
✓ Fixed imports in dist/index.js
✓ Fixed imports in dist/config/env.config.js
...
✅ Build completed successfully!
```

## 🔍 If Still Not Working

1. **Check Build Logs**: Make sure `scripts/fix-imports.js` is running
2. **Verify dist folder**: Should have `.js` files with `.js` imports
3. **Test locally**: Run `npm run build` locally and check `dist/index.js` has `.js` extensions
4. **Check file permissions**: Ensure scripts are executable (`chmod +x scripts/fix-imports.js`)

## 📞 Next Steps

After updating the build command:
1. Save changes in Render Dashboard
2. Manual Deploy → Deploy latest commit
3. Monitor build logs for success
4. Verify the service starts correctly
