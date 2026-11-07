document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('performanceStudent');
  const image = document.getElementById('performanceChart');
  if (!select || !image) return;

  select.addEventListener('change', () => {
    const base = `/analytics/chart/${image.dataset.chart}`;
    const id = select.value;
    image.src = id ? `${base}?student_id=${encodeURIComponent(id)}&_=${Date.now()}` : `${base}?_=${Date.now()}`;
  });
});