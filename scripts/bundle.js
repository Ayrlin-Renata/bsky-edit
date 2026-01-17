const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function bundle() {
    try {
        // Parse browser target from command line arguments
        const args = process.argv.slice(2);
        const browserArg = args.find(a => a.startsWith('--browser='));
        const browser = browserArg ? browserArg.split('=')[1] : 'chrome';

        console.log(`🚀 Starting bundle for: ${browser}`);

        // 1. Read version from package.json
        const pkgPath = path.resolve(__dirname, '../package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const version = pkg.version;

        // 2. Update the target manifest
        const manifestFile = `manifest.${browser}.json`;
        const manifestPath = path.resolve(__dirname, `../public/${manifestFile}`);

        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Manifest file not found: ${manifestPath}`);
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        if (manifest.version !== version) {
            manifest.version = version;
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');
            console.log(`✅ Synced ${manifestFile} version to ${version}`);
        } else {
            console.log(`ℹ️ ${manifestFile} version already matches package.json (${version})`);
        }

        // 3. Run Build
        console.log(`🛠 Building for ${browser}...`);
        execSync(`npm run build:${browser}`, { stdio: 'inherit' });

        // 4. Create Zip
        const outputPath = path.join(__dirname, '..', 'output');
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath);
        }

        const zipName = `bsky-edit-${browser}-v${version}.zip`;
        const outputFile = path.join(outputPath, zipName);
        console.log(`📦 Creating bundle in output folder: ${zipName}...`);

        // Use PowerShell's Compress-Archive to zip the dist/${browser} contents
        const distFolder = path.join(__dirname, '..', 'dist', browser);
        execSync(`powershell -Command "Compress-Archive -Path '${distFolder}\\*' -DestinationPath '${outputFile}' -Force"`);

        console.log(`✨ Done! ${browser} extension bundled to: output/${zipName}`);
    } catch (err) {
        console.error('❌ Error during bundle:', err.message);
        process.exit(1);
    }
}

bundle();
