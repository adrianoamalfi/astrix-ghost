import { describe, expect, it } from 'vitest';
import { extractChangelogEntry } from '../scripts/extract-release-notes.mjs';

const changelog = `# Changelog

## 0.3.2 — Release flow

### Fixed

- Keep packages clean.

## 0.3.1 — Recommendations

### New features

- Recommendations in the footer.

### Developer experience

- Node requirement documented.

## 0.3.0 — Rendered checks

### Quality

- CI renders Ghost pages.
`;

describe('extractChangelogEntry', () => {
  it('extracts the body for an existing version without the version heading', () => {
    expect(extractChangelogEntry(changelog, 'v0.3.1')).toBe(`### New features

- Recommendations in the footer.

### Developer experience

- Node requirement documented.`);
  });

  it('throws a clear error when the version is absent', () => {
    expect(() => extractChangelogEntry(changelog, 'v9.9.9')).toThrow(
      'CHANGELOG entry for 9.9.9 not found',
    );
  });

  it('throws a clear error when the version entry is empty', () => {
    const changelogWithEmptyEntry = `# Changelog

## 0.3.2 — Release flow

## 0.3.1 — Recommendations

### New features

- Recommendations in the footer.
`;

    expect(() => extractChangelogEntry(changelogWithEmptyEntry, 'v0.3.2')).toThrow(
      'CHANGELOG entry for 0.3.2 is empty',
    );
  });

  it('extracts the final entry in the changelog', () => {
    expect(extractChangelogEntry(changelog, '0.3.0')).toBe(`### Quality

- CI renders Ghost pages.`);
  });
});
