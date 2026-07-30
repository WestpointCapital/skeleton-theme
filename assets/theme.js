/* Global theme behaviors: reveals, header, video, cart, search, commerce. */
(() => {
  document.documentElement.classList.add('reveal-ready');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  const getSectionId = (el) => {
    const section = el.closest('.shopify-section');
    if (!section || !section.id) return null;
    return section.id.replace(/^shopify-section-/, '');
  };

  const fetchSectionHtml = async (sectionId, url = window.location.pathname) => {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}sections=${sectionId}`);
    if (!response.ok) throw new Error('Section fetch failed');
    const data = await response.json();
    return data[sectionId];
  };

  /* Responsive background video: swap desktop/mobile source by viewport */
  const initResponsiveVideos = (root = document) => {
    root.querySelectorAll('video[data-responsive-video]').forEach((video) => {
      if (video.dataset.responsiveReady === 'true') return;
      video.dataset.responsiveReady = 'true';

      const desktop = video.dataset.desktop || '';
      const mobile = video.dataset.mobile || desktop;
      const bp = parseInt(video.dataset.breakpoint || '750', 10);
      const mq = window.matchMedia(`(max-width: ${bp}px)`);
      const lazy = video.hasAttribute('data-lazy-video');
      let current = 'desktop';
      let loaded = !lazy;

      const setSource = (force = false) => {
        const target = mq.matches && mobile ? 'mobile' : 'desktop';
        if (!force && target === current && loaded) return;
        current = target;

        const url = target === 'mobile' ? mobile : desktop;
        if (!url) return;

        const wasPlaying = !video.paused && !video.dataset.userPaused;
        video.src = url;
        video.load();
        loaded = true;
        if ((video.autoplay || wasPlaying) && !reducedMotion && !video.dataset.userPaused) {
          video.play().catch(() => {});
        }
      };

      if (lazy) {
        const lazyObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              setSource(true);
              lazyObserver.disconnect();
            }
          },
          { rootMargin: '200px 0px' }
        );
        lazyObserver.observe(video);
      } else {
        setSource(true);
      }

      if (mq.addEventListener) {
        mq.addEventListener('change', () => setSource(true));
      } else if (mq.addListener) {
        mq.addListener(() => setSource(true));
      }

      if (reducedMotion) {
        video.removeAttribute('autoplay');
        video.pause();
        video.dataset.userPaused = 'true';
      }
    });
  };

  /* Cinematic media: play/pause + mute toggles */
  const initVideoControls = (root = document) => {
    root.querySelectorAll('[data-video-section]').forEach((scope) => {
      if (scope.dataset.videoReady === 'true') return;
      const video = scope.querySelector('video');
      if (!video) return;
      scope.dataset.videoReady = 'true';

      const playBtn = scope.querySelector('[data-video-play]');
      const muteBtn = scope.querySelector('[data-video-mute]');

      const syncPlay = () => {
        if (playBtn) playBtn.dataset.state = video.paused ? 'paused' : 'playing';
      };
      const syncMute = () => {
        if (muteBtn) muteBtn.dataset.state = video.muted ? 'muted' : 'unmuted';
      };

      if (playBtn) {
        playBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (video.paused) {
            video.dataset.userPaused = '';
            video.play().catch(() => {});
          } else {
            video.dataset.userPaused = 'true';
            video.pause();
          }
          syncPlay();
        });
      }

      if (muteBtn) {
        muteBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          video.muted = !video.muted;
          syncMute();
          if (!video.muted && video.paused) {
            video.play().catch(() => {});
            syncPlay();
          }
        });
      }

      video.addEventListener('play', syncPlay);
      video.addEventListener('pause', syncPlay);
      video.addEventListener('volumechange', syncMute);

      const playState = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (video.dataset.userPaused || reducedMotion) continue;
            if (entry.isIntersecting && video.paused && video.autoplay) {
              video.play().catch(() => {});
            } else if (!entry.isIntersecting && !video.paused) {
              video.pause();
            }
          }
        },
        { threshold: 0.2 }
      );
      playState.observe(video);

      syncPlay();
      syncMute();
    });
  };

  /* Horizontal product rails */
  const initRails = (root = document) => {
    root.querySelectorAll('[data-rail-scope]').forEach((scope) => {
      if (scope.dataset.railReady === 'true') return;
      const rail = scope.querySelector('[data-rail]');
      if (!rail) return;
      scope.dataset.railReady = 'true';

      const prev = scope.querySelector('[data-rail-prev]');
      const next = scope.querySelector('[data-rail-next]');
      const progress = scope.querySelector('[data-rail-progress]');

      const updateProgress = () => {
        if (!progress) return;
        const max = rail.scrollWidth - rail.clientWidth;
        const ratio = max > 0 ? rail.scrollLeft / max : 0;
        progress.style.transform = `scaleX(${Math.max(0.08, ratio)})`;
      };

      const scrollByCard = (direction) => {
        const card = rail.querySelector('.product-card, .piece-card');
        const amount = card ? card.getBoundingClientRect().width + 24 : rail.clientWidth * 0.8;
        rail.scrollBy({ left: amount * direction, behavior: reducedMotion ? 'auto' : 'smooth' });
      };

      if (prev) prev.addEventListener('click', () => scrollByCard(-1));
      if (next) next.addEventListener('click', () => scrollByCard(1));
      rail.addEventListener('scroll', updateProgress, { passive: true });
      updateProgress();
    });
  };

  /* Facet auto-submit */
  const initFacets = (root = document) => {
    root.querySelectorAll('[data-facets]').forEach((form) => {
      if (form.dataset.facetsReady === 'true') return;
      form.dataset.facetsReady = 'true';
      form.addEventListener('change', () => form.submit());
    });
  };

  /* Product variant picker */
  const initVariantPickers = (root = document) => {
    root.querySelectorAll('[data-product-form]').forEach((form) => {
      if (form.dataset.productReady === 'true') return;
      form.dataset.productReady = 'true';

      const section = form.closest('[data-product-section]') || form;
      const variants = JSON.parse(form.dataset.variants || '[]');
      const optionInputs = form.querySelectorAll('[data-option-input]');
      const idInput = form.querySelector('[name="id"]');
      const priceEl = section.querySelector('[data-product-price]');
      const submitBtn = form.querySelector('[data-add-to-cart]');
      const availabilityEl = section.querySelector('[data-product-availability]');

      const selectedOptions = () =>
        Array.from(form.querySelectorAll('[data-option-index]')).map((group) => {
          const checked = group.querySelector('[data-option-input]:checked, [data-option-input]:checked');
          const select = group.querySelector('select[data-option-input]');
          if (select) return select.value;
          return checked ? checked.value : null;
        });

      const findVariant = () => {
        const options = selectedOptions();
        return variants.find((variant) =>
          variant.options.every((option, index) => option === options[index])
        );
      };

      const sync = () => {
        const variant = findVariant();
        if (!variant || !idInput) return;
        idInput.value = variant.id;
        idInput.dispatchEvent(new Event('change', { bubbles: true }));

        if (priceEl) {
          priceEl.innerHTML = variant.price_html || priceEl.innerHTML;
        }

        if (submitBtn) {
          submitBtn.disabled = !variant.available;
          submitBtn.textContent = variant.available
            ? submitBtn.dataset.addLabel || 'Add to cart'
            : submitBtn.dataset.soldLabel || 'Sold out';
        }

        if (availabilityEl) {
          availabilityEl.hidden = variant.available;
        }

        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url);

        const media = section.querySelector(`[data-media-id="${variant.featured_media?.id}"]`);
        if (media) {
          section.querySelectorAll('[data-media-id]').forEach((item) => {
            item.hidden = item !== media;
          });
        }
      };

      optionInputs.forEach((input) => input.addEventListener('change', sync));
      sync();

      form.addEventListener('submit', async (event) => {
        if (!form.hasAttribute('data-ajax-cart')) return;
        event.preventDefault();
        const formData = new FormData(form);
        try {
          const response = await fetch(`${window.themeRoutes?.cartAdd || '/cart/add.js'}`, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: formData,
          });
          if (!response.ok) throw new Error('Add to cart failed');
          document.dispatchEvent(new CustomEvent('cart:refresh'));
          const drawer = document.querySelector('[data-cart-drawer]');
          if (drawer && typeof drawer.showModal === 'function') drawer.showModal();
        } catch (error) {
          console.error(error);
          form.removeAttribute('data-ajax-cart');
          form.submit();
        }
      });
    });
  };

  /* Cart drawer */
  const initCartDrawer = () => {
    const drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer || drawer.dataset.cartReady === 'true') return;
    drawer.dataset.cartReady = 'true';

    const sectionId = drawer.dataset.sectionId;
    const openers = document.querySelectorAll('[data-cart-open]');
    const closers = drawer.querySelectorAll('[data-cart-close]');

    const refresh = async () => {
      if (!sectionId) return;
      try {
        const response = await fetch(`/?sections=${sectionId}`);
        const data = await response.json();
        const markup = data[sectionId];
        if (!markup) return;
        const doc = new DOMParser().parseFromString(markup, 'text/html');
        const next = doc.querySelector('[data-cart-drawer]');
        if (!next) return;
        drawer.innerHTML = next.innerHTML;
        const count = next.dataset.itemCount || '0';
        document.querySelectorAll('[data-cart-count]').forEach((el) => {
          el.textContent = count;
          el.hidden = count === '0';
        });
        bindDrawerEvents();
      } catch (error) {
        console.error(error);
      }
    };

    const bindDrawerEvents = () => {
      drawer.querySelectorAll('[data-cart-close]').forEach((btn) => {
        btn.addEventListener('click', () => drawer.close());
      });

      drawer.querySelectorAll('[data-qty-change]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const key = btn.dataset.lineKey;
          const quantity = parseInt(btn.dataset.qtyChange, 10);
          await fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ id: key, quantity }),
          });
          await refresh();
        });
      });

      drawer.querySelectorAll('[data-cart-remove]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const key = btn.dataset.lineKey;
          await fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ id: key, quantity: 0 }),
          });
          await refresh();
        });
      });
    };

    openers.forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        if (typeof drawer.showModal === 'function') drawer.showModal();
      });
    });

    closers.forEach((btn) => btn.addEventListener('click', () => drawer.close()));
    drawer.addEventListener('click', (event) => {
      if (event.target === drawer) drawer.close();
    });

    document.addEventListener('cart:refresh', refresh);
    bindDrawerEvents();
  };

  /* Predictive search */
  const initPredictiveSearch = (root = document) => {
    root.querySelectorAll('[data-predictive-search]').forEach((scope) => {
      if (scope.dataset.searchReady === 'true') return;
      scope.dataset.searchReady = 'true';

      const input = scope.querySelector('[data-search-input]');
      const results = scope.querySelector('[data-search-results]');
      if (!input || !results) return;

      let timer;
      const render = async (query) => {
        if (!query || query.length < 2) {
          results.hidden = true;
          results.innerHTML = '';
          return;
        }
        try {
          const response = await fetch(
            `${window.themeRoutes?.predictiveSearch || '/search/suggest'}?q=${encodeURIComponent(query)}&resources[type]=product,article,page&resources[limit]=6&section_id=predictive-search`
          );
          if (!response.ok) throw new Error('Search failed');
          const text = await response.text();
          const doc = new DOMParser().parseFromString(text, 'text/html');
          const section = doc.querySelector('.predictive-search') || doc.body;
          results.innerHTML = section.innerHTML;
          results.hidden = false;
        } catch (error) {
          results.hidden = true;
        }
      };

      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => render(input.value.trim()), 220);
      });

      input.addEventListener('focus', () => {
        if (results.innerHTML.trim()) results.hidden = false;
      });

      document.addEventListener('click', (event) => {
        if (!scope.contains(event.target)) results.hidden = true;
      });
    });
  };

  /* Product gallery thumbs */
  const initGalleries = (root = document) => {
    root.querySelectorAll('[data-product-gallery]').forEach((gallery) => {
      if (gallery.dataset.galleryReady === 'true') return;
      gallery.dataset.galleryReady = 'true';
      const mainItems = gallery.querySelectorAll('[data-gallery-main] [data-media-id]');
      gallery.querySelectorAll('[data-gallery-thumb]').forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const id = thumb.dataset.galleryThumb;
          mainItems.forEach((item) => {
            item.hidden = item.dataset.mediaId !== id;
          });
          gallery.querySelectorAll('[data-gallery-thumb]').forEach((btn) => {
            btn.setAttribute('aria-current', btn === thumb ? 'true' : 'false');
          });
        });
      });
    });
  };

  const boot = (root = document) => {
    initResponsiveVideos(root);
    initVideoControls(root);
    initRails(root);
    initFacets(root);
    initVariantPickers(root);
    initPredictiveSearch(root);
    initGalleries(root);
  };

  /* Product recommendations lazy load */
  if (!customElements.get('product-recommendations')) {
    customElements.define(
      'product-recommendations',
      class ProductRecommendations extends HTMLElement {
        connectedCallback() {
          const url = this.dataset.url;
          if (!url || this.dataset.loaded === 'true') return;
          if (this.querySelector('.recs')) {
            this.dataset.loaded = 'true';
            boot(this);
            return;
          }
          fetch(url)
            .then((response) => response.text())
            .then((text) => {
              const doc = new DOMParser().parseFromString(text, 'text/html');
              const section = doc.querySelector('product-recommendations');
              if (section && section.innerHTML.trim().length) {
                this.innerHTML = section.innerHTML;
                this.dataset.loaded = 'true';
                boot(this);
              }
            })
            .catch(() => {});
        }
      }
    );
  }

  boot();
  initCartDrawer();

  document.addEventListener('shopify:section:load', (event) => {
    boot(event.target || document);
    initCartDrawer();
  });
})();
