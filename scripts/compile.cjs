const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const sources = ['../protocol', 'anchors', 'surfaces', 'plugin'];
const outputs = {
    'index.js': '// Generated from src/frontend by npm run compile.\n' + sources.map(name => read('src/frontend/' + name + '.js').trimEnd()).join('\n\n') + '\n',
    'kernel.js': '// Generated from src/kernel.js by npm run compile.\n' + read('src/protocol.js') + '\n' + read('src/kernel.js'),
};
for (const [file, contents] of Object.entries(outputs)) {
    new (require('node:vm').Script)(contents, { filename: file });
    if (process.argv.includes('--check')) assert.equal(read(file), contents, file + ': run npm run compile');
    else fs.writeFileSync(path.join(root, file), contents);
}
