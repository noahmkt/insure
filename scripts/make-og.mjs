/**
 * OG 이미지(1200×630 PNG) 생성.
 * SNS·검색 플랫폼 대부분이 SVG 미리보기를 지원하지 않으므로 PNG 로 렌더링해 둔다.
 * 실행: node scripts/make-og.mjs   (playwright 필요, 빌드 파이프라인과 분리)
 */
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(import.meta.url), '../..');

const svg = await readFile(path.join(root, 'assets/img/og-default.svg'), 'utf8');
await mkdir(path.join(root, 'assets/img'), { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(
  `<html><body style="margin:0">${svg}</body></html>`,
  { waitUntil: 'load' },
);
await page.screenshot({ path: path.join(root, 'assets/img/og-default.png') });
await browser.close();
console.log('OG 이미지 생성 완료: assets/img/og-default.png');
