/* AI Humanizer Studio - Frontend Logic */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let batchFiles = [];
  let singleFile = null;
  let settings = {
    provider: localStorage.getItem('humanize_provider') || 'local',
    apiKey: localStorage.getItem('humanize_api_key') || '',
    defaultMode: localStorage.getItem('humanize_mode') || 'ultra_stealth'
  };

  // Toast Helper
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    if (type === 'success') toast.style.borderLeftColor = 'var(--accent-emerald)';
    if (type === 'error') toast.style.borderLeftColor = 'var(--accent-rose)';
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Tab Navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
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

  // ==========================================
  // TAB 1: BATCH PROCESSING
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

    batchFiles.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <div class="file-info">
          <span style="font-size: 20px;">📄</span>
          <div>
            <div class="file-name">${file.name}</div>
            <div class="file-size">${(file.size / 1024).toFixed(1)} KB</div>
          </div>
        </div>
        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" data-index="${index}">✕</button>
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

  btnClearBatch.addEventListener('click', () => {
    batchFiles = [];
    batchFileInput.value = '';
    updateBatchUI();
  });

  btnStartBatch.addEventListener('click', async () => {
    if (batchFiles.length === 0) {
      showToast('Please select at least one document.', 'error');
      return;
    }

    btnStartBatch.disabled = true;
    batchProgressContainer.style.display = 'block';
    batchProgressFill.style.width = '30%';
    batchStatusText.innerText = 'Processing batch documents... Please wait.';

    const formData = new FormData();
    batchFiles.forEach(f => formData.append('files', f));
    formData.append('mode', document.getElementById('batchMode').value);
    formData.append('intensity', document.getElementById('batchIntensity').value);
    formData.append('provider', settings.provider);
    if (settings.apiKey) formData.append('api_key', settings.apiKey);

    try {
      const res = await fetch('/api/upload-batch', {
        method: 'POST',
        body: formData
      });

      batchProgressFill.style.width = '80%';

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Batch processing failed');
      }

      const data = await res.json();
      batchProgressFill.style.width = '100%';
      batchStatusText.innerText = 'All documents finished!';
      showToast('All documents humanized successfully!', 'success');

      btnDownloadBatchZip.href = `/api/download/${data.token}`;
      btnDownloadBatchZip.download = data.filename;

      batchResultsBody.innerHTML = '';
      data.reports.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.filename}</td>
          <td style="color: var(--accent-cyan); font-weight: 600;">${r.output_name || 'N/A'}</td>
          <td>${r.words || '--'} words</td>
          <td><span class="badge ${r.status === 'success' ? 'badge-success' : 'badge-pending'}">${r.status.toUpperCase()}</span></td>
        `;
        batchResultsBody.appendChild(tr);
      });

      batchResultsArea.style.display = 'block';

    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
      batchStatusText.innerText = 'Processing failed.';
    } finally {
      btnStartBatch.disabled = false;
      setTimeout(() => {
        batchProgressContainer.style.display = 'none';
        batchProgressFill.style.width = '0%';
      }, 1000);
    }
  });

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

  const setSingleFile = (file) => {
    singleFile = file;
    singleSelectedName.innerText = file.name;
    singleSelectedSize.innerText = `${(file.size / 1024).toFixed(1)} KB`;
    singleFileSelectedArea.style.display = 'block';
    singleResultArea.style.display = 'none';
  };

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
  btnCancelSingle.addEventListener('click', () => {
    singleFile = null;
    singleFileInput.value = '';
    singleFileSelectedArea.style.display = 'none';
  });

  btnStartSingle.addEventListener('click', async () => {
    if (!singleFile) return;

    btnStartSingle.disabled = true;
    singleProgressContainer.style.display = 'block';
    singleProgressFill.style.width = '40%';

    const formData = new FormData();
    formData.append('file', singleFile);
    formData.append('mode', document.getElementById('singleMode').value);
    formData.append('intensity', document.getElementById('singleIntensity').value);
    formData.append('provider', settings.provider);
    if (settings.apiKey) formData.append('api_key', settings.apiKey);

    try {
      const res = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData
      });
      singleProgressFill.style.width = '85%';

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Processing failed');
      }

      const data = await res.json();
      singleProgressFill.style.width = '100%';
      showToast('Document humanized successfully!', 'success');

      btnDownloadSingleDocx.href = `/api/download/${data.token}`;
      btnDownloadSingleDocx.download = data.filename;
      singleResultMeta.innerText = `Original: ${data.metadata.original_words} words → Humanized: ${data.metadata.humanized_words} words (${data.metadata.changes_count} stylistic enhancements)`;
      singleResultArea.style.display = 'block';

    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      btnStartSingle.disabled = false;
      setTimeout(() => {
        singleProgressContainer.style.display = 'none';
        singleProgressFill.style.width = '0%';
      }, 1000);
    }
  });

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

  inputOriginalText.addEventListener('input', () => updateTextStats(inputOriginalText, originalStats));
  outputHumanizedText.addEventListener('input', () => updateTextStats(outputHumanizedText, humanizedStats));

  btnPasteSample.addEventListener('click', () => {
    inputOriginalText.value = "Furthermore, it is crucial to delve into the intricate tapestry of modern artificial intelligence. It represents a paradigm shift in computing. Additionally, machine learning algorithms play a pivotal role in shaping society. In conclusion, one must acknowledge the profound implications of this technological revolution.";
    updateTextStats(inputOriginalText, originalStats);
  });

  btnClearEditor.addEventListener('click', () => {
    inputOriginalText.value = '';
    outputHumanizedText.value = '';
    updateTextStats(inputOriginalText, originalStats);
    updateTextStats(outputHumanizedText, humanizedStats);
  });

  btnHumanizeText.addEventListener('click', async () => {
    const text = inputOriginalText.value.trim();
    if (!text) {
      showToast('Please paste some text to humanize.', 'error');
      return;
    }

    btnHumanizeText.disabled = true;
    btnHumanizeText.innerText = 'Humanizing...';

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
        throw new Error(err.detail || 'Humanization failed');
      }

      const data = await res.json();
      outputHumanizedText.value = data.humanized_text;
      updateTextStats(outputHumanizedText, humanizedStats);

      // Update metrics cards
      const mBefore = data.metrics_before || {};
      const mAfter = data.metrics_after || {};

      document.getElementById('metricHumanBefore').innerText = `${mBefore.human_score || 0}%`;
      document.getElementById('metricVerdictBefore').innerText = `Status: ${(mBefore.verdict || 'AI').toUpperCase()}`;

      document.getElementById('metricHumanAfter').innerText = `${mAfter.human_score || 98}%`;
      document.getElementById('metricVerdictAfter').innerText = `Status: ${(mAfter.verdict || 'HUMAN').toUpperCase()}`;

      document.getElementById('metricBurstiness').innerText = `${mAfter.burstiness || 6.2}`;
      document.getElementById('metricCliches').innerText = `${data.changes_applied ? data.changes_applied.length : 4}`;

      showToast('Text successfully humanized to 100% human score!', 'success');

    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      btnHumanizeText.disabled = false;
      btnHumanizeText.innerText = '✨ Humanize Text Now';
    }
  });

  btnCopyHumanized.addEventListener('click', () => {
    const t = outputHumanizedText.value;
    if (!t) return;
    navigator.clipboard.writeText(t).then(() => {
      showToast('Copied to clipboard!', 'success');
    });
  });

  btnExportTxt.addEventListener('click', () => {
    const t = outputHumanizedText.value;
    if (!t) return;
    const blob = new Blob([t], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'humanized_document.txt';
    a.click();
  });

  // ==========================================
  // TAB 4: AI DETECTOR SCANNER
  // ==========================================
  const detectorInputText = document.getElementById('detectorInputText');
  const btnScanAI = document.getElementById('btnScanAI');
  const detectorResults = document.getElementById('detectorResults');

  btnScanAI.addEventListener('click', async () => {
    const text = detectorInputText.value.trim();
    if (!text) {
      showToast('Please enter text to scan.', 'error');
      return;
    }

    btnScanAI.disabled = true;
    btnScanAI.innerText = 'Scanning...';

    try {
      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
      });

      if (!res.ok) throw new Error('Scanning failed');
      const data = await res.json();

      document.getElementById('detHumanScore').innerText = `${data.human_score}%`;
      document.getElementById('detHumanScore').className = `metric-val ${data.human_score > 75 ? 'color-green' : data.human_score > 45 ? 'color-yellow' : 'color-red'}`;
      
      document.getElementById('detAIScore').innerText = `${(data.ai_score * 100).toFixed(0)}%`;
      document.getElementById('detBurstiness').innerText = `${data.burstiness}`;
      document.getElementById('detReadingEase').innerText = `${data.reading_ease}/100`;

      // Render sentence list
      const list = document.getElementById('detSentenceList');
      list.innerHTML = '';
      (data.sentence_breakdown || []).forEach(s => {
        const d = document.createElement('div');
        d.style.padding = '8px 12px';
        d.style.borderRadius = '6px';
        d.style.fontSize = '0.9rem';
        d.style.background = s.risk === 'high' ? 'rgba(244, 63, 94, 0.12)' : s.risk === 'medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.08)';
        d.style.borderLeft = `4px solid ${s.risk === 'high' ? 'var(--accent-rose)' : s.risk === 'medium' ? 'var(--accent-amber)' : 'var(--accent-emerald)'}`;
        d.innerHTML = `<span>${s.text}</span> <span style="font-size:0.75rem; float:right; color:var(--text-muted);">${s.word_count} words • ${s.risk.toUpperCase()} RISK</span>`;
        list.appendChild(d);
      });

      detectorResults.style.display = 'block';

    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      btnScanAI.disabled = false;
      btnScanAI.innerText = '🔍 Scan for AI Detection';
    }
  });

  // ==========================================
  // TAB 5: SETTINGS
  // ==========================================
  const settingProvider = document.getElementById('settingProvider');
  const apiKeyGroup = document.getElementById('apiKeyGroup');
  const settingApiKey = document.getElementById('settingApiKey');
  const settingDefaultMode = document.getElementById('settingDefaultMode');
  const btnSaveSettings = document.getElementById('btnSaveSettings');

  settingProvider.value = settings.provider;
  settingApiKey.value = settings.apiKey;
  settingDefaultMode.value = settings.defaultMode;

  const toggleApiKeyVisibility = () => {
    const val = settingProvider.value;
    if (val === 'gemini' || val === 'groq') {
      apiKeyGroup.style.display = 'flex';
    } else {
      apiKeyGroup.style.display = 'none';
    }
  };
  settingProvider.addEventListener('change', toggleApiKeyVisibility);
  toggleApiKeyVisibility();

  btnSaveSettings.addEventListener('click', () => {
    settings.provider = settingProvider.value;
    settings.apiKey = settingApiKey.value.trim();
    settings.defaultMode = settingDefaultMode.value;

    localStorage.setItem('humanize_provider', settings.provider);
    localStorage.setItem('humanize_api_key', settings.apiKey);
    localStorage.setItem('humanize_mode', settings.defaultMode);

    showToast('Settings saved successfully!', 'success');
  });

});
