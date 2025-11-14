(async () => {
  const context = typeof window !== 'undefined' && typeof window.macroContext === 'object' && window.macroContext
    ? window.macroContext
    : {};
  const slugMatch = typeof context.slug === 'string' ? context.slug : '';
  const urlMatch = typeof context.url === 'string' ? context.url : '';
  const hostMatches = /plus-ex/.test(slugMatch) || /plus-ex/.test(urlMatch) || /plus-ex/.test(location.hostname);
  const isLocalReview = /^(localhost|127\.0\.0\.1)/.test(location.hostname);
  if (!hostMatches && !isLocalReview) {
    return;
  }

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForDomReady = async () => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      return;
    }
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  };

  const waitForSections = async () => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (document.querySelector('[data-section]')) {
        return true;
      }
      await wait(200);
    }
    return Boolean(document.querySelector('[data-section]'));
  };

  const resumeScroll = () => {
    document.body.classList.remove('scroll-lock', 'is-loading');
    document.documentElement.classList.remove('scroll-lock');
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    const smoother = window.ScrollSmoother;
    if (smoother && typeof smoother.paused === 'function') {
      try {
        smoother.paused(false);
      } catch (error) {
        console.warn('[plusx-loader] failed to resume ScrollSmoother', error);
      }
    }
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));
  };

  const forceReveal = async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      resumeScroll();
      await wait(300);
      if (!document.body.classList.contains('scroll-lock')) {
        break;
      }
    }
  };

  const scrollNarrative = async () => {
    const sections = Array.from(document.querySelectorAll('[data-section]'));
    if (sections.length === 0) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      await wait(600);
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    const step = Math.max(1, Math.floor(sections.length / 6));
    for (let index = 0; index < sections.length; index += step) {
      const element = sections[index];
      if (!element) {
        continue;
      }
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await wait(280);
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await wait(480);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  try {
    const unlockDelay = typeof context.waitMs === 'number' ? context.waitMs : 600;
    await waitForDomReady();
    await waitForSections();
    await wait(unlockDelay);
    await forceReveal();
    await wait(900);
    await scrollNarrative();
    document.body.dataset.toolkitScrollUnlocked = 'true';
  } catch (error) {
    console.warn('[plusx-loader] macro failed', error);
  }
})();
