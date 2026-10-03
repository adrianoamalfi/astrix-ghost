import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function normalizeVersion(tag) {
  return tag.replace(/^refs\/tags\//, '').replace(/^v/, '');
}

export function extractChangelogEntry(changelog, tag) {
  const version = normalizeVersion(tag);
  const heading = new RegExp(`^##\\s+${escapeRegExp(version)}\\s+—[^\\n]*$`, 'm');
  const match = changelog.match(heading);

  if (!match || match.index === undefined) {
    throw new Error(`CHANGELOG entry for ${version} not found`);
  }

  const bodyStart = match.index + match[0].length;
  const nextHeading = changelog.slice(bodyStart).search(/^##\s+\S/m);
  const bodyEnd = nextHeading === -1 ? changelog.length : bodyStart + nextHeading;
  const body = changelog.slice(bodyStart, bodyEnd).trim();

  if (!body) {
    throw new Error(`CHANGELOG entry for ${version} is empty`);
  }

  return body;
}

async function main(argv) {
  const [tag, outputPath, changelogPath = 'CHANGELOG.md'] = argv;

  if (!tag || !outputPath) {
    throw new Error(
      'usage: node scripts/extract-release-notes.mjs <tag> <output-path> [changelog-path]',
    );
  }

  const changelog = await readFile(changelogPath, 'utf8');
  const notes = extractChangelogEntry(changelog, tag);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${notes}\n`, 'utf8');
  console.log(`release: wrote CHANGELOG notes for ${normalizeVersion(tag)} to ${outputPath}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`release: ${error.message}`);
    process.exit(1);
  });
}
