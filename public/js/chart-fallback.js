document.addEventListener(
  'error',
  (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !target.classList.contains('chart-img')) return;
    if (target.dataset.failed === '1') return;
    target.dataset.failed = '1';

    const message = document.createElement('div');
    message.className = 'chart-empty';
    message.textContent = 'Chart unavailable — analytics service is not responding.';
    target.replaceWith(message);
  },
  true
);