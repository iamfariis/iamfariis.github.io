(() => {
  const apiHost = 'https://eu.i.posthog.com';
  const uiHost = 'https://eu.posthog.com';
  const apiKey = 'phc_nCvVasGfsjH3wagG6d5ZDSTi9r7gXNZq5h4BDH7nkXGP';
  const pending = [];
  const EVENT_ALIASES = {
    'checkout clicked': 'payment_link_click',
    'audit kit interest': 'cta_click',
    'lead clicked': 'contact_click',
    'add_to_cart': 'cta_click',
    'remove_from_cart': 'cta_click'
  };
  const STANDARD_EVENTS = new Set(['product_view', 'tool_start', 'tool_complete', 'cta_click', 'payment_link_click', 'contact_click']);

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

  function normalizeEvent(event) {
    if (event === '$pageview') return event;
    const normalized = EVENT_ALIASES[event] || event;
    return STANDARD_EVENTS.has(normalized) ? normalized : 'cta_click';
  }

  function capture(event, properties = {}) {
    const normalizedEvent = normalizeEvent(event);
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(normalizedEvent, normalizeProperties(properties));
    } else {
      pending.push([normalizedEvent, properties]);
    }
  }

  window.OPNEXTAAnalytics = { capture, normalizeEvent, standardEvents: STANDARD_EVENTS };

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://eu-assets.i.posthog.com/static/array.js';

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

  function inferEvent(el) {
    const explicit = el.dataset.analyticsEvent;
    if (explicit) return explicit;
    const href = el.getAttribute('href') || '';
    if (href.startsWith('mailto:')) return 'contact_click';
    if (/^https?:\/\//i.test(href)) return 'payment_link_click';
    if (el.tagName === 'BUTTON' && /\b(run|check|analy[sz]e|evaluate|calculate|scan|start)\b/i.test(el.textContent || '')) return 'tool_start';
    return el.classList.contains('btn') ? 'cta_click' : '';
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const el = target?.closest('[data-analytics-event], a[href], button');
    if (!el) return;
    const eventName = inferEvent(el);
    if (!eventName) return;

    let destinationHost = '';
    let destinationPath = '';
    if (el.href) {
      try {
        const u = new URL(el.href, location.href);
        destinationHost = u.host;
        destinationPath = u.pathname;
      } catch {}
    }

    capture(eventName, {
      product: el.dataset.analyticsProduct || '',
      channel: el.dataset.analyticsChannel || '',
      destination_host: destinationHost,
      destination_path: destinationPath
    });
  });
})();
