(() => {
  const apiHost = 'https://eu.i.posthog.com';
  const uiHost = 'https://eu.posthog.com';
  const apiKey = 'phc_nCvVasGfsjH3wagG6d5ZDSTi9r7gXNZq5h4BDH7nkXGP';
  const pending = [];

  function normalizeProperties(properties = {}) {
    return {
      $current_url: location.origin + location.pathname,
      $host: location.host,
      $pathname: location.pathname,
      $referrer: document.referrer ? (() => {
        try {
          const u = new URL(document.referrer);
          return u.origin + u.pathname;
        } catch {
          return '';
        }
      })() : '',
      ...properties
    };
  }

  function capture(event, properties = {}) {
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(event, normalizeProperties(properties));
    } else {
      pending.push([event, properties]);
    }
  }

  window.OPNEXTAAnalytics = { capture };

  const script = document.createElement('script');
  script.async = true;
  script.src = apiHost + '/static/1/array.js';

  script.onload = () => {
    if (!window.posthog || typeof window.posthog.init !== 'function') return;

    window.posthog.init(apiKey, {
      api_host: apiHost,
      ui_host: uiHost,
      persistence: 'sessionStorage',
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      advanced_disable_flags: true
    });

    capture('$pageview');

    while (pending.length) {
      const [event, properties] = pending.shift();
      capture(event, properties);
    }
  };

  script.onerror = () => {
    console.warn('OPNEXTA analytics SDK failed to load.');
  };

  document.head.appendChild(script);

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const el = target?.closest('[data-analytics-event]');
    if (!el) return;

    let destinationHost = '';
    let destinationPath = '';
    if (el.href) {
      try {
        const u = new URL(el.href, location.href);
        destinationHost = u.host;
        destinationPath = u.pathname;
      } catch {}
    }

    capture(el.dataset.analyticsEvent, {
      product: el.dataset.analyticsProduct || '',
      channel: el.dataset.analyticsChannel || '',
      destination_host: destinationHost,
      destination_path: destinationPath
    });
  });
})();
