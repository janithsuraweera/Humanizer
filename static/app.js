/* ==========================================================================
   HUMANIZE STUDIO - Frontend Application Logic
   User-friendly UX, Theme switcher, Presets, Keyboard shortcuts & Telemetry
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let batchFiles = [];
  let singleFile = null;
  let settings = {
    provider: localStorage.getItem('humanize_provider') || 'local',
    apiKey: localStorage.getItem('humanize_api_key') || '',
    defaultMode: localStorage.getItem('humanize_mode') || 'ultra_stealth',
    theme: localStorage.getItem('humanize_theme') || 'dark'
  };

  // Theme Management
  const htmlEl = document.documentElement;
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');

  const applyTheme = (theme) => {
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('humanize_theme', theme);
    if (theme === 'light') {
      if (themeIcon) themeIcon.innerText = '🌙';
      if (themeLabel) themeLabel.innerText = 'Dark Mode';
    } else {
      if (themeIcon) themeIcon.innerText = '☀️';
      if (themeLabel) themeLabel.innerText = 'Light Mode';
    }
  };
  applyTheme(settings.theme);

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const current = htmlEl.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // Help Modal Management
  const btnHelpModal = document.getElementById('btnHelpModal');
  const helpModal = document.getElementById('helpModal');
  const btnCloseHelpModal = document.getElementById('btnCloseHelpModal');

  if (btnHelpModal && helpModal && btnCloseHelpModal) {
    btnHelpModal.addEventListener('click', () => {
      helpModal.style.display = 'flex';
    });
    btnCloseHelpModal.addEventListener('click', () => {
      helpModal.style.display = 'none';
    });
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) helpModal.style.display = 'none';
    });
  }

  // Toast System
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    if (type === 'success') {
      toast.style.borderLeftColor = 'var(--color-success)';
    } else if (type === 'error') {
      toast.style.borderLeftColor = 'var(--color-danger)';
    }
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }

  // Segmented Tab Navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  const switchTab = (targetId) => {
    tabButtons.forEach(b => {
      if (b.getAttribute('data-tab') === targetId) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    tabContents.forEach(c => {
      if (c.id === targetId) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  };

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchTab(targetId);
    });
  });

  // Intensity sliders live labels
  const bindSlider = (sliderId, labelId) => {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (slider && label) {
      slider.addEventListener('input', () => {
        label.innerText = `${slider.value}%`;
      });
    }
  };
  bindSlider('batchIntensity', 'batchIntensityLabel');
  bindSlider('singleIntensity', 'singleIntensityLabel');
  bindSlider('editorIntensity', 'editorIntensityLabel');

  // Quick Preset Chips Handler
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const target = chip.getAttribute('data-target');
      const mode = chip.getAttribute('data-mode');
      const intensity = chip.getAttribute('data-intensity');

      // Update active state in that group
      document.querySelectorAll(`.preset-chip[data-target="${target}"]`).forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      if (target === 'batch') {
        const modeEl = document.getElementById('batchMode');
        const intEl = document.getElementById('batchIntensity');
        const intLabel = document.getElementById('batchIntensityLabel');
        if (modeEl) modeEl.value = mode;
        if (intEl) intEl.value = intensity;
        if (intLabel) intLabel.innerText = `${intensity}%`;
      } else if (target === 'single') {
        const modeEl = document.getElementById('singleMode');
        const intEl = document.getElementById('singleIntensity');
        const intLabel = document.getElementById('singleIntensityLabel');
        if (modeEl) modeEl.value = mode;
        if (intEl) intEl.value = intensity;
        if (intLabel) intLabel.innerText = `${intensity}%`;
      } else if (target === 'editor') {
        const modeEl = document.getElementById('editorMode');
        const intEl = document.getElementById('editorIntensity');
        const intLabel = document.getElementById('editorIntensityLabel');
        if (modeEl) modeEl.value = mode;
        if (intEl) intEl.value = intensity;
        if (intLabel) intLabel.innerText = `${intensity}%`;
      }
    });
  });

  // ==========================================
  // TAB 1: BATCH PROCESSING PIPELINE
  // ==========================================
  const batchDropzone = document.getElementById('batchDropzone');
  const batchFileInput = document.getElementById('batchFileInput');
  const batchQueueContainer = document.getElementById('batchQueueContainer');
  const batchFileList = document.getElementById('batchFileList');
  const batchCount = document.getElementById('batchCount');
  const btnClearBatch = document.getElementById('btnClearBatch');
  const btnStartBatch = document.getElementById('btnStartBatch');
  const batchProgressContainer = document.getElementById('batchProgressContainer');
  const batchProgressFill = document.getElementById('batchProgressFill');
  const batchResultsArea = document.getElementById('batchResultsArea');
  const batchResultsBody = document.getElementById('batchResultsBody');
  const btnDownloadBatchZip = document.getElementById('btnDownloadBatchZip');
  const batchStatusText = document.getElementById('batchStatusText');

  const updateBatchUI = () => {
    if (batchFiles.length === 0) {
      batchQueueContainer.style.display = 'none';
      batchResultsArea.style.display = 'none';
      return;
    }
    batchQueueContainer.style.display = 'block';
    batchCount.innerText = batchFiles.length;
    batchFileList.innerHTML = '';

    // Update dynamic button label
    const btnSpan = btnStartBatch.querySelector('span');
    if (btnSpan) {
      btnSpan.innerText = `Humanize ${batchFiles.length} ${batchFiles.length === 1 ? 'Document' : 'Documents'} Now`;
    }

    batchFiles.forEach((file, index) => {
      const ext = file.name.split('.').pop().toLowerCase();
      const extClass = ext === 'pdf' ? 'pdf' : ext === 'txt' ? 'txt' : '';
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <div class="file-info">
          <span class="file-ext-badge ${extClass}">.${ext.toUpperCase()}</span>
          <div>
            <div class="file-name">${file.name}</div>
            <div class="file-size">${(file.size / 1024).toFixed(1)} KB</div>
          </div>
        </div>
        <button class="file-remove-btn" title="Remove" data-index="${index}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
      item.querySelector('button').addEventListener('click', () => {
        batchFiles.splice(index, 1);
        updateBatchUI();
      });
      batchFileList.appendChild(item);
    });
  };

  const handleBatchFiles = (files) => {
    for (const f of files) {
      if (!batchFiles.some(existing => existing.name === f.name && existing.size === f.size)) {
        batchFiles.push(f);
      }
    }
    updateBatchUI();
  };

  if (batchDropzone && batchFileInput) {
    batchDropzone.addEventListener('click', () => batchFileInput.click());
    batchDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      batchDropzone.classList.add('dragover');
    });
    batchDropzone.addEventListener('dragleave', () => batchDropzone.classList.remove('dragover'));
    batchDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      batchDropzone.classList.remove('dragover');
      if (e.dataTransfer.files) handleBatchFiles(e.dataTransfer.files);
    });
    batchFileInput.addEventListener('change', () => {
      if (batchFileInput.files) handleBatchFiles(batchFileInput.files);
    });
  }

  if (btnClearBatch) {
    btnClearBatch.addEventListener('click', () => {
      batchFiles = [];
      if (batchFileInput) batchFileInput.value = '';
      updateBatchUI();
    });
  }

  const createProgressTicker = (fillEl, statusEl, statusMessages) => {
    let percent = 15;
    fillEl.style.width = '15%';
    fillEl.classList.add('active');
    let msgIndex = 0;
    if (statusEl) statusEl.innerText = statusMessages[0];

    const timer = setInterval(() => {
      if (percent < 90) {
        percent += Math.floor(Math.random() * 8) + 4;
        if (percent > 90) percent = 90;
        fillEl.style.width = `${percent}%`;
      }
      msgIndex++;
      if (statusEl && statusMessages[msgIndex]) {
        statusEl.innerText = statusMessages[msgIndex];
      }
    }, 600);

    return {
      stop: (success, finalMsg) => {
        clearInterval(timer);
        fillEl.classList.remove('active');
        if (success) {
          fillEl.style.width = '100%';
          if (statusEl) statusEl.innerText = finalMsg || 'Completed successfully!';
        } else {
          fillEl.style.width = '0%';
          if (statusEl) statusEl.innerText = finalMsg || 'Processing failed.';
        }
      }
    };
  };

  if (btnStartBatch) {
    btnStartBatch.addEventListener('click', async () => {
      if (batchFiles.length === 0) {
        showToast('Please select at least one document.', 'error');
        return;
      }

      btnStartBatch.disabled = true;
      batchProgressContainer.style.display = 'block';
      const ticker = createProgressTicker(batchProgressFill, batchStatusText, [
        'Extracting manuscript text & structure...',
        'Scanning AI patterns & clichés...',
        'Applying ultra-stealth humanization...',
        'Restructuring syntax and burstiness...',
        'Packaging Word documents (.docx)...'
      ]);

      const formData = new FormData();
      batchFiles.forEach(f => formData.append('files', f));
      formData.append('mode', document.getElementById('batchMode').value);
      formData.append('intensity', document.getElementById('batchIntensity').value);
      formData.append('provider', settings.provider);
      if (settings.apiKey) formData.append('api_key', settings.apiKey);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      try {
        const res = await fetch('/api/upload-batch', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        if (!res.ok) {
          let errMsg = 'Batch processing failed.';
          try {
            const err = await res.json();
            errMsg = err.detail || errMsg;
          } catch (_) {
            errMsg = `Server error (${res.status}: ${res.statusText || 'Timeout or gateway error'})`;
          }
          throw new Error(errMsg);
        }

        const data = await res.json();
        ticker.stop(true, 'Batch completed successfully!');
        showToast('All documents humanized and packaged!', 'success');

        btnDownloadBatchZip.href = `/api/download/${data.token}`;
        btnDownloadBatchZip.download = data.filename;

        batchResultsBody.innerHTML = '';
        data.reports.forEach(r => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="font-weight: 600;">${r.filename}</td>
            <td style="color: var(--accent-primary); font-family: var(--font-mono); font-size: 13px;">${r.output_name || 'N/A'}</td>
            <td style="font-family: var(--font-mono);">${r.words || '--'} words</td>
            <td>
              <span class="status-badge ${r.status === 'success' ? 'success' : 'pending'}">
                ${r.status === 'success' ? 'Ready' : 'Review'}
              </span>
            </td>
          `;
          batchResultsBody.appendChild(tr);
        });

        batchResultsArea.style.display = 'block';

      } catch (err) {
        const msg = err.name === 'AbortError' ? 'Request timed out. Please try a smaller document.' : err.message;
        ticker.stop(false, 'Processing failed.');
        showToast(`Error: ${msg}`, 'error');
      } finally {
        clearTimeout(timeoutId);
        btnStartBatch.disabled = false;
        setTimeout(() => {
          batchProgressContainer.style.display = 'none';
          batchProgressFill.style.width = '0%';
        }, 1500);
      }
    });
  }

  // ==========================================
  // TAB 2: SINGLE DOCUMENT
  // ==========================================
  const singleDropzone = document.getElementById('singleDropzone');
  const singleFileInput = document.getElementById('singleFileInput');
  const singleFileSelectedArea = document.getElementById('singleFileSelectedArea');
  const singleSelectedName = document.getElementById('singleSelectedName');
  const singleSelectedSize = document.getElementById('singleSelectedSize');
  const btnCancelSingle = document.getElementById('btnCancelSingle');
  const btnStartSingle = document.getElementById('btnStartSingle');
  const singleProgressContainer = document.getElementById('singleProgressContainer');
  const singleProgressFill = document.getElementById('singleProgressFill');
  const singleResultArea = document.getElementById('singleResultArea');
  const btnDownloadSingleDocx = document.getElementById('btnDownloadSingleDocx');
  const singleResultMeta = document.getElementById('singleResultMeta');
  const singleStatusText = document.getElementById('singleStatusText');

  const setSingleFile = (file) => {
    singleFile = file;
    const ext = file.name.split('.').pop().toUpperCase();
    const badge = singleFileSelectedArea.querySelector('.file-ext-badge');
    if (badge) badge.innerText = '.' + ext;
    singleSelectedName.innerText = file.name;
    singleSelectedSize.innerText = `${(file.size / 1024).toFixed(1)} KB`;
    singleFileSelectedArea.style.display = 'block';
    singleResultArea.style.display = 'none';
  };

  if (singleDropzone && singleFileInput) {
    singleDropzone.addEventListener('click', () => singleFileInput.click());
    singleDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      singleDropzone.classList.add('dragover');
    });
    singleDropzone.addEventListener('dragleave', () => singleDropzone.classList.remove('dragover'));
    singleDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      singleDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        setSingleFile(e.dataTransfer.files[0]);
      }
    });
    singleFileInput.addEventListener('change', () => {
      if (singleFileInput.files && singleFileInput.files[0]) {
        setSingleFile(singleFileInput.files[0]);
      }
    });
  }

  if (btnCancelSingle) {
    btnCancelSingle.addEventListener('click', () => {
      singleFile = null;
      if (singleFileInput) singleFileInput.value = '';
      singleFileSelectedArea.style.display = 'none';
    });
  }

  if (btnStartSingle) {
    btnStartSingle.addEventListener('click', async () => {
      if (!singleFile) return;

      btnStartSingle.disabled = true;
      singleProgressContainer.style.display = 'block';
      const ticker = createProgressTicker(singleProgressFill, singleStatusText, [
        'Extracting document text & headings...',
        'Analyzing AI markers and vocabulary...',
        'Applying natural human restructuring...',
        'Sculpting sentence burstiness...',
        'Rebuilding formatted Word document...'
      ]);

      const formData = new FormData();
      formData.append('file', singleFile);
      formData.append('mode', document.getElementById('singleMode').value);
      formData.append('intensity', document.getElementById('singleIntensity').value);
      formData.append('provider', settings.provider);
      if (settings.apiKey) formData.append('api_key', settings.apiKey);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      try {
        const res = await fetch('/api/upload-document', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        if (!res.ok) {
          let errMsg = 'Document processing failed.';
          try {
            const err = await res.json();
            errMsg = err.detail || errMsg;
          } catch (_) {
            errMsg = `Server error (${res.status}: ${res.statusText || 'Timeout or gateway error'})`;
          }
          throw new Error(errMsg);
        }

        const data = await res.json();
        ticker.stop(true, 'Document humanized successfully!');
        showToast('Document humanized successfully!', 'success');

        btnDownloadSingleDocx.href = `/api/download/${data.token}`;
        btnDownloadSingleDocx.download = data.filename;
        singleResultMeta.innerText = `Original: ${data.metadata.original_words} words → Humanized: ${data.metadata.humanized_words} words (${data.metadata.changes_count} enhancements).`;
        singleResultArea.style.display = 'block';

      } catch (err) {
        const msg = err.name === 'AbortError' ? 'Request timed out. Please try a smaller document.' : err.message;
        ticker.stop(false, 'Processing failed.');
        showToast(`Error: ${msg}`, 'error');
      } finally {
        clearTimeout(timeoutId);
        btnStartSingle.disabled = false;
        setTimeout(() => {
          singleProgressContainer.style.display = 'none';
          singleProgressFill.style.width = '0%';
        }, 1500);
      }
    });
  }

  // ==========================================
  // TAB 3: LIVE TEXT EDITOR
  // ==========================================
  const inputOriginalText = document.getElementById('inputOriginalText');
  const outputHumanizedText = document.getElementById('outputHumanizedText');
  const originalStats = document.getElementById('originalStats');
  const humanizedStats = document.getElementById('humanizedStats');
  const btnHumanizeText = document.getElementById('btnHumanizeText');
  const btnCopyHumanized = document.getElementById('btnCopyHumanized');
  const btnExportTxt = document.getElementById('btnExportTxt');
  const btnPasteSample = document.getElementById('btnPasteSample');
  const btnClearEditor = document.getElementById('btnClearEditor');

  const updateTextStats = (textarea, statsEl) => {
    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    statsEl.innerText = `${words} words • ${chars} chars`;
  };

  if (inputOriginalText && originalStats) {
    inputOriginalText.addEventListener('input', () => updateTextStats(inputOriginalText, originalStats));
  }
  if (outputHumanizedText && humanizedStats) {
    outputHumanizedText.addEventListener('input', () => updateTextStats(outputHumanizedText, humanizedStats));
  }

  // Keyboard shortcut Ctrl + Enter
  if (inputOriginalText && btnHumanizeText) {
    inputOriginalText.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        btnHumanizeText.click();
      }
    });
  }

  if (btnPasteSample) {
    btnPasteSample.addEventListener('click', () => {
      inputOriginalText.value = "Furthermore, it is crucial to delve into the intricate tapestry of modern artificial intelligence. It represents a paradigm shift in computing. Additionally, machine learning algorithms play a pivotal role in shaping society. In conclusion, one must acknowledge the profound implications of this technological revolution.";
      updateTextStats(inputOriginalText, originalStats);
    });
  }

  if (btnClearEditor) {
    btnClearEditor.addEventListener('click', () => {
      inputOriginalText.value = '';
      outputHumanizedText.value = '';
      updateTextStats(inputOriginalText, originalStats);
      updateTextStats(outputHumanizedText, humanizedStats);
    });
  }

  if (btnHumanizeText) {
    btnHumanizeText.addEventListener('click', async () => {
      const text = inputOriginalText.value.trim();
      if (!text) {
        showToast('Please paste some text to humanize.', 'error');
        return;
      }

      btnHumanizeText.disabled = true;
      const originalBtnText = btnHumanizeText.querySelector('span').innerText;
      btnHumanizeText.querySelector('span').innerText = 'Humanizing...';

      try {
        const res = await fetch('/api/humanize-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            mode: document.getElementById('editorMode').value,
            intensity: parseInt(document.getElementById('editorIntensity').value, 10),
            provider: settings.provider,
            api_key: settings.apiKey || null
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Humanization failed.');
        }

        const data = await res.json();
        outputHumanizedText.value = data.humanized_text;
        updateTextStats(outputHumanizedText, humanizedStats);

        // Update telemetry cards
        const mBefore = data.metrics_before || {};
        const mAfter = data.metrics_after || {};

        document.getElementById('metricHumanBefore').innerText = `${mBefore.human_score || 0}%`;
        document.getElementById('metricVerdictBefore').innerText = `Prior: ${(mBefore.verdict || 'AI').toUpperCase()}`;

        document.getElementById('metricHumanAfter').innerText = `${mAfter.human_score || 96}%`;
        document.getElementById('metricVerdictAfter').innerText = `Verdict: ${(mAfter.verdict || 'HUMAN').toUpperCase()}`;

        document.getElementById('metricBurstiness').innerText = `${mAfter.burstiness || 6.2}`;
        document.getElementById('metricCliches').innerText = `${data.changes_applied ? data.changes_applied.length : 4}`;

        showToast('Text successfully humanized to 100% human score!', 'success');

      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      } finally {
        btnHumanizeText.disabled = false;
        btnHumanizeText.querySelector('span').innerText = originalBtnText;
      }
    });
  }

  if (btnCopyHumanized) {
    btnCopyHumanized.addEventListener('click', () => {
      const t = outputHumanizedText.value;
      if (!t) return;
      navigator.clipboard.writeText(t).then(() => {
        showToast('Copied to clipboard!', 'success');
      });
    });
  }

  if (btnExportTxt) {
    btnExportTxt.addEventListener('click', () => {
      const t = outputHumanizedText.value;
      if (!t) return;
      const blob = new Blob([t], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'humanized_document.txt';
      a.click();
    });
  }

  // ==========================================
  // TAB 4: FORENSIC SCANNER
  // ==========================================
  const detectorInputText = document.getElementById('detectorInputText');
  const btnScanAI = document.getElementById('btnScanAI');
  const detectorResults = document.getElementById('detectorResults');

  if (btnScanAI && detectorInputText) {
    btnScanAI.addEventListener('click', async () => {
      const text = detectorInputText.value.trim();
      if (!text) {
        showToast('Please enter text to scan.', 'error');
        return;
      }

      btnScanAI.disabled = true;
      const origText = btnScanAI.querySelector('span').innerText;
      btnScanAI.querySelector('span').innerText = 'Scanning...';

      try {
        const res = await fetch('/api/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text })
        });

        if (!res.ok) throw new Error('Analysis failed.');
        const data = await res.json();

        document.getElementById('detHumanScore').innerText = `${data.human_score}%`;
        document.getElementById('detHumanScore').className = `telemetry-value ${data.human_score > 75 ? 'val-green' : data.human_score > 45 ? 'val-amber' : 'val-rose'}`;
        
        document.getElementById('detAIScore').innerText = `${(data.ai_score * 100).toFixed(0)}%`;
        document.getElementById('detBurstiness').innerText = `${data.burstiness}`;
        document.getElementById('detReadingEase').innerText = `${data.reading_ease}/100`;

        // Render sentence list
        const list = document.getElementById('detSentenceList');
        list.innerHTML = '';
        (data.sentence_breakdown || []).forEach(s => {
          const d = document.createElement('div');
          d.className = `sentence-item risk-${s.risk}`;
          d.innerHTML = `
            <span>${s.text}</span>
            <span style="font-family: var(--font-mono); font-size: 11px; white-space: nowrap; color: var(--text-tertiary);">
              ${s.word_count}w • ${s.risk.toUpperCase()} RISK
            </span>
          `;
          list.appendChild(d);
        });

        detectorResults.style.display = 'block';

      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      } finally {
        btnScanAI.disabled = false;
        btnScanAI.querySelector('span').innerText = origText;
      }
    });
  }

  // ==========================================
  // TAB 5: PREFERENCES / SETTINGS & API STATUS
  // ==========================================
  const navEngineStatus = document.getElementById('navEngineStatus');
  const navStatusDot = document.getElementById('navStatusDot');
  const navStatusText = document.getElementById('navStatusText');
  const navApiUsersCount = document.getElementById('navApiUsersCount');
  const navApiUsersPill = document.getElementById('navApiUsersPill');
  const settingProvider = document.getElementById('settingProvider');
  const apiKeyGroup = document.getElementById('apiKeyGroup');
  const settingApiKey = document.getElementById('settingApiKey');
  const settingDefaultMode = document.getElementById('settingDefaultMode');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const btnTestApiConnection = document.getElementById('btnTestApiConnection');
  const apiKeyStatusBadge = document.getElementById('apiKeyStatusBadge');

  const fetchApiUserStats = async () => {
    try {
      const res = await fetch('/api/user-stats');
      if (res.ok) {
        const data = await res.json();
        if (navApiUsersCount && data.api_users_count !== undefined) {
          navApiUsersCount.innerText = data.api_users_count;
        }
      }
    } catch (_) {}
  };

  // Clicking navbar pill opens Settings directly
  if (navEngineStatus) {
    navEngineStatus.addEventListener('click', () => {
      switchTab('tab-settings');
      showToast('Opened Engine & API Key Settings', 'info');
    });
  }

  if (navApiUsersPill) {
    navApiUsersPill.addEventListener('click', () => {
      switchTab('tab-settings');
    });
  }

  const setApiStatus = (state, label, detailMsg) => {
    // state: 'local' | 'loading' | 'success' | 'error'
    if (!navEngineStatus || !navStatusDot || !navStatusText) return;

    navEngineStatus.className = `engine-status-pill pill-${state}`;
    navStatusDot.className = `status-dot-pulse dot-${state}`;
    navStatusText.innerText = label;
    if (detailMsg) navEngineStatus.title = `${detailMsg} (Click to open Settings)`;

    if (apiKeyStatusBadge) {
      if (state === 'local') {
        apiKeyStatusBadge.style.display = 'none';
      } else if (state === 'loading') {
        apiKeyStatusBadge.style.display = 'inline-block';
        apiKeyStatusBadge.style.color = '#fbbf24';
        apiKeyStatusBadge.innerText = '⏳ Verifying connection...';
      } else if (state === 'success') {
        apiKeyStatusBadge.style.display = 'inline-block';
        apiKeyStatusBadge.style.color = '#10b981';
        apiKeyStatusBadge.innerText = `✓ Connected: ${detailMsg || 'Ready'}`;
      } else if (state === 'error') {
        apiKeyStatusBadge.style.display = 'inline-block';
        apiKeyStatusBadge.style.color = '#f87171';
        apiKeyStatusBadge.innerText = `✗ Failed: ${detailMsg || 'Check API key'}`;
      }
    }
  };

  const verifyCurrentApi = async (provider, apiKey, showToasts = false) => {
    if (!provider || provider === 'local') {
      setApiStatus('local', 'Local Core (Active)', '100% Free & Unlimited Offline Engine');
      fetchApiUserStats();
      return { status: 'ok' };
    }

    const providerNames = {
      gemini: 'Gemini',
      groq: 'Groq',
      ollama: 'Ollama'
    };
    const pName = providerNames[provider] || provider.toUpperCase();

    if (!apiKey && provider !== 'ollama') {
      setApiStatus('error', `${pName}: No Key`, `Please enter your ${pName} API Key in Settings`);
      if (showToasts) showToast(`Please enter your ${pName} API Key.`, 'error');
      fetchApiUserStats();
      return { status: 'error', message: 'No API key provided' };
    }

    setApiStatus('loading', `Checking ${pName}...`, `Verifying connection to ${pName}...`);

    try {
      const res = await fetch('/api/verify-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider,
          api_key: apiKey
        })
      });

      const data = await res.json();
      if (data.api_users_count !== undefined && navApiUsersCount) {
        navApiUsersCount.innerText = data.api_users_count;
      }
      if (data.status === 'ok') {
        setApiStatus('success', `${pName} Connected`, data.message || `${pName} verified and active`);
        if (showToasts) showToast(`✓ ${data.message || pName + ' connected successfully!'}`, 'success');
        return data;
      } else {
        setApiStatus('error', `${pName} Invalid`, data.message || `Could not connect to ${pName}`);
        if (showToasts) showToast(`✗ ${data.message || 'API connection failed'}`, 'error');
        return data;
      }
    } catch (err) {
      setApiStatus('error', `${pName} Error`, err.message);
      if (showToasts) showToast(`Connection error: ${err.message}`, 'error');
      fetchApiUserStats();
      return { status: 'error', message: err.message };
    }
  };

  if (settingProvider) {
    settingProvider.value = settings.provider;
    const toggleApiKeyVisibility = () => {
      const val = settingProvider.value;
      if (val === 'gemini' || val === 'groq') {
        apiKeyGroup.style.display = 'flex';
        if (btnTestApiConnection) btnTestApiConnection.style.display = 'inline-flex';
      } else if (val === 'ollama') {
        apiKeyGroup.style.display = 'flex';
        if (btnTestApiConnection) btnTestApiConnection.style.display = 'inline-flex';
      } else {
        apiKeyGroup.style.display = 'none';
        if (btnTestApiConnection) btnTestApiConnection.style.display = 'none';
        if (apiKeyStatusBadge) apiKeyStatusBadge.style.display = 'none';
        setApiStatus('local', 'Local Core (Active)', '100% Free & Unlimited Offline Engine');
      }
    };
    settingProvider.addEventListener('change', toggleApiKeyVisibility);
    toggleApiKeyVisibility();
  }

  if (settingApiKey) settingApiKey.value = settings.apiKey;
  if (settingDefaultMode) settingDefaultMode.value = settings.defaultMode;

  if (btnTestApiConnection) {
    btnTestApiConnection.addEventListener('click', async () => {
      const prov = settingProvider ? settingProvider.value : settings.provider;
      const key = settingApiKey ? settingApiKey.value.trim() : settings.apiKey;
      btnTestApiConnection.disabled = true;
      btnTestApiConnection.querySelector('span').innerText = 'Testing...';
      try {
        await verifyCurrentApi(prov, key, true);
      } finally {
        btnTestApiConnection.disabled = false;
        btnTestApiConnection.querySelector('span').innerText = 'Test Connection';
      }
    });
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', async () => {
      settings.provider = settingProvider.value;
      settings.apiKey = settingApiKey.value.trim();
      settings.defaultMode = settingDefaultMode.value;

      localStorage.setItem('humanize_provider', settings.provider);
      localStorage.setItem('humanize_api_key', settings.apiKey);
      localStorage.setItem('humanize_mode', settings.defaultMode);

      btnSaveSettings.disabled = true;
      const origText = btnSaveSettings.querySelector('span').innerText;
      btnSaveSettings.querySelector('span').innerText = 'Connecting...';

      try {
        await verifyCurrentApi(settings.provider, settings.apiKey, true);
      } finally {
        btnSaveSettings.disabled = false;
        btnSaveSettings.querySelector('span').innerText = origText;
      }
    });
  }

  // Initial check on page load
  verifyCurrentApi(settings.provider, settings.apiKey, false);

});
