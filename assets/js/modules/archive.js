/* Archive page (custom-archive.hbs): group the flat post index into one list
   per year with a year heading. No-JS keeps the flat list with full dates. */
export function initArchive() {
  const list = document.getElementById('gh-archive-posts');
  if (!list) return;

  const items = [...list.querySelectorAll('.gh-archive-post')];
  if (!items.length) return;

  const fragment = document.createDocumentFragment();
  let year = null;
  let group = null;

  for (const item of items) {
    if (item.dataset.year !== year) {
      year = item.dataset.year;
      const heading = document.createElement('h3');
      heading.className = 'gh-archive-year';
      heading.textContent = year;
      group = document.createElement('ol');
      group.className = 'gh-archive-posts';
      fragment.append(heading, group);
    }

    // Under a year heading the full date is redundant — show day + month
    const time = item.querySelector('time[data-in-year]');
    if (time) time.textContent = time.dataset.inYear;
    group.append(item);
  }

  list.replaceWith(fragment);
}
