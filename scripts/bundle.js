const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function bundle() {
    try {
        // 1. Read version from package.json
        const pkgPath = path.resolve(__dirname, '../package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const version = pkg.version;

        // 2. Update public/manifest.json
        const manifestPath = path.resolve(__dirname, '../public/manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        if (manifest.version !== version) {
            manifest.version = version;
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');
            console.log(`✅ Synced manifest.json version to ${version}`);
        } else {
            console.log(`ℹ️ manifest.json version already matches package.json (${version})`);
        }

        // 3. Run Build
        console.log('🛠 Building project...');
        execSync('npm run build', { stdio: 'inherit' });

        // 4. Create Zip
        const outputDir = path.resolve(__dirname, '../output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        const zipName = `bsky-edit-v${version}.zip`;
        const zipPath = path.join(outputDir, zipName);
        const distPath = path.resolve(__dirname, '../dist');

        console.log(`📦 Creating bundle in output folder: ${zipName}...`);

        // Remove existing zip if it exists
        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }

        // Use PowerShell on Windows for dependency-free zipping
        // We zip the contents of dist, not the dist folder itself
        const cmd = `powershell -Command "Compress-Archive -Path '${distPath}\\*' -DestinationPath '${zipPath}' -Force"`;
        execSync(cmd, { stdio: 'inherit' });

        console.log(`\n✨ Done! Extension bundled to: output/${zipName}`);
    } catch (err) {
        console.error('❌ Error during bundle:', err.message);
        process.exit(1);
    }
}

bundle();
