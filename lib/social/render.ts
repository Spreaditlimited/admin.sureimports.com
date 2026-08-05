import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

import { SURE_IMPORTS_URL, SURE_IMPORTS_WHATSAPP } from '@/lib/social/config';
import type { SocialCopy } from '@/lib/social/openai';

const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] || char);

function wrap(value: string, max: number) {
  const words = value.trim().split(/\s+/); const lines: string[] = []; let line = '';
  for (const word of words) {
    if (`${line} ${word}`.trim().length > max && line) { lines.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
}

function textLines(lines: string[], x: number, y: number, size: number, gap: number, color: string, weight = 800) {
  return lines.map((line, i) => `<text x="${x}" y="${y + i * gap}" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}">${esc(line)}</text>`).join('');
}

export async function renderSocialDesign(background: Buffer, copy: SocialCopy) {
  const accent = copy.accentPhrase.trim();
  const baseHeadline = copy.headline.replace(new RegExp(`${accent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'), '').trim();
  const baseLines = wrap(baseHeadline, 20).slice(0, 3);
  const subLines = wrap(copy.subtext, 39).slice(0, 4);
  const accentY = 286 + baseLines.length * 78;
  const subY = accentY + 88;
  const whatsApp = copy.includeWhatsapp ? `WhatsApp only: ${SURE_IMPORTS_WHATSAPP}` : '';
  const svg = `
  <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#090817" stop-opacity=".98"/><stop offset=".57" stop-color="#131027" stop-opacity=".88"/><stop offset="1" stop-color="#1c1430" stop-opacity=".2"/></linearGradient>
      <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#080713" stop-opacity="0"/><stop offset="1" stop-color="#080713" stop-opacity=".9"/></linearGradient>
    </defs>
    <rect width="1080" height="1080" fill="url(#shade)"/><rect width="1080" height="1080" fill="url(#bottom)"/>
    <rect x="62" y="151" width="250" height="42" rx="21" fill="#f36f21"/>
    <text x="187" y="179" text-anchor="middle" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="800" letter-spacing="2.4">IMPORT INTELLIGENCE</text>
    <text x="64" y="229" fill="#cdc8df" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" letter-spacing="3">DAILY BUSINESS BRIEF</text>
    ${textLines(baseLines, 62, 286, 66, 78, '#ffffff', 900)}
    <text x="62" y="${accentY}" fill="#ff7a2a" font-family="Arial, Helvetica, sans-serif" font-size="70" font-weight="900">${esc(accent)}</text>
    <rect x="62" y="${subY - 34}" width="7" height="${Math.max(80, subLines.length * 34)}" rx="4" fill="#f36f21"/>
    ${textLines(subLines, 88, subY, 27, 36, '#e8e5f0', 500)}
    <g transform="translate(62 820)"><rect width="310" height="57" rx="10" fill="#ffffff"/><text x="26" y="37" fill="#171126" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800">${esc(copy.actionLabel)}</text><text x="282" y="37" fill="#f36f21" font-family="Arial" font-size="28" font-weight="900">→</text></g>
    <path d="M790 120 C905 210 840 350 952 440 S872 710 985 845" fill="none" stroke="#ff7a2a" stroke-width="3" opacity=".85"/>
    <circle cx="790" cy="120" r="8" fill="#ff7a2a"/><circle cx="952" cy="440" r="8" fill="#fff"/><circle cx="985" cy="845" r="8" fill="#ff7a2a"/>
    <line x1="62" y1="956" x2="1018" y2="956" stroke="#ffffff" stroke-opacity=".22"/>
    <text x="62" y="1003" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800">sureimports.com</text>
    ${whatsApp ? `<text x="1018" y="1003" text-anchor="end" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700">${esc(whatsApp)}</text>` : ''}
  </svg>`;
  const logoPath = path.join(process.cwd(), 'public/assets/images/logo-white.png');
  const logo = await sharp(await fs.readFile(logoPath)).resize({ width: 220, withoutEnlargement: true }).png().toBuffer();
  return sharp(background).resize(1080, 1080, { fit: 'cover' }).composite([
    { input: Buffer.from(svg), top: 0, left: 0 }, { input: logo, top: 55, left: 62 },
  ]).jpeg({ quality: 94, chromaSubsampling: '4:4:4' }).toBuffer();
}
