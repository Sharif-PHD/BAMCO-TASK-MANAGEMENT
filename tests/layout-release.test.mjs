import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, welcome] = await Promise.all([
  readFile(new URL('../release/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../release/bamco-unified.css', import.meta.url), 'utf8'),
  readFile(new URL('../release/user-request-fixes-20260907-v2.js', import.meta.url), 'utf8')
]);

assert.equal((html.match(/rel="stylesheet"/g) || []).length, 1, 'release must load exactly one stylesheet');
assert.match(html, /bamco-unified\.css\?v=final-20260907-2/);
assert.ok(!html.includes('document.head.appendChild(document.querySelector'), 'legacy stylesheet reshuffling must be removed');
assert.match(css, /#welcomeView \.bamco-welcome-sticker[\s\S]*max-width: 112px !important/);
assert.match(css, /#appView #sidebar #nav > \.nav-login-root[\s\S]*max-width: 180px !important/);
assert.ok(!welcome.includes('height:430px!important'), 'oversized legacy stickers must not return');
assert.ok(!welcome.includes('width:100%!important;\n        min-width:150px'), 'welcome navigation must not stretch across the header');

console.log('layout release tests: OK');
