(function () {
  "use strict";
  const target = document.getElementById("macroContextBody");
  if (!target) return;

  const allowed = new Set([
    "Goldilocks", "Reflation", "Disinflationary Slowdown", "Stagflation"
  ]);
  const show = (title, details) => {
    target.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = title;
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = details;
    target.append(strong, p);
  };
  const isValid = (x) => {
    if (!x || x.schema_version !== 1 || x.status !== "PASS" || !allowed.has(x.regime)) {
      return false;
    }
    if (typeof x.as_of !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x.as_of)) return false;
    const when = new Date(x.as_of + "T00:00:00Z");
    if (Number.isNaN(when.getTime())) return false;
    const today = new Date();
    const days = (today.getTime() - when.getTime()) / 86400000;
    if (days < 0 || days > 95) return false;
    if (when.getUTCFullYear() === today.getUTCFullYear()
        && when.getUTCMonth() === today.getUTCMonth()) return false;
    return Number.isFinite(x.growth_momentum) && Number.isFinite(x.inflation_momentum);
  };

  fetch("data/macro_context.json", {cache: "no-store"})
    .then((res) => { if (!res.ok) throw new Error("macro context not published"); return res.json(); })
    .then((data) => {
      if (!isValid(data)) {
        show("Macro regime not yet available", "No fresh, completed-month Global Macro Lab regime has been published.");
        return;
      }
      const g = data.growth_momentum >= 0 ? "rising" : "falling";
      const i = data.inflation_momentum >= 0 ? "rising" : "falling";
      show(data.regime + " · " + data.as_of,
        "Growth momentum " + g + "; inflation momentum " + i
        + ". Calculated from historical point-in-time macro observations. "
        + "This is descriptive context, not an equity valuation input or trading signal.");
    })
    .catch(() => show("Macro regime not available", "The separate macro research feed has not been verified."));
}());
