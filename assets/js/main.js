/*
 * Astrix — site-wide JavaScript, loaded on every page from default.hbs.
 * Post/page-only modules (toc, progress, code-copy, heading-anchors,
 * lightbox, share) live in post.js, loaded conditionally on those contexts.
 */
import { initColorScheme } from './modules/color-scheme.js';
import { initNav } from './modules/nav.js';
import { initComments } from './modules/comments.js';
import { initArchive } from './modules/archive.js';
import { initInfiniteScroll } from './modules/infinite-scroll.js';
import { initBackToTop } from './modules/back-to-top.js';

initColorScheme();
initNav();
initComments();
initArchive();
initInfiniteScroll();
initBackToTop();
