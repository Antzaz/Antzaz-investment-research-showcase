(() => {
  if (window.__antzazAdvancedResearchV2Loading) return;
  window.__antzazAdvancedResearchV2Loading = true;
  const advanced = document.createElement('script');
  advanced.src = `advanced-research-v2.js?v=${Date.now()}`;
  advanced.defer = true;
  document.head.appendChild(advanced);
  const consistency = document.createElement('script');
  consistency.src = `site-consistency.js?v=${Date.now()}`;
  consistency.defer = true;
  document.head.appendChild(consistency);
})();
