// src/dimensions-editor.js
// Passiv renderer/controller för dimensionseditorn.
//
// Den här modulen är avsiktligt state-agnostisk. Den renderar en given
// dimensionslista och skickar ändringar via callbacks. Den muterar alltså inte
// legacy dimensions-arrayen direkt och patchar inte renderDimensions().

(function initSawDimensionsEditor(global) {
  function dimensionLabel(d) {
    if (typeof global.dimensionLabel === "function") return global.dimensionLabel(d);
    if (!d) return "";
    if (d.type === "freeWidth") return `${d.height} × fri`;
    if (d.type === "minWidth") return `${d.height} × ${(d.minWidth || d.width || 0)}+`;
    return `${d.width || 0} × ${d.height || 0}`;
  }

  function nominalWidth(d) {
    if (!d) return 0;
    if (d.type === "minWidth") return Number(d.minWidth || d.width || 0);
    if (d.type === "freeWidth") return Number(d.width || d.minWidth || 0);
    return Number(d.width || d.minWidth || 0);
  }

  function wildEdgeRequirementText(d) {
    if (!d || !d.wildEdge) return "";
    const width = nominalWidth(d);
    const rawMin = width > 0 ? Math.max(70, Math.round(width * 0.7)) : 70;
    return `Råkant min: ${rawMin} mm (70 % / minst 70 mm)`;
  }

  function renderDimensionsEditor(options) {
    const opts = options || {};
    const dimensions = Array.isArray(opts.dimensions) ? opts.dimensions : [];
    const list = opts.container || (global.$ ? global.$("dimensionList") : document.getElementById("dimensionList"));
    const onChange = typeof opts.onChange === "function" ? opts.onChange : function noop() {};
    const onMove = typeof opts.onMove === "function" ? opts.onMove : function noop() {};

    if (!list) return false;
    list.innerHTML = "";

    dimensions.forEach((d, i) => {
      const row = document.createElement("div");
      row.className = "dimension-row dimension-row-v22";
      const wildInfo = wildEdgeRequirementText(d);
      row.innerHTML = `
        <div class="dim-prio" data-label="Prio">${i + 1}</div>
        <button class="dim-up" type="button" title="Flytta upp" ${i === 0 ? "disabled" : ""} data-label="Upp">↑</button>
        <button class="dim-down" type="button" title="Flytta ner" ${i === dimensions.length - 1 ? "disabled" : ""} data-label="Ner">↓</button>
        <label class="dim-active-wrap" data-label="Aktiv"><input class="dim-active" type="checkbox" ${d.active ? "checked" : ""} title="Aktiv"></label>
        <label class="dim-field dim-type-wrap" data-label="Typ"><select class="dim-type">
          <option value="fixed" ${d.type === "fixed" ? "selected" : ""}>Fyrkant</option>
          <option value="freeWidth" ${d.type === "freeWidth" ? "selected" : ""}>Fri bredd</option>
          <option value="minWidth" ${d.type === "minWidth" ? "selected" : ""}>Minbredd</option>
        </select></label>
        <label class="dim-field dim-height-wrap" data-label="Tjocklek/höjd"><input class="dim-height" type="number" value="${d.height || 0}" step="1" title="Höjd/tjocklek"></label>
        <label class="dim-field dim-width-wrap" data-label="Bredd/minbredd"><input class="dim-width" type="number" value="${d.type === "minWidth" ? (d.minWidth || d.width || 0) : (d.width || 0)}" step="1" title="Bredd/minbredd"></label>
        <label class="dim-field dim-wane-wrap" data-label="Vankant"><input class="dim-wane" type="number" value="${d.waneMm || 0}" step="1" title="Tillåten vankant per dimension, mm"></label>
        <label class="wild-label" data-label="Vildmark"><input class="wild-edge" type="checkbox" ${d.wildEdge ? "checked" : ""}> Vildmark</label>
        <div class="area">${dimensionLabel(d)}${wildInfo ? `<br><small>${wildInfo}</small>` : ""}</div>
      `;

      const up = row.querySelector(".dim-up");
      const down = row.querySelector(".dim-down");
      const activeBox = row.querySelector(".dim-active");
      const typeSel = row.querySelector(".dim-type");
      const heightInput = row.querySelector(".dim-height");
      const widthInput = row.querySelector(".dim-width");
      const waneInput = row.querySelector(".dim-wane");
      const wildBox = row.querySelector(".wild-edge");

      up.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        onMove(i, i - 1);
      };
      down.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        onMove(i, i + 1);
      };
      activeBox.onchange = () => onChange(i, { active: activeBox.checked });
      typeSel.onchange = () => {
        const patch = { type: typeSel.value };
        if (patch.type === "freeWidth") patch.width = 0;
        if (patch.type === "minWidth") patch.minWidth = d.minWidth || d.width || 100;
        onChange(i, patch);
      };
      heightInput.onchange = () => onChange(i, { height: +heightInput.value || 0 });
      widthInput.onchange = () => {
        const val = +widthInput.value || 0;
        onChange(i, d.type === "minWidth" ? { minWidth: val } : { width: val });
      };
      waneInput.onchange = () => onChange(i, { waneMm: +waneInput.value || 0 });
      wildBox.onchange = () => {
        const patch = { wildEdge: wildBox.checked };
        if (patch.wildEdge && !d.waneMm) patch.waneMm = 20;
        onChange(i, patch);
      };

      list.appendChild(row);
    });

    return true;
  }

  global.SawDimensionsEditor = {
    renderDimensionsEditor,
  };

  global.renderDimensionsEditor = renderDimensionsEditor;
})(window);