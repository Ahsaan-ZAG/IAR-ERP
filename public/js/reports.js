document.addEventListener('DOMContentLoaded', () => {
  const fromInput = document.getElementById('fromInput');
  const toInput = document.getElementById('toInput');

  document.querySelectorAll('[data-report-link]').forEach((link) => {
    link.addEventListener('click', () => {
      const key = link.dataset.reportKey;
      const fmt = link.dataset.reportFmt;
      const from = fromInput?.value || '';
      const to = toInput?.value || '';
      link.href = `/reports/${fmt}/${key}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    });
  });
});