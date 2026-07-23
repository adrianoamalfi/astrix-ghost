import { describe, it, expect } from 'vitest';
import { slugify, safeDecode } from '../assets/js/modules/utils.js';

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('collapses runs of non-alphanumerics into a single hyphen', () => {
    expect(slugify('a  --  b')).toBe('a-b');
    expect(slugify('Foo: Bar / Baz')).toBe('foo-bar-baz');
  });

  it('trims leading and trailing separators', () => {
    expect(slugify('  ...Hi!  ')).toBe('hi');
    expect(slugify('---edge---')).toBe('edge');
  });

  it('keeps letters and numbers from any script (Unicode-aware)', () => {
    expect(slugify('Città 21')).toBe('città-21');
    expect(slugify('Ελληνικά')).toBe('ελληνικά');
  });

  it('returns an empty string when there is nothing sluggable', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('   ')).toBe('');
  });
});

describe('safeDecode', () => {
  it('decodes valid percent-encoding', () => {
    expect(safeDecode('caf%C3%A9')).toBe('café');
    expect(safeDecode('a%20b')).toBe('a b');
  });

  it('returns the raw value instead of throwing on malformed encoding', () => {
    expect(safeDecode('%')).toBe('%');
    expect(safeDecode('100%-done')).toBe('100%-done');
    expect(safeDecode('%E0%A4%A')).toBe('%E0%A4%A');
  });

  it('passes plain strings through unchanged', () => {
    expect(safeDecode('section-title')).toBe('section-title');
  });
});
