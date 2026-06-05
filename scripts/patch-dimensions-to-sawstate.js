// scripts/patch-dimensions-to-sawstate.js
//
// Körs lokalt från repo-roten:
//
//   node scripts/patch-dimensions-to-sawstate.js
//
// Syfte:
// Gör första större dimensions-migreringen i app.js:
// - tar bort legacy-defaultlistan `let dimensions = [...]`
// - läser dimensioner från SawState i beräkningar och rendering
// - låter add/preset använda SawState
//
// Scriptet är strikt: om något förväntat block saknas avbryts körningen utan att
// skriva app.js.

const fs = require("fs");
const path = require("path");

const appPath = path.resolve(__dirname, "..", "app.js");
const original = fs.readFileSync(appPath, "utf8");
let next = original;

function replaceStrict(label, before, after) {
  if (!next.includes(before)) {
    console.error(`Förväntat block hittades inte för: ${label}. app.js ändrades inte.`);
    process.exit(1);
  }
  next = next.replace(before, after);
}

replaceStrict(
  "legacy dimensions default list",
  `
let dimensions = [
  { active: true, type: "fixed", width: 190, height: 190, minWidth: 190, wildEdge: false, waneMm: false ? 20 : 0 },
  { active: true, type: "fixed", width: 170, height: 170, minWidth: 170, wildEdge: false, waneMm: false ? 20 : 0 },
  { active: false, type: "fixed", width: 150, height: 150, minWidth: 150, wildEdge: false, waneMm: false ? 20 : 0 },

  { active: false, type: "freeWidth", width: 0, height: 50, minWidth: 0, wildEdge: false, waneMm: false ? 20 : 0 },
  { active: false, type: "freeWidth", width: 0, height: 30, minWidth: 0, wildEdge: false, waneMm: false ? 20 : 0 },

  { active: false, type: "minWidth", width: 150, height: 30, minWidth: 150, wildEdge: false, waneMm: false ? 20 : 0 },
  { active: false, type: "minWidth", width: 150, height: 30, minWidth: 150, wildEdge: true, waneMm: true ? 20 : 0 },
];
`,
  `
`
);

replaceStrict(
  "findBestCenterBlock dimensions read",
  `  let active = dimensions.filter(d => d.active);`,
  `  let active = window.SawState.getDimensions().filter(d => d.active);`
);

replaceStrict(
  "activeSideYieldDimensions dimensions read",
  `function activeSideYieldDimensions() {
  return dimensions.filter(d => d.active && (d.type === "freeWidth" || d.type === "minWidth" || d.wildEdge));
}`,
  `function activeSideYieldDimensions() {
  return window.SawState.getDimensions().filter(d => d.active && (d.type === "freeWidth" || d.type === "minWidth" || d.wildEdge));
}`
);

replaceStrict(
  "activePackingDimensions dimensions read",
  `function activePackingDimensions() {
  return dimensions
    .filter(d => d.active)
    .map((d, index) => ({ ...d, priorityIndex: index }))`,
  `function activePackingDimensions() {
  return window.SawState.getDimensions()
    .filter(d => d.active)
    .map((d, index) => ({ ...d, priorityIndex: index }))`
);

replaceStrict(
  "renderDimensions dimensions read",
  `function renderDimensions() {
  const list = $("dimensionList");
  list.innerHTML = "";
  dimensions.forEach((d, i) => {`,
  `function renderDimensions() {
  const list = $("dimensionList");
  const dimensions = window.SawState.getDimensions();
  list.innerHTML = "";
  dimensions.forEach((d, i) => {`
);

replaceStrict(
  "addDimension dimensions write",
  `$("addDimension").onclick = () => { dimensions.push({active:false,type:"freeWidth",width:0,height:30,minWidth:0,wildEdge:false}); update(); };`,
  `$("addDimension").onclick = () => { window.SawState.getDimensions().push({active:false,type:"freeWidth",width:0,height:30,minWidth:0,wildEdge:false}); update(); };`
);

replaceStrict(
  "presetTimber dimensions reset",
  `$("presetTimber").onclick = () => {
  dimensions = [
    { active: true, type: "fixed", width: 190, height: 190, minWidth: 190, wildEdge: false, waneMm: false ? 20 : 0 },
    { active: true, type: "fixed", width: 170, height: 170, minWidth: 170, wildEdge: false, waneMm: false ? 20 : 0 },
    { active: false, type: "fixed", width: 150, height: 150, minWidth: 150, wildEdge: false, waneMm: false ? 20 : 0 },
    { active: false, type: "freeWidth", width: 0, height: 50, minWidth: 0, wildEdge: false, waneMm: false ? 20 : 0 },
    { active: false, type: "freeWidth", width: 0, height: 30, minWidth: 0, wildEdge: false, waneMm: false ? 20 : 0 },
    { active: false, type: "minWidth", width: 150, height: 30, minWidth: 150, wildEdge: false, waneMm: false ? 20 : 0 },
    { active: false, type: "minWidth", width: 150, height: 30, minWidth: 150, wildEdge: true, waneMm: true ? 20 : 0 },
  ];
  currentStepIndex = 0;
  update();
};`,
  `$("presetTimber").onclick = () => {
  window.SawState.resetDimensions();
  currentStepIndex = 0;
  update();
};`
);

if (next === original) {
  console.error("Ingen ändring gjordes. app.js ändrades inte.");
  process.exit(1);
}

fs.writeFileSync(appPath, next, "utf8");
console.log("app.js uppdaterad: dimensions defaultlista och direkta läsningar/skrivningar migrerade till SawState.");
