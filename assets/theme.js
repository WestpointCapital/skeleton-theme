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

  /* Cinematic media: play/pause + mute toggles (hero, video story) */
  const initVideoControls = (root = document) => {
    root.querySelectorAll('[data-media-video]').forEach((wrap) => {
      if (wrap.dataset.videoReady === 'true') return;
      const video = wrap.querySelector('video');
      if (!video) return;
      wrap.dataset.videoReady = 'true';

      const playBtn = wrap.querySelector('[data-video-play]');
      const muteBtn = wrap.querySelector('[data-video-mute]');

      const syncPlay = () => {
        if (playBtn) playBtn.dataset.state = video.paused ? 'paused' : 'playing';
      };
      const syncMute = () => {
        if (muteBtn) muteBtn.dataset.state = video.muted ? 'muted' : 'unmuted';
      };

      if (playBtn) {
        playBtn.addEventListener('click', () => {
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
        });
      }
      if (muteBtn) {
        muteBtn.addEventListener('click', () => {
          video.muted = !video.muted;
          syncMute();
        });
      }

      video.addEventListener('play', syncPlay);
      video.addEventListener('pause', syncPlay);
      video.addEventListener('volumechange', syncMute);

      /* Pause offscreen videos to save resources, resume when visible */
      const playState = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!video.dataset.userPaused) {
              if (entry.isIntersecting && video.paused && video.autoplay) {
                video.play().catch(() => {});
              } else if (!entry.isIntersecting && !video.paused) {
                video.pause();
              }
            }
          }
        },
        { threshold: 0.2 }
      );
      playState.observe(video);

      /* Track explicit user pause so we don't auto-resume against their wish */
      if (playBtn) {
        playBtn.addEventListener('click', () => {
          video.dataset.userPaused = video.paused ? 'true' : '';
        });
      }

      syncPlay();
      syncMute();
    });
  };

  initVideoControls();
  document.addEventListener('shopify:section:load', (event) => {
    initVideoControls(event.target || document);
  });
})();
