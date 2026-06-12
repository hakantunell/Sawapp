// src/dimension-length-requirement-adapter.js
// Lägger till fältet längdkrav (%) per dimension utan att röra beräkningsflödet i editorn.

(function installDimensionLengthRequirementAdapter(global) {
  function lengthPct(d) {
    const pct = Number(d && d.lengthPct);
    return Number.isFinite(pct) && pct > 0 ? Math.max(1, Math.min(100, pct)) : 100;
  }

  function installStyles() {
    if (document.getElementById("dimension-length-requirement-style")) return;
    const style = document.createElement("style");
    style.id = "dimension-length-requirement-style";
    style.textContent = `
      #dimensionsTab .widePanel {
        max-height: calc(100vh - 88px);
        overflow: auto;
      }

      #dimensionsTab .dimensionHeader,
      #dimensionsTab .dimension-row-v22 {
        grid-template-columns: 28px 30px 30px 42px 120px 110px 120px 84px 94px 110px minmax(130px, 1fr) !important;
        align-items: center;
      }

      #dimensionsTab .dimensionHeader span[data-length-header] {
        display: block;
      }

      #dimensionsTab .dim-length-pct {
        display: block;
        width: 100%;
        min-width: 72px;
        padding: 7px;
      }

      #dimensionsTab .dimension-row-v22 .area {
        text-align: left;
        white-space: normal;
        line-height: 1.25;
      }

      @media (max-width: 1050px) {
        #dimensionsTab .dimensionHeader {
          display: none;
        }
        #dimensionsTab .dimension-row-v22 {
          grid-template-columns: 34px 34px 34px 42px 1fr 1fr !important;
        }
        #dimensionsTab .dimension-row-v22 .dim-wane,
        #dimensionsTab .dimension-row-v22 .dim-length-pct,
        #dimensionsTab .dimension-row-v22 .area,
        #dimensionsTab .dimension-row-v22 .wild-label {
          grid-column: 1 / -1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureHeader() {
    const header = document.querySelector("#dimensionsTab .dimensionHeader");
    if (!header || header.querySelector("span[data-length-header]")) return;

    // Raden renderas som: ... Vankant, Längdkrav, Vildmark, Resultat.
    // Därför måste headern in före Vildmark, inte före Resultat.
    const wildHeader = Array.from(header.children).find((el) => el.textContent.trim() === "Vildmark");
    const lengthHeader = document.createElement("span");
    lengthHeader.textContent = "Längdkrav %";
    lengthHeader.dataset.lengthHeader = "true";
    if (wildHeader) header.insertBefore(lengthHeader, wildHeader);
    else header.appendChild(lengthHeader);
  }

  if (typeof global.renderDimensionsEditor !== "function") return;
  if (global.renderDimensionsEditor.__lengthRequirementPatched) return;

  const originalRender = global.renderDimensionsEditor;

  global.renderDimensionsEditor = function renderDimensionsEditorWithLengthRequirement(options) {
    const opts = options || {};
    installStyles();
    const result = originalRender.call(global, opts);
    ensureHeader();

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

      if (summary) {
        summary.textContent = summary.textContent.replace(/\s*·\s*\d+\s*%\s*längd\s*$/, "");
      }
    });

    return result;
  };

  global.renderDimensionsEditor.__lengthRequirementPatched = true;
})(window);
