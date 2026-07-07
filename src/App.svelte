<script>
  import yaml from 'js-yaml';

  let leftText = '';
  let rightText = '';
  let error = '';
  let sourceFormat = 'yaml';
  let copied = false;
  let isDragging = false;
  let copyTimeout;

  /* ---- Reactive conversion ---- */
  $: {
    // triggers when leftText changes
    if (leftText && leftText.trim()) {
      convert(leftText);
    } else {
      rightText = '';
      error = '';
    }
  }

  function convert(text) {
    error = '';
    const trimmed = text.trim();
    let obj;
    let detected;

    // Try JSON first — it's the stricter format
    try {
      obj = JSON.parse(trimmed);
      detected = 'json';
    } catch {
      try {
        obj = yaml.load(trimmed);
        detected = 'yaml';
        if (obj === undefined || obj === null) obj = null;
      } catch (e) {
        error = cleanError(e.message);
        rightText = '';
        return;
      }
    }

    sourceFormat = detected;
    const targetFormat = detected === 'yaml' ? 'json' : 'yaml';

    try {
      if (targetFormat === 'json') {
        rightText = JSON.stringify(obj, null, 2);
      } else {
        rightText = yaml.dump(obj, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false
        });
      }
    } catch (e) {
      error = 'Errore nella conversione: ' + cleanError(e.message);
      rightText = '';
    }
  }

  function cleanError(msg) {
    return msg
      .replace(/^YAMLException:\s*/i, '')
      .replace(/^SyntaxError:\s*/i, '')
      .trim();
  }

  /* ---- Actions ---- */
  function swapPanels() {
    if (!rightText) return;
    const temp = leftText;
    leftText = rightText;
    rightText = ''; // filled by reactive block
    error = '';
  }

  async function copyRight() {
    if (!rightText) return;
    try {
      await navigator.clipboard.writeText(rightText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = rightText;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    copied = true;
    clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => (copied = false), 2000);
  }

  function clearAll() {
    leftText = '';
    rightText = '';
    error = '';
  }

  /* ---- File handling ---- */
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    isDragging = true;
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      isDragging = false;
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    isDragging = false;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) readFile(files[0]);
  }

  function handleFileInput(e) {
    const files = e.target.files;
    if (files && files.length > 0) readFile(files[0]);
    e.target.value = '';
  }

  function readFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      leftText = ev.target.result;
    };
    reader.onerror = () => {
      error = 'Impossibile leggere il file. Verifica che sia un file di testo valido.';
    };
    reader.readAsText(file);
  }

  /* ---- Derived helpers ---- */
  $: outputFormat = sourceFormat === 'yaml' ? 'json' : 'yaml';
  $: yamlPlaceholder = 'nome: Mario\ncitt\u00E0: Roma\npaese: Italia\n\nhobby:\n  - lettura\n  - fotografia';
  $: jsonPlaceholder = '{\n  "nome": "Mario",\n  "citt\u00E0": "Roma",\n  "paese": "Italia",\n  "hobby": [\n    "lettura",\n    "fotografia"\n  ]\n}';
  $: sourcePlaceholder = sourceFormat === 'yaml' ? yamlPlaceholder : jsonPlaceholder;
</script>

<svelte:head>
  <title>YAML ⇄ JSON Convertitore — Trasforma YAML in JSON e viceversa all'istante</title>
  <meta name="description" content="Convertitore interattivo YAML-JSON con pannelli affiancati. Incolla, carica o trascina file .yml, .yaml o .json per una conversione in tempo reale. Gratuito, senza registrazione." />
</svelte:head>

<div class="app">
  <!-- ====== HEADER ====== -->
  <header class="header">
    <p class="eyebrow">Convertitore interattivo</p>
    <h1 class="title">
      <span class="title__format title__format--yaml">YAML</span>
      <span class="title__arrow" aria-hidden="true">⇄</span>
      <span class="title__format title__format--json">JSON</span>
    </h1>
    <p class="subtitle">Incolla, carica o trascina un file per convertire all&rsquo;istante tra i due formati</p>
  </header>

  <!-- ====== MAIN ====== -->
  <main class="main">
    <div class="panels">
      <!-- LEFT: Source panel -->
      <div
        class="panel panel--source"
        class:panel--yaml-source={sourceFormat === 'yaml'}
        class:panel--json-source={sourceFormat === 'json'}
        class:panel--dragover={isDragging}
        on:dragover={handleDragOver}
        on:dragleave={handleDragLeave}
        on:drop={handleDrop}
        role="region"
        aria-label="Pannello sorgente — {sourceFormat.toUpperCase()}"
      >
        <div class="panel__header">
          <div class="panel__label">
            <span
              class="panel__dot"
              class:panel__dot--yaml={sourceFormat === 'yaml'}
              class:panel__dot--json={sourceFormat === 'json'}
              aria-hidden="true"
            ></span>
            <label for="source-textarea">
              {sourceFormat.toUpperCase()}
              <span class="panel__label-sub">— sorgente</span>
            </label>
          </div>
          <div class="panel__actions">
            <label class="btn btn--small btn--ghost" title="Carica un file .yml, .yaml o .json dal tuo computer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Carica file</span>
              <input
                type="file"
                accept=".yml,.yaml,.json"
                on:change={handleFileInput}
                class="sr-only"
                aria-label="Carica file YAML o JSON"
              />
            </label>
            {#if leftText}
              <button
                class="btn btn--small btn--ghost"
                on:click={clearAll}
                title="Pulisci entrambi i pannelli"
                aria-label="Pulisci entrambi i pannelli"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                <span>Pulisci</span>
              </button>
            {/if}
          </div>
        </div>
        <div class="panel__body">
          <textarea
            id="source-textarea"
            class="panel__textarea"
            bind:value={leftText}
            placeholder={sourcePlaceholder}
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
          ></textarea>
          {#if isDragging}
            <div class="panel__drop-overlay" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Rilascia il file qui</span>
            </div>
          {/if}
        </div>
      </div>

      <!-- CENTER: Divider + swap -->
      <div class="divider" aria-hidden="true">
        <div class="divider__line"></div>
        <button
          class="divider__btn"
          on:click={swapPanels}
          disabled={!rightText}
          title="Inverti i pannelli — il contenuto di destra diventa la sorgente"
          aria-label="Inverti i pannelli e ricalcola la conversione"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
        </button>
        <div class="divider__line"></div>
      </div>

      <!-- RIGHT: Output panel -->
      <div
        class="panel panel--output"
        class:panel--yaml-output={outputFormat === 'yaml'}
        class:panel--json-output={outputFormat === 'json'}
        role="region"
        aria-label="Pannello risultato — {outputFormat.toUpperCase()}"
      >
        <div class="panel__header">
          <div class="panel__label">
            <span
              class="panel__dot"
              class:panel__dot--yaml={outputFormat === 'yaml'}
              class:panel__dot--json={outputFormat === 'json'}
              aria-hidden="true"
            ></span>
            <label for="output-textarea">
              {outputFormat.toUpperCase()}
              <span class="panel__label-sub">— risultato</span>
            </label>
          </div>
          <div class="panel__actions">
            {#if rightText}
              <button
                class="btn btn--small"
                class:btn--copied={copied}
                on:click={copyRight}
                title="Copia il contenuto negli appunti"
                aria-label={copied ? 'Contenuto copiato negli appunti' : 'Copia il contenuto negli appunti'}
              >
                {#if copied}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Copiato!</span>
                {:else}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  <span>Copia</span>
                {/if}
              </button>
            {/if}
          </div>
        </div>
        <div class="panel__body">
          <textarea
            id="output-textarea"
            class="panel__textarea"
            bind:value={rightText}
            placeholder="Il risultato della conversione apparirà qui..."
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- Error banner -->
    {#if error}
      <div id="error-message" class="error" role="alert">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div class="error__content">
          <strong>Errore di parsing</strong>
          <p>{error}</p>
        </div>
      </div>
    {/if}
  </main>

  <!-- ====== FOOTER ====== -->
  <footer class="footer">
    <p>Trasformazione dati in tempo reale &mdash; YAML ⇄ JSON Convertitore</p>
  </footer>
</div>

<style>
  /* ============================================
     GOOGLE FONTS
     ============================================ */
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:ital,wght@0,400;0,500;1,400&display=swap');

  /* ============================================
     DESIGN TOKENS
     ============================================ */
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(html) {
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
  }

  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #F8FAFC;
    color: #1E293B;
    line-height: 1.6;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* ============================================
     LAYOUT
     ============================================ */
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
    max-width: 1440px;
    margin: 0 auto;
    padding: 20px 20px 0;
  }

  /* ============================================
     HEADER
     ============================================ */
  .header {
    text-align: center;
    padding-bottom: 16px;
    flex-shrink: 0;
  }

  .eyebrow {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #7C3AED;
    margin-bottom: 2px;
  }

  .title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.375rem;
    font-weight: 700;
    color: #1E293B;
    letter-spacing: -0.025em;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .title__format {
    display: inline-block;
  }

  .title__format--yaml {
    color: #EA580C;
  }

  .title__format--json {
    color: #2563EB;
  }

  .title__arrow {
    color: #7C3AED;
    font-size: 1.175rem;
    display: inline-block;
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .title__arrow:hover {
    transform: rotate(180deg);
  }

  .subtitle {
    font-size: 0.8125rem;
    color: #64748B;
    max-width: 440px;
    margin: 0 auto;
  }

  /* ============================================
     MAIN
     ============================================ */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 20px;
    min-height: 0;
  }

  /* ============================================
     PANELS CONTAINER
     ============================================ */
  .panels {
    display: flex;
    gap: 0;
    flex: 1;
    min-height: 400px;
  }

  /* ============================================
     PANEL (shared)
     ============================================ */
  .panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    overflow: hidden;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    position: relative;
    min-width: 0;
  }

  .panel:focus-within {
    border-color: #7C3AED;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }

  /* Source panel left-border accent */
  .panel--source {
    border-left: 3px solid #E2E8F0;
    transition: border-left-color 0.3s ease;
  }

  .panel--yaml-source {
    border-left-color: #EA580C;
  }

  .panel--json-source {
    border-left-color: #2563EB;
  }

  /* Output panel right-border accent */
  .panel--output {
    border-right: 3px solid #E2E8F0;
    transition: border-right-color 0.3s ease;
  }

  .panel--yaml-output {
    border-right-color: #EA580C;
  }

  .panel--json-output {
    border-right-color: #2563EB;
  }

  /* Drag-over state */
  .panel--dragover {
    border-color: #7C3AED !important;
    border-style: dashed !important;
    border-left-style: dashed !important;
    background: rgba(124, 58, 237, 0.025);
  }

  /* ============================================
     PANEL HEADER
     ============================================ */
  .panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 12px;
    border-bottom: 1px solid #F1F5F9;
    background: #FAFBFC;
    gap: 8px;
    min-height: 44px;
    flex-shrink: 0;
  }

  .panel__label {
    display: flex;
    align-items: center;
    gap: 7px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    color: #1E293B;
    letter-spacing: 0.025em;
    min-width: 0;
  }

  .panel__label label {
    display: flex;
    align-items: baseline;
    gap: 4px;
    cursor: default;
    white-space: nowrap;
  }

  .panel__label-sub {
    font-family: 'Inter', sans-serif;
    font-weight: 400;
    font-size: 0.6875rem;
    color: #94A3B8;
  }

  .panel__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #CBD5E1;
    flex-shrink: 0;
    transition: background-color 0.3s ease, box-shadow 0.3s ease;
  }

  .panel__dot--yaml {
    background: #EA580C;
    box-shadow: 0 0 5px rgba(234, 88, 12, 0.35);
  }

  .panel__dot--json {
    background: #2563EB;
    box-shadow: 0 0 5px rgba(37, 99, 235, 0.35);
  }

  .panel__actions {
    display: flex;
    gap: 3px;
    align-items: center;
    flex-shrink: 0;
  }

  /* ============================================
     PANEL BODY & TEXTAREA
     ============================================ */
  .panel__body {
    flex: 1;
    position: relative;
    display: flex;
    min-height: 0;
  }

  .panel__textarea {
    flex: 1;
    border: none;
    outline: none;
    resize: none;
    padding: 12px 14px;
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace;
    font-size: 0.8125rem;
    line-height: 1.7;
    color: #1E293B;
    background: transparent;
    tab-size: 2;
    -moz-tab-size: 2;
    width: 100%;
    overflow-y: auto;
  }

  .panel__textarea::placeholder {
    color: #CBD5E1;
    font-style: italic;
    opacity: 1;
  }

  /* Drop overlay */
  .panel__drop-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: rgba(124, 58, 237, 0.07);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    color: #7C3AED;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    font-size: 0.875rem;
    pointer-events: none;
    z-index: 10;
    border-radius: 0 6px 6px 0;
  }

  /* ============================================
     DIVIDER + SWAP BUTTON
     ============================================ */
  .divider {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 8px;
    flex-shrink: 0;
    justify-content: center;
    gap: 0;
  }

  .divider__line {
    flex: 1;
    width: 2px;
    background: linear-gradient(
      to bottom,
      #EA580C 0%,
      #EA580C 18%,
      #7C3AED 50%,
      #2563EB 82%,
      #2563EB 100%
    );
    border-radius: 1px;
    min-height: 24px;
    transition: opacity 0.35s ease;
  }

  .divider__btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid #E2E8F0;
    background: #FFFFFF;
    color: #7C3AED;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    padding: 0;
    position: relative;
  }

  .divider__btn:hover:not(:disabled) {
    border-color: #7C3AED;
    background: #7C3AED;
    color: #FFFFFF;
    transform: scale(1.1);
    box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
  }

  .divider__btn:active:not(:disabled) {
    transform: scale(0.96);
    transition: transform 0.1s ease;
  }

  .divider__btn:focus-visible {
    outline: 2px solid #7C3AED;
    outline-offset: 3px;
  }

  .divider__btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* ============================================
     BUTTONS
     ============================================ */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 11px;
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.4;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
    white-space: nowrap;
    text-decoration: none;
    min-height: 32px;
    min-width: 32px;
    user-select: none;
    -webkit-user-select: none;
  }

  .btn--small {
    padding: 4px 10px;
    font-size: 0.75rem;
    min-height: 30px;
    gap: 4px;
  }

  .btn--ghost {
    background: transparent;
    border-color: transparent;
    color: #64748B;
  }

  .btn--ghost:hover {
    background: #F1F5F9;
    color: #1E293B;
  }

  .btn--ghost:active {
    background: #E2E8F0;
    transition: background 0.05s ease;
  }

  .btn:focus-visible {
    outline: 2px solid #7C3AED;
    outline-offset: 2px;
  }

  /* Copied state — green flash */
  .btn--copied {
    background: #16A34A !important;
    border-color: #16A34A !important;
    color: #FFFFFF !important;
  }

  /* ============================================
     ERROR BANNER
     ============================================ */
  .error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    border-radius: 8px;
    color: #991B1B;
    font-size: 0.8125rem;
    line-height: 1.5;
    animation: errorSlideIn 0.25s ease;
    flex-shrink: 0;
  }

  .error svg {
    flex-shrink: 0;
    margin-top: 1px;
    color: #DC2626;
  }

  .error__content strong {
    display: block;
    font-weight: 600;
    margin-bottom: 2px;
    font-family: 'Inter', sans-serif;
  }

  .error__content p {
    margin: 0;
    color: #B91C1C;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    word-break: break-word;
    line-height: 1.55;
  }

  @keyframes errorSlideIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ============================================
     FOOTER
     ============================================ */
  .footer {
    text-align: center;
    padding: 10px 0;
    border-top: 1px solid #E2E8F0;
    margin-top: auto;
    flex-shrink: 0;
  }

  .footer p {
    font-size: 0.6875rem;
    color: #94A3B8;
  }

  /* ============================================
     UTILITY
     ============================================ */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  /* ============================================
     RESPONSIVE — tablet
     ============================================ */
  @media (max-width: 768px) {
    .app {
      padding: 12px 12px 0;
    }

    .header {
      padding-bottom: 12px;
    }

    .title {
      font-size: 1.2rem;
      gap: 6px;
    }

    .subtitle {
      font-size: 0.8125rem;
    }

    .panels {
      flex-direction: column;
      min-height: auto;
      gap: 0;
    }

    .panel {
      min-height: 240px;
      border-radius: 8px;
    }

    .panel--source {
      border-left: 3px solid #E2E8F0;
      border-bottom: none;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }

    .panel--output {
      border-right: 3px solid #E2E8F0;
      border-top-left-radius: 0;
      border-top-right-radius: 0;
    }

    .panel__textarea {
      font-size: 0.875rem;
      padding: 10px 12px;
    }

    /* Divider becomes horizontal */
    .divider {
      flex-direction: row;
      padding: 0;
      height: 44px;
      justify-content: center;
      gap: 0;
    }

    .divider__line {
      width: auto;
      height: 2px;
      flex: 1;
      min-height: auto;
      min-width: 24px;
      background: linear-gradient(
        to right,
        #EA580C 0%,
        #EA580C 18%,
        #7C3AED 50%,
        #2563EB 82%,
        #2563EB 100%
      );
    }

    .divider__btn {
      width: 40px;
      height: 40px;
      transform: rotate(90deg);
      margin: 0 4px;
    }

    .divider__btn:hover:not(:disabled) {
      transform: rotate(90deg) scale(1.1);
    }

    .divider__btn:active:not(:disabled) {
      transform: rotate(90deg) scale(0.96);
    }

    .panel__drop-overlay {
      border-radius: 0 0 0 6px;
    }
  }

  /* ============================================
     RESPONSIVE — mobile
     ============================================ */
  @media (max-width: 480px) {
    .app {
      padding: 8px 8px 0;
    }

    .header {
      padding-bottom: 10px;
    }

    .title {
      font-size: 1.0625rem;
      gap: 5px;
    }

    .eyebrow {
      font-size: 0.625rem;
    }

    .subtitle {
      font-size: 0.75rem;
      max-width: 300px;
    }

    .panel__header {
      padding: 6px 10px;
      min-height: 40px;
    }

    .panel__label {
      font-size: 0.6875rem;
    }

    .panel__label-sub {
      display: none;
    }

    .panel__textarea {
      padding: 8px 10px;
      font-size: 0.8125rem;
      line-height: 1.6;
    }

    .btn--small {
      padding: 3px 8px;
      font-size: 0.6875rem;
      min-height: 28px;
    }

    .btn--small span {
      display: none;
    }

    .divider__btn {
      width: 36px;
      height: 36px;
    }

    .panel {
      min-height: 200px;
    }

    .error {
      padding: 8px 10px;
      font-size: 0.75rem;
    }

    .error__content p {
      font-size: 0.6875rem;
    }
  }

  /* ============================================
     ACCESSIBILITY — reduced motion
     ============================================ */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }

    .title__arrow:hover {
      transform: none;
    }
  }
</style>
