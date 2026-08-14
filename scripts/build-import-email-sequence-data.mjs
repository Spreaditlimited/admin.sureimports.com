import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');
const sourcePath = path.resolve(
  projectDir,
  '../sureimports.com/docs/IMPORT_EMAIL_SEQUENCE_52_WEEKS.md',
);
const outputPath = path.resolve(
  projectDir,
  'lib/marketing/data/import-email-sequence-52-weeks.json',
);

const source = fs.readFileSync(sourcePath, 'utf8');
const headings = [...source.matchAll(/^## (Welcome Email|Email (\d+): (.+))$/gm)];

const steps = headings.map((heading, index) => {
  const start = heading.index + heading[0].length;
  const end = headings[index + 1]?.index ?? source.length;
  const section = source.slice(start, end).trim();
  const subject = section.match(/^Subject:\s*(.+)$/m)?.[1]?.trim();
  const previewText = section.match(/^Preview:\s*(.+)$/m)?.[1]?.trim();
  const bodyMatch = section.match(/^Body:\s*\n([\s\S]*?)\n\nCTA:\s*(.+?)\n\nCTA URL:\s*`([^`]+)`/m);
  const stepNumber = heading[1] === 'Welcome Email' ? 0 : Number(heading[2]);

  if (!subject || !previewText || !bodyMatch) {
    throw new Error(`Could not parse sequence section: ${heading[0]}`);
  }

  return {
    stepNumber,
    delayDays: stepNumber * 7,
    title: heading[1] === 'Welcome Email' ? 'Welcome Email' : heading[3].trim(),
    subject,
    previewText,
    bodyText: bodyMatch[1]
      .trim()
      .replace(/\{\{\s*subscriber\.first_name\s*\|\s*default:\s*"there"\s*\}\}/g, '{{firstName}}'),
    ctaLabel: bodyMatch[2].trim(),
    ctaUrl: bodyMatch[3].trim(),
  };
});

if (steps.length !== 53 || steps.at(-1)?.stepNumber !== 52) {
  throw new Error(`Expected welcome plus 52 emails, found ${steps.length}`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      pidSequence: 'SEQ-CHINA-IMPORT-52-WEEKS',
      name: 'China Import 52-Week Series',
      description:
        'Welcome email followed by one practical China-import lesson every week for 52 weeks.',
      triggerKey: 'general-insights-opt-in',
      cadence: 'WEEKLY',
      steps,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote ${steps.length} sequence steps to ${outputPath}`);
