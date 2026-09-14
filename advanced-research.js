(() => {
  if (window.__antzazAdvancedResearchV2Loading) return;
  window.__antzazAdvancedResearchV2Loading = true;
  const script = document.createElement('script');
  script.src = `advanced-research-v2.js?v=${Date.now()}`;
  script.defer = true;
  document.head.appendChild(script);
})();
