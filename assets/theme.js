/* Global theme behaviors: scroll reveals + header scroll state. */
(() => {
  document.documentElement.classList.add('reveal-ready');

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
  );

  const observeReveals = () => {
    document
      .querySelectorAll('[data-reveal]:not(.is-visible)')
      .forEach((el) => observer.observe(el));
  };

  observeReveals();
  document.addEventListener('shopify:section:load', observeReveals);

  const header = document.querySelector('[data-header]');
  if (header) {
    const onScroll = () => {
      header.dataset.scrolled = window.scrollY > 24 ? 'true' : 'false';
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
