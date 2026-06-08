function computeSawmillPacking(geom, v) {
  const R = geom.usableDiameter / 2;
  const dims = activePackingDimensions();
  const placed = [];
  if (!dims.length || R <= 0) return placed;

  const kerf = v.kerf || 0;

  // 1. Välj första fasta/fyrkantiga dimension som centrumblock enligt prioritet.
  let center = null;
  for (const d of dims) {
    if (d.type !== "fixed") continue;
    const allowedWane = effectiveAllowedWaneForDimension(d, v);
    const rect = { x: -d.width/2, y: -d.height/2, w: d.width, h: d.height };
    if (rectFitsCircle(rect, R, allowedWane)) {
      center = {
        ...rect,
        label: `${d.width}×${d.height}${d.wildEdge ? " R" : ""}`,
        type: "center",
        wildEdge: !!d.wildEdge,
        priorityIndex: d.priorityIndex,
        thickness: d.height,
      };
      placed.push(center);
      break;
    }
  }

  // Om inget centrumblock får plats: fall tillbaka till hyll-packning.
  if (!center) {
    let cursorY = -R;
    let shelfNo = 0;
    const candidates = dims.map(d => dimensionToPackCandidate(d, geom, v)).filter(Boolean);
    while (cursorY < R - 1 && shelfNo < 60) {
      let placedInShelf = false;
      for (const cand of candidates) {
        const shelfH = cand.h;
        if (cursorY + shelfH > R) continue;
        const midY = cursorY + shelfH / 2;
        let availW = circleWidthAtY(midY, R) - 2 * kerf;
        if (availW <= 0) continue;
        let itemW = cand.freeWidth ? Math.floor(availW) : cand.w;
        if (cand.freeWidth && itemW < cand.minWidth) continue;
        if (!cand.freeWidth && itemW > availW) continue;
        let rect = { x: -itemW/2, y: cursorY, w: itemW, h: shelfH };
        while (itemW > (cand.minWidth || 1) && !rectFitsCircle(rect, R, cand.allowedWane)) {
          itemW -= 2;
          rect = { x: -itemW/2, y: cursorY, w: itemW, h: shelfH };
        }
        if (!rectFitsCircle(rect, R, cand.allowedWane)) continue;
        placed.push({ ...rect, label: cand.freeWidth ? `${cand.h}×${itemW}${cand.source.wildEdge ? " R" : ""}` : cand.label, type: cand.type, wildEdge: !!cand.source.wildEdge, priorityIndex: cand.priorityIndex, shelfNo });
        cursorY += shelfH + kerf;
        shelfNo++;
        placedInShelf = true;
        break;
      }
      if (!placedInShelf) cursorY += 5;
    }
    return placed;
  }

  // 2. Använd övriga aktiva plank/panel-dimensioner som sidobitar.
  const sideDims = dims
    .filter(d => d.type === "freeWidth" || d.type === "minWidth" || d.wildEdge)
    .map(d => dimensionToPackCandidate(d, geom, v))
    .filter(Boolean);

  const sides = [
    { name: "över", side: "top", horizontal: true, x: -center.w/2, y: -center.h/2, length: center.w, outward: -1 },
    { name: "under", side: "bottom", horizontal: true, x: -center.w/2, y: center.h/2, length: center.w, outward: 1 },
    { name: "höger", side: "right", horizontal: false, x: center.w/2, y: -center.h/2, length: center.h, outward: 1 },
    { name: "vänster", side: "left", horizontal: false, x: -center.w/2, y: -center.h/2, length: center.h, outward: -1 },
  ];

  for (const side of sides) {
    let chosen = null;

    for (const cand of sideDims) {
      const t = cand.h;
      let rect;
      if (side.horizontal) {
        const y = side.outward < 0 ? side.y - kerf - t : side.y + kerf;
        const yOuter = side.outward < 0 ? y : y + t;
        const maxWidthAtOuter = circleWidthAtY(yOuter, R + cand.allowedWane);
        let w = cand.freeWidth ? Math.min(side.length, Math.floor(maxWidthAtOuter)) : cand.w;
        if (cand.freeWidth && w < (cand.minWidth || 1)) continue;
        if (!cand.freeWidth && w > side.length + 0.001) continue;
        rect = { x: -w/2, y, w, h: t };
      } else {
        const x = side.outward < 0 ? side.x - kerf - t : side.x + kerf;
        const xOuter = side.outward < 0 ? x : x + t;
        if (Math.abs(xOuter) > R + cand.allowedWane) continue;
        const maxH = 2 * Math.sqrt(Math.max(0, (R + cand.allowedWane)**2 - xOuter*xOuter));
        let h = cand.freeWidth ? Math.min(side.length, Math.floor(maxH)) : cand.w;
        if (cand.freeWidth && h < (cand.minWidth || 1)) continue;
        if (!cand.freeWidth && h > side.length + 0.001) continue;
        rect = { x, y: -h/2, w: t, h };
      }

      if (!rectFitsCircle(rect, R, cand.allowedWane)) {
        // Trimma fri bredd tills den passar.
        if (!cand.freeWidth) continue;
        if (side.horizontal) {
          while (rect.w > (cand.minWidth || 1) && !rectFitsCircle(rect, R, cand.allowedWane)) {
            rect.w -= 2;
            rect.x = -rect.w/2;
          }
        } else {
          while (rect.h > (cand.minWidth || 1) && !rectFitsCircle(rect, R, cand.allowedWane)) {
            rect.h -= 2;
            rect.y = -rect.h/2;
          }
        }
      }

      if (!rectFitsCircle(rect, R, cand.allowedWane)) continue;

      chosen = {
        ...rect,
        label: side.horizontal
          ? `${cand.h}×${Math.round(rect.w)}${cand.source.wildEdge ? " R" : ""}`
          : `${cand.h}×${Math.round(rect.h)}${cand.source.wildEdge ? " R" : ""}`,
        type: cand.type,
        wildEdge: !!cand.source.wildEdge,
        priorityIndex: cand.priorityIndex,
        side: side.name,
      };
      break;
    }

    if (chosen) placed.push(chosen);
  }

  return placed;
}

function renderPackingResult(packing) {
  const el = $("sideYield");
  if (!el) return;
  if (!packing || !packing.length) {
    el.innerHTML = `<div class="status-bad">Ingen sågverkslayout hittades för aktiva dimensioner.</div>`;
    return;
  }
  const area = packing.reduce((sum, r) => sum + r.w * r.h / 1e6, 0);
  el.innerHTML = `
    <div class="status-ok">
      Sågverkslayout: <strong>${packing.length}</strong> bitar, area <strong>${area.toFixed(3)} m²</strong>.
      <br><span class="hint">Förenklad prioritetspackning. Sågplanen frigör sidobitar först och blockar kärnan sist.</span>
    </div>
    <div class="sideYieldGrid">
      ${packing.map((r, i) => `
        <div class="sideYieldCard">
          <strong>${i + 1}. ${r.label}</strong>
          <span>${Math.round(r.w)} × ${Math.round(r.h)} mm</span>
          <small>${r.wildEdge ? "vildmark/råkant tillåten" : "ren dimension"} · prioritet ${r.priorityIndex + 1}</small>
        </div>
      `).join("")}
    </div>
  `;
}
function computeSideYield(block, geom, v) {
  if (!block) return [];

  // Förenklad modell för sidoutbyte:
  // Efter att centrumblocket är valt tittar vi på sidoutrymmet utanför blockets fyra sidor.
  // För varje sida beräknas största möjliga "bredd" utifrån cirkelns chord vid blockytan.
  // Detta är inte en full sågoptimerare ännu, men ger praktiskt besked om ungefärliga sidobrädor.
  const sideDims = activeSideYieldDimensions();
  if (!sideDims.length) return [];

  const R = geom.usableDiameter / 2;
  const candidates = [];
  const sides = [
    { name: "övre sida", orientation: "horizontal", y: -block.height / 2 },
    { name: "nedre sida", orientation: "horizontal", y: block.height / 2 },
    { name: "höger sida", orientation: "vertical", x: block.width / 2 },
    { name: "vänster sida", orientation: "vertical", x: -block.width / 2 },
  ];

  for (const side of sides) {
    for (const d of sideDims) {
      const thickness = d.height || 0;
      if (thickness <= 0) continue;

      let availableLength = 0;
      let availableDepth = 0;

      if (side.orientation === "horizontal") {
        const yOuter = side.y < 0 ? side.y - thickness : side.y + thickness;
        const yCheck = Math.abs(yOuter);
        if (yCheck > R) continue;
        availableLength = 2 * Math.sqrt(Math.max(0, R * R - yCheck * yCheck));
        availableDepth = Math.max(0, R - Math.abs(side.y));
      } else {
        const xOuter = side.x < 0 ? side.x - thickness : side.x + thickness;
        const xCheck = Math.abs(xOuter);
        if (xCheck > R) continue;
        availableLength = 2 * Math.sqrt(Math.max(0, R * R - xCheck * xCheck));
        availableDepth = Math.max(0, R - Math.abs(side.x));
      }

      // Fri bredd: använd tillgänglig längd som bredd.
      // Minbredd: underkänn om tillgänglig längd understiger minbredd.
      const width = Math.floor(availableLength);
      const minWidth = d.type === "minWidth" ? (d.minWidth || d.width || 0) : 0;
      if (minWidth && width < minWidth) continue;

      // Vildmarkspanel kan accepteras med råkant. För icke-vildmark kräver vi lite marginal.
      const edgeNote = d.wildEdge ? "råkant/vankant tillåten" : "renare kant";
      const label = d.type === "minWidth"
        ? `${thickness} × ${width} mm (${minWidth}+${d.wildEdge ? " R" : ""})`
        : `${thickness} × ${width} mm${d.wildEdge ? " R" : ""}`;

      candidates.push({
        side: side.name,
        thickness,
        width,
        minWidth,
        wildEdge: !!d.wildEdge,
        label,
        edgeNote,
        availableDepth: Math.floor(availableDepth),
      });
    }
  }

  // Enkelt urval: prioritetsordning i dimensionslistan + max en per sida.
  const selected = [];
  const usedSides = new Set();
  for (const d of sideDims) {
    const matching = candidates
      .filter(c => !usedSides.has(c.side) && c.thickness === d.height && c.wildEdge === !!d.wildEdge)
      .sort((a, b) => b.width - a.width);
    if (matching[0]) {
      selected.push(matching[0]);
      usedSides.add(matching[0].side);
    }
  }

  return selected;
}

function renderSideYield(sideYield) {
  const el = $("sideYield");
  if (!el) return;
  if (!sideYield || !sideYield.length) {
    el.innerHTML = `<div class="status-bad">Inget sidoutbyte beräknat. Aktivera Fri bredd/Minbredd/Vildmark i dimensionslistan.</div>`;
    return;
  }
  el.innerHTML = `
    <div class="sideYieldGrid">
      ${sideYield.map(s => `
        <div class="sideYieldCard">
          <strong>${s.side}</strong>
          <span>${s.label}</span>
          <small>${s.edgeNote}. Sidodjup ca ${s.availableDepth} mm.</small>
        </div>
      `).join("")}
    </div>
  `;
}
