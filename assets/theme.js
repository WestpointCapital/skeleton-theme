(() => {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const revealObserver = !reduceMotion.matches && 'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
      )
    : null;

  const observeReveals = (root = document) => {
    root.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((element) => {
      if (revealObserver) {
        document.documentElement.classList.add('reveal-ready');
        revealObserver.observe(element);
      } else {
        element.classList.add('is-visible');
      }
    });
  };

  const syncHeaders = () => {
    document.querySelectorAll('[data-header]').forEach((header) => {
      header.dataset.scrolled = window.scrollY > 24 ? 'true' : 'false';
    });
  };

  const initResponsiveVideos = (root = document) => {
    root.querySelectorAll('video[data-responsive-video]').forEach((video) => {
      if (video.dataset.responsiveReady === 'true') return;
      video.dataset.responsiveReady = 'true';

      const desktop = video.dataset.desktop || '';
      const mobile = video.dataset.mobile || desktop;
      const breakpoint = Number.parseInt(video.dataset.breakpoint || '750', 10);
      const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
      let current = 'desktop';

      const applySource = () => {
        const target = mediaQuery.matches && mobile ? 'mobile' : 'desktop';
        if (target === current) return;
        current = target;
        const url = target === 'mobile' ? mobile : desktop;
        if (!url) return;

        const wasPlaying = !video.paused && !video.dataset.userPaused;
        video.src = url;
        video.load();
        if (video.autoplay || wasPlaying) video.play().catch(() => {});
      };

      applySource();
      if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', applySource);
      else mediaQuery.addListener(applySource);
    });
  };

  const initVideoControls = (root = document) => {
    root.querySelectorAll('[data-video-section]').forEach((scope) => {
      if (scope.dataset.videoReady === 'true') return;
      const video = scope.querySelector('video');
      if (!video) return;
      scope.dataset.videoReady = 'true';

      const playButton = scope.querySelector('[data-video-play]');
      const muteButton = scope.querySelector('[data-video-mute]');
      const syncPlay = () => {
        if (playButton) playButton.dataset.state = video.paused ? 'paused' : 'playing';
      };
      const syncMute = () => {
        if (muteButton) muteButton.dataset.state = video.muted ? 'muted' : 'unmuted';
      };

      playButton?.addEventListener('click', (event) => {
        event.preventDefault();
        if (video.paused) {
          delete video.dataset.userPaused;
          video.play().catch(() => {});
        } else {
          video.dataset.userPaused = 'true';
          video.pause();
        }
        syncPlay();
      });

      muteButton?.addEventListener('click', (event) => {
        event.preventDefault();
        video.muted = !video.muted;
        if (!video.muted && video.paused) video.play().catch(() => {});
        syncMute();
        syncPlay();
      });

      video.addEventListener('play', syncPlay);
      video.addEventListener('pause', syncPlay);
      video.addEventListener('volumechange', syncMute);

      if ('IntersectionObserver' in window && !reduceMotion.matches) {
        const playState = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (video.dataset.userPaused) return;
              if (entry.isIntersecting && video.paused && video.autoplay) video.play().catch(() => {});
              if (!entry.isIntersecting && !video.paused) video.pause();
            });
          },
          { threshold: 0.2 }
        );
        playState.observe(video);
      }

      syncPlay();
      syncMute();
    });
  };

  let menuTrigger = null;

  const getMenu = () => document.querySelector('[data-mobile-menu]');

  const openMenu = (trigger) => {
    const menu = getMenu();
    if (!menu) return;
    menuTrigger = trigger;
    if (typeof menu.showModal === 'function') menu.showModal();
    else menu.setAttribute('open', '');
    document.documentElement.classList.add('menu-open');
  };

  const closeMenu = () => {
    const menu = getMenu();
    if (!menu?.hasAttribute('open')) return;
    if (typeof menu.close === 'function') menu.close();
    else menu.removeAttribute('open');
    document.documentElement.classList.remove('menu-open');
    menuTrigger?.focus();
    menuTrigger = null;
  };

  const openCartDrawer = () => {
    const drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return false;
    if (drawer instanceof HTMLDialogElement) {
      if (!drawer.open) drawer.showModal();
    } else {
      drawer.setAttribute('open', '');
    }
    drawer.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('cart-open');
    drawer.querySelector('[data-cart-close], button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
    return true;
  };

  const closeCartDrawer = () => {
    const drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return;
    if (drawer instanceof HTMLDialogElement && drawer.open) drawer.close();
    else drawer.removeAttribute('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('cart-open');
  };

  const syncCartCount = async () => {
    const response = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const cart = await response.json();
    document.querySelectorAll('[data-cart-count]').forEach((count) => {
      count.textContent = cart.item_count;
    });
    document.querySelectorAll('[data-cart-open]').forEach((trigger) => {
      trigger.setAttribute('aria-label', `Cart, ${cart.item_count} items`);
    });
  };

  const refreshCartDrawer = async () => {
    const response = await fetch('/cart?section_id=cart-drawer', {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    if (!response.ok) throw new Error(`Cart drawer refresh failed: ${response.status}`);

    const markup = await response.text();
    const documentFragment = new DOMParser().parseFromString(markup, 'text/html');
    const nextSection = documentFragment.querySelector('#shopify-section-cart-drawer');
    const currentSection = document.querySelector('#shopify-section-cart-drawer');
    if (!nextSection || !currentSection) throw new Error('Cart drawer section was not found');

    currentSection.replaceWith(nextSection);
    await syncCartCount();
    openCartDrawer();
  };

  document.addEventListener('click', (event) => {
    const menuOpen = event.target.closest('[data-menu-open]');
    if (menuOpen) {
      event.preventDefault();
      openMenu(menuOpen);
      return;
    }

    if (event.target.closest('[data-menu-close]')) {
      event.preventDefault();
      closeMenu();
      return;
    }

    const cartClose = event.target.closest('[data-cart-close]');
    if (cartClose) {
      event.preventDefault();
      closeCartDrawer();
      return;
    }

    const cartOpen = event.target.closest('[data-cart-open]');
    if (cartOpen && openCartDrawer()) event.preventDefault();
  });

  document.addEventListener('click', (event) => {
    const menu = getMenu();
    if (event.target === menu) closeMenu();

    const drawer = document.querySelector('[data-cart-drawer]');
    if (event.target === drawer && drawer instanceof HTMLDialogElement) closeCartDrawer();
  });

  document.addEventListener('cancel', (event) => {
    if (event.target.matches('[data-mobile-menu]')) {
      event.preventDefault();
      closeMenu();
    }
    if (event.target.matches('[data-cart-drawer]')) {
      event.preventDefault();
      closeCartDrawer();
    }
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-product-form]');
    if (!form || event.defaultPrevented || !window.fetch || !window.FormData) return;

    event.preventDefault();
    const submitter = event.submitter;
    submitter?.setAttribute('aria-disabled', 'true');
    if (submitter) submitter.disabled = true;

    let itemAdded = false;
    try {
      const formData = new FormData(form);
      if (submitter?.name) formData.append(submitter.name, submitter.value);
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.description || 'Unable to add this item');
      }

      itemAdded = true;
      await refreshCartDrawer();
      form.dispatchEvent(new CustomEvent('cart:item-added', { bubbles: true }));
    } catch (error) {
      form.dispatchEvent(new CustomEvent('cart:error', { bubbles: true, detail: { error } }));
      if (itemAdded) window.location.assign('/cart');
      else HTMLFormElement.prototype.submit.call(form);
    } finally {
      submitter?.removeAttribute('aria-disabled');
      if (submitter) submitter.disabled = false;
    }
  });

  const initialize = (root = document) => {
    observeReveals(root);
    initResponsiveVideos(root);
    initVideoControls(root);
    syncHeaders();
  };

  window.addEventListener('scroll', syncHeaders, { passive: true });
  document.addEventListener('shopify:section:load', (event) => initialize(event.target || document));
  document.addEventListener('shopify:section:unload', () => {
    if (!getMenu()) document.documentElement.classList.remove('menu-open');
  });
  initialize();
})();
