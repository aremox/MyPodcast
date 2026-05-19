const fs = require('fs');
const path = require('path');

try {
  console.log('[Prep] Preparing dist package.json for electron-builder...');
  
  // Copy electron-builder.json
  const builderSrc = path.join(__dirname, 'electron-builder.json');
  const builderDest = path.resolve(__dirname, '../../dist/apps/desktop-sync/electron-builder.json');
  fs.copyFileSync(builderSrc, builderDest);
  console.log('[Prep] Copied electron-builder.json successfully.');

  // Copy installer.nsh
  const nshSrc = path.join(__dirname, 'installer.nsh');
  const nshDest = path.resolve(__dirname, '../../dist/apps/desktop-sync/installer.nsh');
  fs.copyFileSync(nshSrc, nshDest);
  console.log('[Prep] Copied installer.nsh successfully.');

  // Read root package.json for electron and tslib versions
  const rootPkgPath = path.resolve(__dirname, '../../package.json');
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  const electronVersion = rootPkg.devDependencies.electron.replace(/^[^0-9]+/, '');
  const tslibVersion = rootPkg.devDependencies.tslib || rootPkg.dependencies.tslib;

  // Read dist package.json
  const distPkgPath = path.resolve(__dirname, '../../dist/apps/desktop-sync/package.json');
  if (!fs.existsSync(distPkgPath)) {
    throw new Error(`dist package.json not found at ${distPkgPath}`);
  }
  const distPkg = JSON.parse(fs.readFileSync(distPkgPath, 'utf8'));

  // Augment metadata
  distPkg.description = 'MyPodcast Synchronization Agent';
  distPkg.author = 'Aremox';
  distPkg.dependencies = {
    tslib: tslibVersion
  };
  distPkg.devDependencies = {
    electron: electronVersion
  };

  // Write back
  fs.writeFileSync(distPkgPath, JSON.stringify(distPkg, null, 2), 'utf8');
  console.log(`[Prep] Updated dist package.json with Electron v${electronVersion}, tslib v${tslibVersion}, author, and description.`);

} catch (err) {
  console.error('[Prep] ERROR preparing package:', err);
  process.exit(1);
}
