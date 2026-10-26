// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  classifyLink,
  decorateLink,
  hasUsableText,
  initExternalLinks,
  mergeRel,
  normalizeHost,
  serviceForHost,
} from '../assets/js/modules/external-links.js';

const PAGE_URL = 'https://blog.example.com/posts/hello/';

const TEMPLATE = `
<template id="gh-external-link-icons">
  <span class="gh-external-link-icon" data-external-icon="generic"></span>
  <span class="gh-external-link-icon" data-external-icon="github"></span>
  <span class="gh-external-link-icon" data-external-icon="spotify"></span>
  <span class="gh-external-link-icon" data-external-icon="wikipedia"></span>
  <span data-external-link-label>Opens in a new tab</span>
</template>
`;

function mount(content) {
  document.body.innerHTML = `${TEMPLATE}<section class="gh-content">${content}</section>`;
}

function run() {
  initExternalLinks(document, PAGE_URL);
}

describe('normalizeHost', () => {
  it('lowercases and drops a leading www', () => {
    expect(normalizeHost('WWW.GitHub.COM')).toBe('github.com');
    expect(normalizeHost('blog.example.com')).toBe('blog.example.com');
  });

  it('handles empty and missing values', () => {
    expect(normalizeHost('')).toBe('');
    expect(normalizeHost(undefined)).toBe('');
  });
});

describe('serviceForHost', () => {
  it('matches the exact domain and subdomains', () => {
    expect(serviceForHost('github.com')).toBe('github');
    expect(serviceForHost('gist.github.com')).toBe('github');
    expect(serviceForHost('open.spotify.com')).toBe('spotify');
    expect(serviceForHost('it.wikipedia.org')).toBe('wikipedia');
    expect(serviceForHost('AWS.AMAZON.COM')).toBe('amazon');
  });

  it('does not match lookalike domains', () => {
    expect(serviceForHost('notgithub.com')).toBeNull();
    expect(serviceForHost('github.com.evil.test')).toBeNull();
    expect(serviceForHost('example.com')).toBeNull();
  });
});

describe('classifyLink', () => {
  it('treats relative and same-host absolute links as internal', () => {
    expect(classifyLink('/about/', PAGE_URL)).toBeNull();
    expect(classifyLink('https://blog.example.com/about/', PAGE_URL)).toBeNull();
    expect(classifyLink('https://www.blog.example.com/about/', PAGE_URL)).toBeNull();
  });

  it('treats subdomains of the page host as external', () => {
    expect(classifyLink('https://shop.blog.example.com/', PAGE_URL)).toMatchObject({
      service: null,
    });
  });

  it('classifies external links and their brand', () => {
    expect(classifyLink('https://github.com/acme', PAGE_URL)).toEqual({
      href: 'https://github.com/acme',
      service: 'github',
    });
    expect(classifyLink('https://open.spotify.com/show/1', PAGE_URL).service).toBe('spotify');
    expect(classifyLink('https://it.wikipedia.org/wiki/Astrix', PAGE_URL).service).toBe(
      'wikipedia',
    );
  });

  it('normalizes case and protocol-relative URLs', () => {
    expect(classifyLink('HTTPS://GitHub.COM/acme', PAGE_URL).service).toBe('github');
    expect(classifyLink('//github.com/acme', PAGE_URL).service).toBe('github');
  });

  it('ignores non-HTTP schemes, anchors and malformed URLs', () => {
    expect(classifyLink('mailto:hello@example.com', PAGE_URL)).toBeNull();
    expect(classifyLink('tel:+391234567', PAGE_URL)).toBeNull();
    expect(classifyLink('#section', PAGE_URL)).toBeNull();
    expect(classifyLink('javascript:alert(1)', PAGE_URL)).toBeNull();
    expect(classifyLink('http://[bad', PAGE_URL)).toBeNull();
    expect(classifyLink('', PAGE_URL)).toBeNull();
  });
});

describe('mergeRel', () => {
  it('adds noopener and noreferrer', () => {
    expect(mergeRel('').split(' ').sort()).toEqual(['noopener', 'noreferrer']);
  });

  it('keeps existing tokens and does not duplicate them', () => {
    const tokens = mergeRel('nofollow sponsored NOOPENER').split(' ');
    expect(tokens).toContain('nofollow');
    expect(tokens).toContain('sponsored');
    expect(tokens.filter((token) => token === 'noopener')).toHaveLength(1);
    expect(tokens).toContain('noreferrer');
  });
});

describe('hasUsableText', () => {
  it('accepts text and rejects whitespace only', () => {
    expect(hasUsableText('Read more')).toBe(true);
    expect(hasUsableText('  \n ')).toBe(false);
    expect(hasUsableText(null)).toBe(false);
  });
});

describe('initExternalLinks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('decorates an external link and sets a new tab', () => {
    mount('<p><a href="https://github.com/acme" rel="nofollow">Acme on GitHub</a></p>');
    const link = document.querySelector('a');

    run();

    expect(link.dataset.externalLink).toBe('');
    expect(link.dataset.externalService).toBe('github');
    expect(link.target).toBe('_blank');
    expect(link.rel.split(' ')).toEqual(['nofollow', 'noopener', 'noreferrer']);
    expect(link.getAttribute('href')).toBe('https://github.com/acme');
    expect(link.querySelector('[data-external-icon="github"]')).not.toBeNull();
    expect(link.querySelector('[data-external-link-label]').textContent).toBe('Opens in a new tab');
  });

  it('uses the generic icon for an unknown external domain', () => {
    mount('<p><a href="https://example.org/post">Example</a></p>');
    const link = document.querySelector('a');

    run();

    expect(link.dataset.externalService).toBe('generic');
    expect(link.querySelector('[data-external-icon="generic"]')).not.toBeNull();
  });

  it('uses the most specific brand for a subdomain', () => {
    mount('<p><a href="https://open.spotify.com/show/1">Listen</a></p>');
    const link = document.querySelector('a');

    run();

    expect(link.dataset.externalService).toBe('spotify');
  });

  it('leaves internal, anchor, mail and tel links untouched', () => {
    mount(`
      <p><a href="/about/">About</a></p>
      <p><a href="https://blog.example.com/contact/">Contact</a></p>
      <p><a href="https://www.blog.example.com/contact/">Contact</a></p>
      <p><a href="#notes">Notes</a></p>
      <p><a href="mailto:hello@example.com">Email</a></p>
      <p><a href="tel:+391234567">Call</a></p>
    `);

    run();

    for (const link of document.querySelectorAll('a')) {
      expect(link.dataset.externalLink).toBeUndefined();
      expect(link.hasAttribute('target')).toBe(false);
      expect(link.querySelector('[data-external-link-label]')).toBeNull();
      expect(link.querySelector('[data-external-icon]')).toBeNull();
    }
  });

  it('skips a link that wraps only an image', () => {
    mount(
      '<figure><a href="https://example.org/photo"><img src="photo.jpg" alt="Photo"></a></figure>',
    );
    const link = document.querySelector('a');

    run();

    expect(link.dataset.externalLink).toBeUndefined();
    expect(link.hasAttribute('target')).toBe(false);
  });

  it('skips links inside Ghost cards', () => {
    mount(
      '<div class="kg-card kg-bookmark-card"><a href="https://example.org/post">Bookmark</a></div>',
    );
    const link = document.querySelector('a');

    run();

    expect(link.dataset.externalLink).toBeUndefined();
    expect(link.hasAttribute('target')).toBe(false);
  });

  it('adds the icon and hidden label only once', () => {
    mount('<p><a href="https://example.org/post">Example</a></p>');
    const link = document.querySelector('a');

    run();
    run();

    expect(link.querySelectorAll('[data-external-icon]')).toHaveLength(1);
    expect(link.querySelectorAll('[data-external-link-label]')).toHaveLength(1);
    expect(link.rel.split(' ').filter((token) => token === 'noopener')).toHaveLength(1);
  });

  it('does not decorate a link twice through decorateLink', () => {
    mount('<p><a href="https://example.org/post">Example</a></p>');
    const link = document.querySelector('a');
    const template = document.getElementById('gh-external-link-icons');

    expect(decorateLink(link, null, template)).toBe(true);
    expect(decorateLink(link, 'github', template)).toBe(false);

    expect(link.dataset.externalService).toBe('generic');
    expect(link.querySelectorAll('[data-external-icon]')).toHaveLength(1);
  });
});
