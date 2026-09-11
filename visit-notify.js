(() => {
  const ENDPOINT = 'https://antzaz-portfolio-visit-notifier.vercel.app/api/visit';
  const STORAGE_KEY = 'portfolio_visit_notified_at_v2';
  const COOLDOWN_MS = 30 * 60 * 1000;

  function isLikelyBot() {
    const ua = navigator.userAgent || '';
    return navigator.webdriver || /bot|crawler|spider|headless|lighthouse|pagespeed|uptime|monitor|preview/i.test(ua);
  }

  function deviceClass() {
    const ua = navigator.userAgent || '';
    if (/ipad|tablet|playbook|silk/i.test(ua)) return 'Tablet';
    if (/mobi|iphone|ipod|android/i.test(ua)) return 'Mobile';
    return 'Desktop';
  }

  function referrerHost() {
    if (!document.referrer) return 'Direct / unknown';
    try {
      const url = new URL(document.referrer);
      if (url.hostname === location.hostname) return 'Internal';
      return url.hostname || 'Direct / unknown';
    } catch (_) {
      return 'Direct / unknown';
    }
  }

  function alreadyNotifiedRecently() {
    try {
      const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
      return Number.isFinite(last) && Date.now() - last < COOLDOWN_MS;
    } catch (_) {
      return false;
    }
  }

  function markNotified() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch (_) {
      // Privacy/storage restrictions should never break the public site.
    }
  }

  async function notifyVisit() {
    if (isLikelyBot() || alreadyNotifiedRecently()) return;

    const params = new URLSearchParams(location.search);
    const payload = {
      event: 'portfolio_open',
      page: `${location.pathname}${location.hash || ''}`.slice(0, 160),
      referrer: referrerHost(),
      device: deviceClass(),
      source: (params.get('utm_source') || '').slice(0, 60),
      campaign: (params.get('utm_campaign') || '').slice(0, 80),
    };

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        markNotified();
      } else {
        console.warn(`Portfolio visit notification failed with HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('Portfolio visit notification request failed:', error?.message || 'unknown error');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', notifyVisit, { once: true });
  } else {
    notifyVisit();
  }
})();
