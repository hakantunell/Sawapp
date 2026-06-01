// src/wane.js
// Hjälpfunktioner för vankants-/diagonalkrav.
//
// Detta är ren beräkningslogik utan DOM, canvas, state eller sågplansnavigering.
// Modulen är inte kopplad till legacy-funktionerna förrän adapter laddas separat.

(function initSawWane(global) {
  function requiredDiagonalWithWane(width, height, allowedCornerWane) {
    // Förenklad modell:
    // En fyrkant kräver diagonal sqrt(w²+h²).
    // Om hörnen får ha vankant reduceras kravet med 2×tillåten hörnvankant.
    return Math.max(0, Math.hypot(width, height) - 2 * allowedCornerWane);
  }

  function effectiveCornerWane(v) {
    const values = v || {};
    // Profilfräsning tar normalt bort en del av hörnen. 0,4 × radie är en försiktig approximation.
    // Exempel: profilradie 25 mm ger ca 10 mm tillåten hörnvankant.
    return Math.max((values.cornerWane || 0) * Math.SQRT2, (values.profileRadius || 0) * 0.4);
  }

  function effectiveAllowedWaneForDimension(d, v) {
    const dim = d || {};
    const values = v || {};

    // v28: vankant är per dimension.
    // Anges som mm in från hörnet längs båda kanterna, räknas om till diagonalpåslag.
    const perDimension = (dim.waneMm || 0) * Math.SQRT2;

    // Profilradie är fortfarande global hjälp, men används bara om den ger större tillåtelse.
    const fromProfile = (values.profileRadius || 0) * 0.4;

    // Vildmarkspanel får ett praktiskt standardvärde om fältet är 0.
    const wildDefault = dim.wildEdge ? 20 * Math.SQRT2 : 0;

    return Math.max(perDimension, fromProfile, wildDefault);
  }

  function maxFreeWidthForThickness(thickness, geom, allowedWane) {
    const geometry = geom || {};
    const availableDiag = (geometry.usableDiameter || 0) + 2 * (allowedWane || 0);
    return Math.floor(Math.sqrt(Math.max(0, availableDiag * availableDiag - thickness * thickness)));
  }

  global.SawWane = {
    requiredDiagonalWithWane,
    effectiveCornerWane,
    effectiveAllowedWaneForDimension,
    maxFreeWidthForThickness,
  };
})(window);
