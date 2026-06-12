// src/dimension-length-requirement-adapter.js
// Lägger till fältet längdkrav (%) per dimension utan att röra beräkningsflödet i editorn.

(function installDimensionLengthRequirementAdapter(global) {
  function lengthPct(d) {
    const pct = Number(d && d.lengthPct);
    return Number.isFinite(pct) && pct > 0 ? Math.max(1, Math.min(100, pct)) : 100;
  }

  if (typeof global.renderDimensionsEditor !== "function") return;
  if (global.renderDimensionsEditor.__lengthRequirementPatched) return;

  const originalRender = global.renderDimensionsEditor;

  global.renderDimensionsEditor = function renderDimensionsEditorWithLengthRequirement(options) {
    const opts = options || {};
    const result = originalRender.call(global, opts);
    const dimensions = Array.isArray(opts.dimensions) ? opts.dimensions : [];
    const list = opts.container || (global.$ ? global.$("dimensionList") : document.getElementById("dimensionList"));
    const onChange = typeof opts.onChange === "function" ? opts.onChange : function noop() {};

    if (!list) return result;

    Array.from(list.children).forEach((row, index) => {
      if (!row || row.querySelector(".dim-length-pct")) return;
      const dimension = dimensions[index] || {};
      const wildLabel = row.querySelector(".wild-label");
      const summary = row.querySelector(".area");

      const input = document.createElement("input");
      input.className = "dim-length-pct";
      input.type = "number";
      input.min = "1";
      input.max = "100";
      input.step = "1";
      input.value = String(lengthPct(dimension));
      input.title = "Minsta andel av stocklängden som måste klara dimensionen, procent";
      input.addEventListener("change", () => {
        onChange(index, { lengthPct: Math.max(1, Math.min(100, Number(input.value) || 100)) });
      });

      if (wildLabel) row.insertBefore(input, wildLabel);
      else row.appendChild(input);

      if (summary && !summary.textContent.includes("% längd")) {
        summary.textContent = `${summary.textContent} · ${lengthPct(dimension)} % längd`;
      }
    });

    return result;
  };

  global.renderDimensionsEditor.__lengthRequirementPatched = true;
})(window);
