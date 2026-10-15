import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { imageKey, extractImages } from '../assets/js/modules/photos.js';

// No DOM library in the toolchain: minimal stand-ins for the few members
// extractImages touches (getAttribute, closest, querySelector on the figure).
function fakeImg(attrs, caption = '') {
  const figure = {
    querySelector: () => (caption ? { innerHTML: caption } : null),
  };
  return {
    getAttribute: (name) => attrs[name] ?? null,
    closest: (selector) => (selector === 'figure.kg-image-card' && caption ? figure : null),
  };
}

const body = (imgs) => ({ querySelectorAll: () => imgs });

describe('imageKey', () => {
  it('ignores Ghost size paths, query strings and the host', () => {
    expect(imageKey('https://x.com/content/images/size/w1600/2024/a.jpg?v=1')).toBe(
      '/content/images/2024/a.jpg',
    );
    expect(imageKey('/content/images/2024/a.jpg')).toBe('/content/images/2024/a.jpg');
  });
});

describe('extractImages', () => {
  const imgs = () => [
    fakeImg({ src: '/content/images/2024/a.jpg', alt: 'A' }, 'Cap A'),
    fakeImg({ src: '/content/images/size/w600/2024/b.jpg', alt: 'B' }),
    fakeImg({ src: '/content/images/2024/c.jpg', alt: 'C' }),
    fakeImg({ src: '/content/images/size/w1000/2024/a.jpg', alt: 'A again' }),
  ];

  it('keeps document order and preserves alt and captions', () => {
    const items = extractImages(body(imgs()));
    expect(items.map((i) => i.alt)).toEqual(['A', 'B', 'C', 'A again']);
    expect(items[0].caption).toBe('Cap A');
  });

  it('flags duplicates, including images already in the slider', () => {
    const seen = new Set(['/content/images/2024/b.jpg']);
    const items = extractImages(body(imgs()), seen);
    expect(items.map((i) => i.duplicate)).toEqual([false, true, false, true]);
  });
});

describe('#photos templates', () => {
  const read = (file) => readFileSync(file, 'utf8');

  it('filters photo posts out before limit and pagination in every ordinary list', () => {
    for (const file of ['tag.hbs', 'author.hbs', 'partials/related-posts.hbs', 'home.hbs']) {
      expect(read(file)).toContain('tag:-hash-photos');
    }
    expect(read('partials/post-nav.hbs')).toContain('tag:-hash-photos');
    expect(read('routes.example.yaml')).toContain('filter: tag:-hash-photos');
  });

  it('serves the index from the #photos collection and picks the post page by tag', () => {
    expect(read('routes.example.yaml')).toMatch(
      /\/photos\/:[\s\S]*template: photos[\s\S]*filter: tag:hash-photos/,
    );
    expect(read('post.hbs')).toContain('{{#has tag="#photos"}}');
  });

  it('never prints the body images of the slider on the grid, only inside a template', () => {
    expect(read('partials/photo-slider.hbs')).toMatch(
      /<template data-photo-source>\{\{content\}\}<\/template>/,
    );
  });
});
