#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Copy assets from the root project to the VS Code extension directory
 * for packaging. This ensures we have a single source of truth for assets.
 */

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.join(SCRIPT_DIR, '../../..');
const VSCODE_EXT_DIR = path.join(SCRIPT_DIR, '..');

// Define assets to copy: [source, destination]
const ASSETS_TO_COPY = [
  {
    source: path.join(PROJECT_ROOT, 'assets', 'icon.png'),
    destination: path.join(VSCODE_EXT_DIR, 'icon.png'),
    description: 'Extension icon'
  },
  {
    source: path.join(PROJECT_ROOT, 'LICENSE.md'),
    destination: path.join(VSCODE_EXT_DIR, 'LICENSE.md'),
    description: 'License file'
  },
  {
    source: path.join(PROJECT_ROOT, 'assets', 'banner.png'),
    destination: path.join(VSCODE_EXT_DIR, 'banner.png'),
    description: 'Extension banner'
  }
  ,
  {
    source: path.join(PROJECT_ROOT, 'assets', 'highlight_fixed_code.gif'),
    destination: path.join(VSCODE_EXT_DIR, 'highlight_fixed_code.gif'),
    description: 'Extension highlight_fixed_code image'
  }
];

/**
 * Copies a file from source to destination with error handling
 */
function copyAsset(asset) {
  try {
    console.log(`🔄 Copying ${asset.description}: from: ${path.basename(asset.source)} to: ${path.basename(asset.destination)}`);
    if (!fs.existsSync(asset.source)) {
      console.warn(`⚠️  Warning: Source file not found: ${asset.source}`);
      return false;
    }

    // Ensure destination directory exists
    const destDir = path.dirname(asset.destination);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(asset.source, asset.destination);
    console.log(`✅ Copied ${asset.description}: ${path.basename(asset.source)}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to copy ${asset.description}: ${error.message}`);
    return false;
  }
}

/**
 * Main function to copy all assets
 */
function copyAssets() {
  console.log('🔄 Copying assets for VS Code extension packaging...\n');
  console.log(`Project root: ${PROJECT_ROOT}`);
  console.log(`VS Code extension directory: ${VSCODE_EXT_DIR}\n`);
  

  let successCount = 0;
  let totalCount = ASSETS_TO_COPY.length;

  for (const asset of ASSETS_TO_COPY) {
    if (copyAsset(asset)) {
      successCount++;
    }
  }

  console.log(`\n📦 Asset copying completed: ${successCount}/${totalCount} files copied successfully`);
  
  if (successCount < totalCount) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  copyAssets();
}

module.exports = { copyAssets, copyAsset, ASSETS_TO_COPY };