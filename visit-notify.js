(() => {
  // Private pre-release branch: do not send the public-site Discord visitor beacon.
  // Instead load the staging-only feature layer.
  const script = document.createElement('script');
  script.src = `pre-release.js?v=${Date.now()}`;
  script.defer = true;
  document.head.appendChild(script);
})();
