document.addEventListener('DOMContentLoaded', () => {
  // 1. Page Transition Fade-In
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.15s ease-in-out';
  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });

  // 2. Prefetch Links on Hover (Instant Load)
  const links = document.querySelectorAll('a');
  links.forEach(link => {
    if (
      link.hostname === location.hostname && 
      !link.hash && 
      !link.href.includes('logout') && 
      !link.href.includes('pdf') && 
      !link.href.includes('csv') &&
      !link.href.includes('javascript:')
    ) {
      link.addEventListener('mouseenter', () => {
        if (!link.dataset.prefetched) {
          const prefetch = document.createElement('link');
          prefetch.rel = 'prefetch';
          prefetch.href = link.href;
          document.head.appendChild(prefetch);
          link.dataset.prefetched = 'true';
        }
      }, { passive: true });
    }
  });

  // 3. Top Loading Bar + Fade Out on Click
  const bar = document.createElement('div');
  bar.id = 'top-progress-bar';
  document.body.appendChild(bar);

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      if (link.target === '_blank' || e.ctrlKey || e.metaKey || link.href.includes('javascript:') || link.href.includes('logout')) return;
      
      // Page fade out (andhera)
      document.body.style.opacity = '0.5';

      // Loading bar start
      bar.style.width = '20%';
      bar.style.opacity = '1';
      setTimeout(() => { bar.style.width = '60%'; }, 150);
      setTimeout(() => { bar.style.width = '90%'; }, 400);
    });
  });

  window.addEventListener('beforeunload', () => {
    bar.style.width = '100%';
    bar.style.opacity = '0';
  });
});
