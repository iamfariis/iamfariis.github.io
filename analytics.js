(() => {
  const endpoint = 'https://eu.i.posthog.com/i/v0/e/';
  const apiKey = 'phc_nCvVasGfsjH3wagG6d5ZDSTi9r7gXNZq5h4BDH7nkXGP';
  const sessionKey = 'opnexta_analytics_session';

  function sessionId() {
    try {
      let id = sessionStorage.getItem(sessionKey);
      if (!id) {
        id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'anon-' + Date.now() + '-' + Math.random().toString(36).slice(2);
        sessionStorage.setItem(sessionKey, id);
      }
      return id;
    } catch {
      return 'anon-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    }
  }

  function capture(event, properties = {}) {
    const payload = {
      api_key: apiKey,
      event,
      distinct_id: sessionId(),
      timestamp: new Date().toISOString(),
      properties: {
        $process_person_profile: false,
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
      }
    };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: 'omit',
      mode: 'cors'
    }).catch(() => {});
  }

  window.OPNEXTAAnalytics = { capture };

  const sendPageview = () => capture('$pageview');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendPageview, { once: true });
  } else {
    sendPageview();
  }

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-analytics-event]');
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