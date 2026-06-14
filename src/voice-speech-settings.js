// src/voice-speech-settings.js
// Inställningar för talsyntes/talfeedback.

(function initSawVoiceSpeechSettings(global) {
  const STORAGE_KEYS = {
    enabled: "sawapp.voiceSpeechFeedback.enabled",
    language: "sawapp.voiceSpeechFeedback.language",
    voiceURI: "sawapp.voiceSpeechFeedback.voiceURI",
    rate: "sawapp.voiceSpeechFeedback.rate",
  };

  const DEFAULTS = {
    enabled: "true",
    language: "en",
    voiceURI: "auto",
    rate: "normal",
  };

  function readSetting(name) {
    try {
      return global.localStorage.getItem(STORAGE_KEYS[name]) || DEFAULTS[name];
    } catch (error) {
      return DEFAULTS[name];
    }
  }

  function writeSetting(name, value) {
    try {
      global.localStorage.setItem(STORAGE_KEYS[name], String(value));
    } catch (error) {}
  }

  function isEnabled() {
    return readSetting("enabled") !== "false";
  }

  function language() {
    const value = readSetting("language");
    return value === "sv" ? "sv" : "en";
  }

  function voiceURI() {
    return readSetting("voiceURI") || "auto";
  }

  function rateName() {
    const value = readSetting("rate");
    return ["slow", "normal", "fast"].includes(value) ? value : "normal";
  }

  function speechRate() {
    if (rateName() === "slow") return 0.85;
    if (rateName() === "fast") return 1.2;
    return 1.0;
  }

  function supportsSpeech() {
    return !!global.speechSynthesis && typeof global.speechSynthesis.getVoices === "function";
  }

  function allVoices() {
    return supportsSpeech() ? global.speechSynthesis.getVoices() : [];
  }

  function languagePrefix() {
    return language() === "sv" ? /^sv/i : /^en/i;
  }

  function matchingVoices() {
    const voices = allVoices();
    const primary = voices.filter((voice) => languagePrefix().test(voice.lang || ""));
    return primary.length ? primary : voices;
  }

  function selectedVoice() {
    const selected = voiceURI();
    if (!selected || selected === "auto") return null;
    return allVoices().find((voice) => voice.voiceURI === selected || voice.name === selected) || null;
  }

  function optionLabel(voice) {
    const local = voice.localService ? "lokal" : "system";
    return `${voice.name} (${voice.lang || "okänt språk"}, ${local})`;
  }

  function populateVoiceSelect() {
    const select = global.document.getElementById("voiceSpeechVoice");
    if (!select) return;

    const previous = voiceURI();
    const voices = matchingVoices();
    select.innerHTML = `<option value="auto">Automatisk röst</option>`;

    voices.forEach((voice) => {
      const option = global.document.createElement("option");
      option.value = voice.voiceURI || voice.name;
      option.textContent = optionLabel(voice);
      select.appendChild(option);
    });

    const hasPrevious = Array.from(select.options).some((option) => option.value === previous);
    select.value = hasPrevious ? previous : "auto";
  }

  function installSettingsPanel() {
    const settings = global.document.querySelector("#settingsTab .settingsPanel") || global.document.querySelector("#settingsTab .panel");
    if (!settings || global.document.getElementById("voiceSpeechSettings")) return false;

    const section = global.document.createElement("section");
    section.id = "voiceSpeechSettings";
    section.className = "voiceSpeechSettings";
    section.innerHTML = `
      <h2>Röst och tal</h2>
      <p class="hint">Talfeedback ger korta upplästa bekräftelser när röstkommandon tolkas.</p>
      <div class="grid2">
        <label>Talfeedback
          <select id="voiceSpeechEnabled">
            <option value="true">På</option>
            <option value="false">Av</option>
          </select>
          <span>Bekräftar t.ex. stöd 1, stöd 2, längd, godkänd och kasserad.</span>
        </label>
        <label>Språk
          <select id="voiceSpeechLanguage">
            <option value="sv">Svenska</option>
            <option value="en">Engelska</option>
          </select>
          <span>Välj engelska om svensk talsyntes låter otydlig.</span>
        </label>
        <label>Röst
          <select id="voiceSpeechVoice">
            <option value="auto">Automatisk röst</option>
          </select>
          <span>Listan visar de röster som webbläsaren/operativsystemet erbjuder. Välj den som hörs tydligast.</span>
        </label>
        <label>Talhastighet
          <select id="voiceSpeechRate">
            <option value="slow">Långsam</option>
            <option value="normal">Normal</option>
            <option value="fast">Snabb</option>
          </select>
          <span>Korta bekräftelser fungerar oftast bäst med normal eller snabb.</span>
        </label>
        <label>Testa tal
          <button id="voiceSpeechTest" type="button" class="secondary">Spela testfras</button>
          <span>Testar vald röst och hastighet.</span>
        </label>
      </div>
    `;

    settings.appendChild(section);

    const enabled = global.document.getElementById("voiceSpeechEnabled");
    const lang = global.document.getElementById("voiceSpeechLanguage");
    const voice = global.document.getElementById("voiceSpeechVoice");
    const rate = global.document.getElementById("voiceSpeechRate");
    const test = global.document.getElementById("voiceSpeechTest");

    if (enabled) enabled.value = isEnabled() ? "true" : "false";
    if (lang) lang.value = language();
    if (rate) rate.value = rateName();
    populateVoiceSelect();

    if (enabled) enabled.addEventListener("change", () => writeSetting("enabled", enabled.value));
    if (lang) lang.addEventListener("change", () => {
      writeSetting("language", lang.value);
      writeSetting("voiceURI", "auto");
      populateVoiceSelect();
    });
    if (voice) voice.addEventListener("change", () => writeSetting("voiceURI", voice.value));
    if (rate) rate.addEventListener("change", () => writeSetting("rate", rate.value));
    if (test) test.addEventListener("click", () => {
      if (global.SawVoiceSpeechFeedback && typeof global.SawVoiceSpeechFeedback.speakKey === "function") {
        global.SawVoiceSpeechFeedback.speakKey("test");
      }
    });

    return true;
  }

  function install() {
    installSettingsPanel();
    if (supportsSpeech() && typeof global.speechSynthesis.onvoiceschanged !== "undefined") {
      const previous = global.speechSynthesis.onvoiceschanged;
      global.speechSynthesis.onvoiceschanged = function onVoicesChanged(event) {
        if (typeof previous === "function") previous.call(this, event);
        populateVoiceSelect();
      };
    }
  }

  global.SawVoiceSpeechSettings = {
    STORAGE_KEYS,
    isEnabled,
    language,
    voiceURI,
    selectedVoice,
    matchingVoices,
    rateName,
    speechRate,
    install,
  };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
