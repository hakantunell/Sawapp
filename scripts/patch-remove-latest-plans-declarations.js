// scripts/patch-remove-latest-plans-declarations.js
//
// Körs lokalt från repo-roten:
//
//   node scripts/patch-remove-latest-plans-declarations.js
//
// Tar bort de sista legacy-deklarationerna för latestPackingLayout och
// latestSawmillCutPlan efter att alla läsningar och skrivningar migrerats.

const fs = require('fs');
const path = require('path');

const appPath = path.resolve(__dirname, '..', 'app.js');
const source = fs.readFileSync(appPath, 'utf8');

const before = `let latestPackingLayout = null;
let latestSawmillCutPlan = null;`;

if (!source.includes(before)) {
  console.error('Förväntade deklarationer hittades inte.');
  process.exit(1);
}

const next = source.replace(before, '');
fs.writeFileSync(appPath, next, 'utf8');

console.log('Legacy latest*-deklarationer borttagna.');
