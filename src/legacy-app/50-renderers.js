function renderSawmillCutPlan(plan) {
  return window.SawRenderSawmillCutPlan.renderSawmillCutPlan(plan);
}

function renderDimensions() {
  const list = $("dimensionList");
  const dimensions = window.SawState.getDimensions();
  list.innerHTML = "";
  dimensions.forEach((d, i) => {
    const row = document.createElement("div");
    row.className = "dimension-row dimension-row-v22";
    row.innerHTML = `
      <div>${i+1}</div>
      <button title="Flytta upp" ${i===0?"disabled":""}>↑</button>
      <button title="Flytta ner" ${i===dimensions.length-1?"disabled":""}>↓</button>
      <input type="checkbox" ${d.active ? "checked": ""} title="Aktiv">
      <select class="dim-type">
        <option value="fixed" ${d.type === "fixed" ? "selected" : ""}>Fyrkant</option>
        <option value="freeWidth" ${d.type === "freeWidth" ? "selected" : ""}>Fri bredd</option>
        <option value="minWidth" ${d.type === "minWidth" ? "selected" : ""}>Minbredd</option>
      </select>
      <input class="dim-height" type="number" value="${d.height}" step="1" title="Höjd/tjocklek">
      <input class="dim-width" type="number" value="${d.type === "minWidth" ? (d.minWidth || d.width || 0) : (d.width || 0)}" step="1" title="Bredd/minbredd">
      <input class="dim-wane" type="number" value="${d.waneMm || 0}" step="1" title="Tillåten vankant per dimension, mm">
      <label class="wild-label"><input class="wild-edge" type="checkbox" ${d.wildEdge ? "checked" : ""}> Vildmark</label>
      <div class="area">${dimensionLabel(d)}</div>
    `;

    const [up, down] = row.querySelectorAll("button");
    const activeBox = row.querySelector('input[type="checkbox"]');
    const typeSel = row.querySelector(".dim-type");
    const heightInput = row.querySelector(".dim-height");
    const widthInput = row.querySelector(".dim-width");
    const waneInput = row.querySelector(".dim-wane");
    const wildBox = row.querySelector(".wild-edge");

    up.onclick = () => { [dimensions[i-1], dimensions[i]] = [dimensions[i], dimensions[i-1]]; window.SawState.resetCurrentStepIndex(); update(); };
    down.onclick = () => { [dimensions[i+1], dimensions[i]] = [dimensions[i], dimensions[i+1]]; window.SawState.resetCurrentStepIndex(); update(); };
    activeBox.onchange = () => { d.active = activeBox.checked; window.SawState.resetCurrentStepIndex(); update(); };
    typeSel.onchange = () => {
      d.type = typeSel.value;
      if (d.type === "freeWidth") d.width = 0;
      if (d.type === "minWidth") d.minWidth = d.minWidth || d.width || 100;
      window.SawState.resetCurrentStepIndex();
      update();
    };
    heightInput.onchange = () => { d.height = +heightInput.value || 0; window.SawState.resetCurrentStepIndex(); update(); };
    widthInput.onchange = () => {
      const val = +widthInput.value || 0;
      if (d.type === "minWidth") d.minWidth = val;
      else d.width = val;
      window.SawState.resetCurrentStepIndex();
      update();
    };
    waneInput.onchange = () => { d.waneMm = +waneInput.value || 0; window.SawState.resetCurrentStepIndex(); update(); };
    wildBox.onchange = () => {
      d.wildEdge = wildBox.checked;
      if (d.wildEdge && !d.waneMm) d.waneMm = 20;
      window.SawState.resetCurrentStepIndex();
      update();
    };

    list.appendChild(row);
  });
}

function drawBarkRing(ctx, outerR, barkThicknessPx) {
  const innerR = Math.max(0, outerR - barkThicknessPx);
  ctx.save();
  ctx.fillStyle = "#7c5a3a";
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
  ctx.fill("evenodd");
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#5b3d24";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCutLogShape(ctx, outerR, barkPx, bottomY, topCutY) {
  // Delvis blockad stock efter första snittet:
  // - rund underdel kvar
  // - plan kapad ovansida
  // - bark finns bara längs kvarvarande rund ytterkontur
  const y = Math.max(-outerR, Math.min(outerR, topCutY));
  const x = Math.sqrt(Math.max(0, outerR * outerR - y * y));

  ctx.save();

  // Kvarvarande träyta: cirkelsegment under den plana snittytan
  ctx.fillStyle = "#fff7ed";
  ctx.beginPath();
  ctx.moveTo(-x, y);
  ctx.lineTo(x, y);
  ctx.arc(0, 0, outerR, Math.asin(y / outerR), Math.PI - Math.asin(y / outerR), false);
  ctx.closePath();
  ctx.fill();

  // Bark som bara följer den kvarvarande rundade ytterkonturen
  const innerR = Math.max(0, outerR - barkPx);
  const thetaRight = Math.asin(y / outerR);
  const thetaLeft = Math.PI - thetaRight;

  ctx.strokeStyle = "#7c5a3a";
  ctx.lineWidth = Math.max(2, barkPx);
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0, outerR - barkPx / 2), thetaRight, thetaLeft, false);
  ctx.stroke();

  // Yttre kontur + plan snittyta
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-x, y);
  ctx.lineTo(x, y);
  ctx.arc(0, 0, outerR, thetaRight, thetaLeft, false);
  ctx.closePath();
  ctx.stroke();

  // Plan referens-/snittyta markeras lätt
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-x, y);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.restore();
}
