require('./check.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(process.platform, 'win32', 'Packaging currently requires Windows tar.exe');
const tar = (args) => execFileSync('tar.exe', args, { cwd: root, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
const temporary = path.join(output, 'package-' + randomUUID() + '.zip');
const destination = path.join(output, 'package.zip');
try {
    tar(['-a', '-c', '-f', temporary, ...pkg.files]);
    const entries = tar(['-t', '-f', temporary]).toString('utf8').trim().split(/\r?\n/);
    assert.deepEqual(entries.sort(), pkg.files.slice().sort(), 'Package entries differ from the release allowlist');
    for (const file of pkg.files) {
        assert.equal(hash(tar(['-x', '-O', '-f', temporary, file])), hash(fs.readFileSync(path.join(root, file))),
            'Package content mismatch: ' + file);
    }
    fs.renameSync(temporary, destination);
    fs.writeFileSync(destination + '.sha256', hash(fs.readFileSync(destination)) + '  package.zip\n');
    console.log('Built Chord ' + pkg.version + ': dist/package.zip (' + pkg.files.length + ' verified files)');
} finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
}
