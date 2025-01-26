const { execSync } = require('child_process');
const os = require('os');

try {
    // Attempt to require gl. If it fails, we'll try a rebuild on macos
    require('gl');
} catch (e) {
    if (os.platform() === 'darwin' && os.arch() === 'arm64') {
        console.log('Attempting to rebuild gl for arm64...');
        try {
            execSync('npm rebuild gl', { stdio: 'inherit' });
            console.log('gl rebuilt successfully!');
        } catch (rebuildError) {
            console.error('Failed to rebuild gl:', rebuildError);
            process.exit(1); // Exit with error code to prevent further execution
        }
    } else {
        console.error('gl is not installed and could not be rebuilt on this platform.');
        process.exit(1);
    }
}