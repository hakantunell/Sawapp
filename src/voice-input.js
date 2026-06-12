// src/voice-input.js
// Röstinmatning för stockmått och sågflöde.

(function initSawVoiceInput(global) {
  const FIELD_ALIASES = [
    { field: "rootDiameter", label: "Diameter stöd 1", patterns: [/ettan/i, /^a$/i, /stod\s*(ett|en|1)/i, /stodett/i, /stoden/i, /diameter\s*stod\s*(ett|en|1)/i] },
    { field: "topDiameter", label: "Diameter stöd 2", patterns: [/tvaan/i, /tvåan/i, /^b$/i, /stod\s*(tva|två|2)/i, /stodtva/i, /stodtvo/i, /diameter\s*stod\s*(tva|två|2)/i] },
    { field: "rootEndDiameter", label: "Rotända", patterns: [/rot(anda)?/i, /rot\s*ande/i] },
    { field: "topEndDiameter", label: "Toppända", patterns: [/topp(anda)?/i, /topp\s*ande/i] },
    { field: "logLength", label: "Stocklängd", patterns: [/langd/i, /stocklangd/i, /stock\s*langd/i] },
    { field: "sweep", label: "Krokighet", patterns: [/krokighet/i, /krok/i, /snoravvikelse/i, /avvikelse/i] },
    { field: "bark", label: "Bark", patterns: [/bark/i, /barktjocklek/i] },
  ];

  /* Resten av filen oförändrad */
})(window);
