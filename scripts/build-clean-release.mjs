import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const release = join(root, 'release');
const sourceHtml = await readFile(join(root, 'index.html'), 'utf8');

const stylesheetPattern = /\s*<link(?:\s+id="responsiveStyles")?\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g;
const stylePattern = /\s*<style(?:\s+id="([^"]+)")?>([\s\S]*?)<\/style>/g;
const cssParts = [];
const cssFiles = [];

for (const match of sourceHtml.matchAll(stylesheetPattern)) {
  const path = match[1].split('?')[0];
  if (!cssFiles.includes(path)) cssFiles.push(path);
}

for (const path of cssFiles) {
  cssParts.push(`/* Source: ${path} */\n${await readFile(join(root, path), 'utf8')}`);
}

for (const path of ['sidebar-uniform-20260907.css', 'unified-ui-20260907.css', 'navigation-layout-final.css']) {
  if (!cssFiles.includes(path)) cssParts.push(`/* Source: ${path} */\n${await readFile(join(root, path), 'utf8')}`);
}

for (const match of sourceHtml.matchAll(stylePattern)) {
  cssParts.push(`/* Source: index.html${match[1] ? `#${match[1]}` : ' inline style'} */\n${match[2].trim()}`);
}

const timelineSource = await readFile(join(root, 'task-calendar-gantt-20260907.js'), 'utf8');
const timelineStylePattern = /const st=document\.createElement\('style'\);st\.id='taskTimelineStyles';st\.textContent=`([\s\S]*?)`;document\.head\.appendChild\(st\);/;
const timelineStyle = timelineSource.match(timelineStylePattern)?.[1];
if (!timelineStyle) throw new Error('Calendar/Gantt stylesheet could not be extracted.');
cssParts.push(`/* Source: task-calendar-gantt-20260907.js#taskTimelineStyles */\n${timelineStyle.trim()}`);

cssParts.push(`/* Canonical design system */\n${await readFile(join(root, 'unified-theme.css'), 'utf8')}`);

let html = sourceHtml.replace(stylesheetPattern, '').replace(stylePattern, '');
html = html.replace('</head>', '  <link id="bamcoUnifiedStyles" rel="stylesheet" href="bamco-unified.css?v=1">\n</head>');
html = html.replace(
  /<script>document\.head\.appendChild\(document\.querySelector\('#responsiveStyles'\)\);document\.head\.appendChild\(document\.querySelector\('#finalLayoutFix'\)\);<\/script>/,
  ''
);
html = html.replace(
  /(<script src="ui-extra-20260906\.js[^>]*><\/script>)/,
  `$1\n  <script data-sidebar-groups src="sidebar-groups-20260906.js?v=clean-1"></script>\n  <script data-user-request-fixes-v2 src="user-request-fixes-20260907-v2.js?v=clean-1"></script>\n  <script data-login-controls src="login-controls-20260907.js?v=clean-1"></script>\n  <script data-final-polish src="final-polish-20260907.js?v=clean-1"></script>`
);
html = html.replace(
  /(<script src="data-io\.js[^>]*><\/script>)/,
  `$1\n  <script src="ui-fixes-20260906.js?v=clean-3"></script>\n  <script src="task-calendar-gantt-20260907.js?v=clean-3"></script>\n  <script src="table-workbench.js?v=clean-3"></script>`
);
html = html.replace(
  '</body>',
  `  <script>\n    document.addEventListener('DOMContentLoaded', () => {\n      const canonical = document.querySelector('#bamcoUnifiedStyles');\n      if (canonical) document.head.appendChild(canonical);\n    }, { once: true });\n  </script>\n</body>`
);

await mkdir(release, { recursive: true });
await writeFile(join(release, 'bamco-unified.css'), `${cssParts.join('\n\n')}\n`);
await writeFile(join(release, 'index.html'), html);
await writeFile(join(root, 'index-clean.html'), html);
await writeFile(join(root, 'bamco-unified.css'), `${cssParts.join('\n\n')}\n`);

const runtimeFiles = [
  ...[...sourceHtml.matchAll(/<script\s+src="([^"?]+)(?:\?[^\"]*)?"\s*><\/script>/g)].map(match => match[1]),
  'sidebar-groups-20260906.js',
  'user-request-fixes-20260907-v2.js',
  'login-controls-20260907.js',
  'final-polish-20260907.js',
  'task-calendar-gantt-20260907.js',
  'table-workbench.js',
  'ui-fixes-20260906.js',
  'stable-layout-20260906.css',
  'sidebar-uniform-20260907.css',
  'navigation-layout-final.css',
  'unified-ui-20260907.css',
  'ui-fixes-20260906.css',
  'bamco-logo.png',
  'bamco-task-logo-white.png',
  'BAMCO_TASK_LOGO_WHITE_HEADER.png',
  'BAMCO_TASK_LOGO_WHITE_HEADER_V2.png',
  'vehicle-handover-blank.pdf'
];

for (const file of [...new Set(runtimeFiles)]) {
  await mkdir(dirname(join(release, file)), { recursive: true });
  await cp(join(root, file), join(release, file));
}

const uiExtraPath = join(release, 'ui-extra-20260906.js');
const uiExtra = await readFile(uiExtraPath, 'utf8');
await writeFile(
  uiExtraPath,
  uiExtra.replace(
    /function appendOrderedScript\(selector,src,dataName\)\{[\s\S]*?\n  \}/,
    'function appendOrderedScript(){ /* Bundled statically in the clean release. */ }'
  )
);

const dataIoPath = join(release, 'data-io.js');
const dataIo = await readFile(dataIoPath, 'utf8');
await writeFile(
  dataIoPath,
  dataIo.replace(
    /\n\/\/ Load the latest UI corrections[\s\S]*$/,
    '\n// UI modules are bundled explicitly by the release builder.\n'
  )
);

const timelinePath = join(release, 'task-calendar-gantt-20260907.js');
await writeFile(
  timelinePath,
  timelineSource
    .replace(timelineStylePattern, '')
    .replace("document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,200),{once:true});else setTimeout(boot,200)", "document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()")
);

console.log(`Clean release created at ${release}`);
