document.addEventListener('DOMContentLoaded', () => {
  // 1. Prefetch Links on Hover (Page pehle se load kar lo)
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

  // 2. Top Loading Bar (Click karne par orange line chalegi)
  const bar = document.createElement('div');
  bar.id = 'top-progress-bar';
  document.body.appendChild(bar);

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      if (link.target === '_blank' || e.ctrlKey || e.metaKey || link.href.includes('javascript:') || link.href.includes('logout')) return;
      
      bar.style.width = '20%';
      bar.style.opacity = '1';
      setTimeout(() => { bar.style.width = '60%'; }, 150);
      setTimeout(() => { bar.style.width = '90%'; }, 400);
    });
  });

  // Page unload hone par bar ko 100% karo
  window.addEventListener('beforeunload', () => {
    bar.style.width = '100%';
    bar.style.opacity = '0';
  });
});
