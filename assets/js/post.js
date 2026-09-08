/*
 * Astrix — post/page-only JavaScript, split out of main.js so the homepage,
 * tag and author archives don't parse and run the table-of-contents, reading
 * progress, code-copy, heading-anchor, lightbox and share modules they never
 * use. Loaded conditionally from default.hbs on the post/page contexts,
 * mirroring the built/post.css split.
 *
 * Every module here already early-returns when its DOM hooks are absent, so
 * this split is a load-cost optimisation, not a behaviour change.
 */
import { initToc } from './modules/toc.js';
import { initProgress } from './modules/progress.js';
import { initCodeCopy } from './modules/code-copy.js';
import { initHeadingAnchors } from './modules/heading-anchors.js';
import { initLightbox } from './modules/lightbox.js';
import { initShare } from './modules/share.js';

initToc();
initProgress();
initCodeCopy();
initHeadingAnchors();
initLightbox();
initShare();
