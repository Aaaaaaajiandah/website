const group = document.querySelector('.filter');
const phases = [...document.querySelectorAll('.phase')];
const buttons = [...document.querySelectorAll('[data-filter]')];
const status = document.querySelector('#filter-status');
const validFilters = new Set(buttons.map(button => button.dataset.filter));
function showFilter(filter, updateUrl = false) {
  if (!validFilters.has(filter)) filter = 'all';
  for (const phase of phases) phase.hidden = filter !== 'all' && phase.dataset.status !== filter;
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
  status.textContent = `${phases.filter(phase => !phase.hidden).length} phases shown.`;
  if (updateUrl) {
    const url = new URL(location.href);
    if (filter === 'all') url.searchParams.delete('status');
    else url.searchParams.set('status', filter);
    history.pushState(null, '', url);
  }
}
group.hidden = false;
group.addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (button) showFilter(button.dataset.filter, true);
});
window.addEventListener('popstate', () => showFilter(new URL(location.href).searchParams.get('status') || 'all'));
showFilter(new URL(location.href).searchParams.get('status') || 'all');
