/**
 * 로컬 미리보기 서버. basePath(/insure) 를 그대로 재현해 배포 환경과 동일하게 확인한다.
 * 실행: node scripts/serve.mjs  → http://localhost:4173/insure/
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../site.config.mjs';

const root = path.resolve(fileURLToPath(import.meta.url), '../..');
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (site.basePath && urlPath.startsWith(site.basePath)) {
    urlPath = urlPath.slice(site.basePath.length) || '/';
  }
  let file = path.join(dist, urlPath);
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
  } catch {
    res.writeHead(404, { 'Content-Type': MIME['.html'] });
    res.end('<h1>404</h1>');
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': MIME['.html'] });
    res.end('<h1>404</h1>');
  }
}).listen(port, () => {
  console.log(`미리보기: http://localhost:${port}${site.basePath}/`);
});
