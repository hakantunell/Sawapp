// src/version.js
// Central versionhantering för Sawapp.
//
// Syftet är att slippa ändra index.html varje gång versionen ändras.
// Versionsnumret kan framöver bumpas här, och modulen uppdaterar både title och
// synlig versionsetikett om elementen finns.

(function initSawVersion(global) {
  const version = "1.2.3";
  const appName = "Sawapp";

  function applyVersion() {
    const visible = document.querySelector(".version");
    if (visible) visible.textContent = `v${version}`;

    const brandVersion = document.querySelector(".navBrand span");
    if (brandVersion) brandVersion.textContent = `v${version}`;

    if (document.title) {
      document.title = `${appName} v${version}`;
    }
  }

  global.SawVersion = {
    version,
    label: `v${version}`,
    appName,
    applyVersion,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyVersion, { once: true });
  } else {
    applyVersion();
  }
})(window);