const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(read('plugin.json'));
const pkg = JSON.parse(read('package.json'));

assert.equal(manifest.name, 'siyuan-plugin-chord');
assert.equal(manifest.name, path.basename(root), 'Directory and plugin identity must match');
assert.equal(pkg.name, manifest.name);
assert.equal(pkg.version, manifest.version);
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(manifest.displayName.default, 'Chord');
assert.equal(manifest.displayName['zh-CN'], '和弦');
assert.equal(pkg.private, true, 'This is a SiYuan package, not an npm publication');
assert.equal(manifest.disabledInPublish, true);
assert.ok(manifest.kernels.includes('all'));
assert.deepEqual(manifest.frontends.slice().sort(), ['browser-desktop', 'desktop', 'desktop-window']);
assert.ok(Array.isArray(pkg.files) && pkg.files.length === new Set(pkg.files).size);
for (const file of pkg.files) {
    assert.match(file, /^(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+$/);
    assert.ok(!file.split('/').includes('..'), file);
    assert.ok(fs.lstatSync(path.join(root, file)).isFile(), file);
}
for (const file of ['index.js', 'kernel.js', 'index.css', 'plugin.json', 'package.json', 'LICENSE',
    'i18n/en.json', 'i18n/zh-CN.json', manifest.icon, ...Object.values(manifest.readme)]) {
    assert.ok(pkg.files.includes(file), 'Missing release resource: ' + file);
}
for (const file of ['index.js', 'kernel.js']) new vm.Script(read(file), { filename: file });
// Keep new features on the shared edit path instead of growing another lease implementation.
for (const file of fs.readdirSync(path.join(root, 'src/frontend'))) {
    const source = read('src/frontend/' + file);
    if (file !== 'edit-coordinator.js') assert.ok(!/\.editClaim\s*\(/.test(source), file + ': leases belong to EditCoordinator');
    if (file === 'edit-coordinator.js') assert.ok(!/\b(?:document|window)\s*\.|\b(?:getAllEditor|fetchSyncPost)\s*\(/.test(source), 'Coordinator must not depend on editor DOM or storage APIs');
    if (file === 'edit-lock-view.js') assert.ok(!/\b(rpc|fetchSyncPost)\b/.test(source), 'Lock view must only render state');
    if (file === 'personal-history.js') assert.ok(!/editing\.(claim|release|held|desired|leaseUntil)\b/.test(source), 'History must use runOperation');
}
const en = JSON.parse(read('i18n/en.json')), zh = JSON.parse(read('i18n/zh-CN.json'));
assert.equal(en.pluginName, 'Chord');assert.equal(zh.pluginName, '和弦');
assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
for (const key of Object.keys(en)) {
    const slots = (text) => [...text.matchAll(/\$\{[^}]+\}/g)].map((match) => match[0]).sort();
    assert.deepEqual(slots(en[key]), slots(zh[key]), 'Translation placeholders differ: ' + key);
}
for (const [file, width, height, limit] of [['icon.png', 160, 160, 64 * 1024]]) {
    const bytes = fs.readFileSync(path.join(root, file));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', file);
    assert.equal(bytes.readUInt32BE(16), width, file);assert.equal(bytes.readUInt32BE(20), height, file);
    assert.ok(bytes.length <= limit, file + ' exceeds the marketplace size limit');
}
for (const file of pkg.files.filter((file) => file.endsWith('.md'))) {
    const text = read(file);
    for (const match of text.matchAll(/\]\(([^)]+)\)|\bsrc="([^"]+)"/g)) {
        const target = (match[1] || match[2]).split('#')[0];
        if (!target || /^https?:/.test(target)) continue;
        const resolved = path.resolve(root, path.dirname(file), target);
        const relative = path.relative(root, resolved).split(path.sep).join('/');
        assert.ok(pkg.files.includes(relative), file + ': link omitted from package: ' + target);
    }
    assert.ok(!/[A-Z]:[\\/](?:Users|IdeaProjects)[\\/]/.test(text), file + ': local path in public documentation');
}
if (process.argv.includes('--release')) {
    assert.match(manifest.url, /^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/siyuan-plugin-chord\/?$/,
        'Set plugin.json.url to the real GitHub repository before publishing');
    assert.ok(!/\/(?:your-username|owner|example|username)\//i.test(manifest.url), 'Replace the placeholder repository owner');
}
console.log('Chord repository checks passed (' + pkg.files.length + ' release files).');
