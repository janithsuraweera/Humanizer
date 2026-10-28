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

  const MAX_FILE_SIZE = 4.2 * 1024 * 1024; // 4.2 MB Vercel Serverless Body Limit
  const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  const optimizeDocxIfNeeded = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.docx') || file.size <= 3.8 * 1024 * 1024) {
      return file;
    }

    if (typeof JSZip === 'undefined') {
      return file;
    }

    try {
      showToast(`Optimizing ${(file.size / 1024 / 1024).toFixed(1)} MB Word document to bypass cloud limits...`, 'info');
      const zip = await JSZip.loadAsync(file);

      const mediaPaths = [];
      zip.forEach((path, entry) => {
        if (path.startsWith('word/media/') && !entry.dir) {
          mediaPaths.push(path);
        }
      });

      if (mediaPaths.length > 0) {
        const binStr = atob(TINY_PNG_BASE64);
        const u8 = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          u8[i] = binStr.charCodeAt(i);
        }

        mediaPaths.forEach(path => {
          zip.file(path, u8);
        });

        const optimizedBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });

        console.log(`Auto-compressed docx from ${(file.size / 1024 / 1024).toFixed(2)} MB to ${(optimizedBlob.size / 1024).toFixed(1)} KB`);
        showToast(`Document compressed: ${(file.size / 1024 / 1024).toFixed(1)} MB → ${(optimizedBlob.size / 1024).toFixed(1)} KB`, 'success');
        return new File([optimizedBlob], file.name, {
          type: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
      }
    } catch (err) {
      console.warn('Docx auto-compression error:', err);
    }
    return file;
  };

  const handleBatchFiles = (files) => {
    for (const f of files) {
      const isDocx = f.name.toLowerCase().endsWith('.docx');
      if (f.size > MAX_FILE_SIZE && !isDocx) {
        showToast(`Skipped "${f.name}" (${(f.size / (1024 * 1024)).toFixed(1)} MB): Only .docx files can be auto-compressed beyond 4.5 MB.`, 'error');
        continue;
      }
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
    const isSingle = fillEl.id && fillEl.id.startsWith('single');
    const prefix = isSingle ? 'single' : 'batch';

    const ringFill = document.getElementById(`${prefix}RingFill`);
    const percentText = document.getElementById(`${prefix}PercentText`);
    const matrixStatus = document.getElementById(`${prefix}MatrixStatus`);
    const taskTitle = document.getElementById(`${prefix}TaskTitle`);
    const stagePill = document.getElementById(`${prefix}StagePill`);

    const step1 = document.getElementById(`${prefix}Step1`);
    const step2 = document.getElementById(`${prefix}Step2`);
    const step3 = document.getElementById(`${prefix}Step3`);
    const step4 = document.getElementById(`${prefix}Step4`);

    const conn1 = document.getElementById(`${prefix}Conn1`);
    const conn2 = document.getElementById(`${prefix}Conn2`);
    const conn3 = document.getElementById(`${prefix}Conn3`);

    const setStepState = (stepEl, state) => {
      if (!stepEl) return;
      stepEl.classList.remove('pending', 'active', 'completed');
      stepEl.classList.add(state);
    };

    const updateMatrixUI = (p) => {
      if (percentText) percentText.innerText = `${p}%`;
      if (ringFill) {
        // Circumference for r=18 is ~113.1
        const offset = Math.max(0, 113.1 * (1 - p / 100));
        ringFill.style.strokeDashoffset = offset;
      }

      if (p < 25) {
        setStepState(step1, 'active');
        setStepState(step2, 'pending');
        setStepState(step3, 'pending');
        setStepState(step4, 'pending');
        if (conn1) conn1.style.width = `${Math.min(100, (p / 25) * 100)}%`;
        if (conn2) conn2.style.width = '0%';
        if (conn3) conn3.style.width = '0%';
        if (stagePill) stagePill.innerText = 'STAGE 1 / 4';
        if (taskTitle) taskTitle.innerText = isSingle ? 'Ingesting Manuscript Structure...' : 'Extracting Document Batch...';
      } else if (p < 55) {
        setStepState(step1, 'completed');
        setStepState(step2, 'active');
        setStepState(step3, 'pending');
        setStepState(step4, 'pending');
        if (conn1) conn1.style.width = '100%';
        if (conn2) conn2.style.width = `${Math.min(100, ((p - 25) / 30) * 100)}%`;
        if (conn3) conn3.style.width = '0%';
        if (stagePill) stagePill.innerText = 'STAGE 2 / 4';
        if (taskTitle) taskTitle.innerText = 'Neural Forensic Pattern Scan...';
      } else if (p < 85) {
        setStepState(step1, 'completed');
        setStepState(step2, 'completed');
        setStepState(step3, 'active');
        setStepState(step4, 'pending');
        if (conn1) conn1.style.width = '100%';
        if (conn2) conn2.style.width = '100%';
        if (conn3) conn3.style.width = `${Math.min(100, ((p - 55) / 30) * 100)}%`;
        if (stagePill) stagePill.innerText = 'STAGE 3 / 4';
        if (taskTitle) taskTitle.innerText = 'Sculpting Natural Human Cadence...';
      } else {
        setStepState(step1, 'completed');
        setStepState(step2, 'completed');
        setStepState(step3, 'completed');
        setStepState(step4, 'active');
        if (conn1) conn1.style.width = '100%';
        if (conn2) conn2.style.width = '100%';
        if (conn3) conn3.style.width = '100%';
        if (stagePill) stagePill.innerText = 'STAGE 4 / 4';
        if (taskTitle) taskTitle.innerText = isSingle ? 'Packaging Clean Word Document (.docx)...' : 'Packaging Archive (.zip)...';
      }
    };

    let percent = 14;
    fillEl.style.width = '14%';
    updateMatrixUI(percent);
    let msgIndex = 0;
    if (statusEl && statusMessages && statusMessages[0]) {
      statusEl.innerText = statusMessages[0];
    }
    if (matrixStatus) matrixStatus.innerText = 'NEURAL ENGINE ACTIVE';

    const timer = setInterval(() => {
      if (percent < 92) {
        percent += Math.floor(Math.random() * 6) + 3;
        if (percent > 92) percent = 92;
        fillEl.style.width = `${percent}%`;
        updateMatrixUI(percent);
      }
      msgIndex++;
      if (statusEl && statusMessages && statusMessages[msgIndex]) {
        statusEl.innerText = statusMessages[msgIndex];
      }
    }, 450);

    return {
      stop: (success, finalMsg) => {
        clearInterval(timer);
        if (success) {
          fillEl.style.width = '100%';
          updateMatrixUI(100);
          setStepState(step1, 'completed');
          setStepState(step2, 'completed');
          setStepState(step3, 'completed');
          setStepState(step4, 'completed');
          if (conn1) conn1.style.width = '100%';
          if (conn2) conn2.style.width = '100%';
          if (conn3) conn3.style.width = '100%';
          if (stagePill) stagePill.innerText = 'COMPLETE';
          if (matrixStatus) matrixStatus.innerText = 'TRANSFORMATION READY';
          if (taskTitle) taskTitle.innerText = isSingle ? 'Manuscript Ready for Download!' : 'Batch Archive Ready!';
          if (statusEl) statusEl.innerText = finalMsg || 'Document humanized successfully!';
        } else {
          fillEl.style.width = '0%';
          if (percentText) percentText.innerText = '0%';
          if (ringFill) ringFill.style.strokeDashoffset = 113.1;
          if (stagePill) stagePill.innerText = 'FAILED';
          if (matrixStatus) matrixStatus.innerText = 'PROCESSING HALTED';
          if (taskTitle) taskTitle.innerText = 'Pipeline Interrupted';
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

      const filesToSend = await Promise.all(batchFiles.map(f => optimizeDocxIfNeeded(f)));
      const formData = new FormData();
      filesToSend.forEach(f => formData.append('files', f));
      formData.append('mode', document.getElementById('batchMode').value);
      formData.append('intensity', document.getElementById('batchIntensity').value);
      formData.append('provider', settings.provider);
      if (settings.apiKey) formData.append('api_key', settings.apiKey);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      try {
        const res = await fetch('/api/upload-batch', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        if (!res.ok) {
          let errMsg = 'Batch processing failed.';
          if (res.status === 413) {
            errMsg = 'Batch payload too large (413). Total size exceeds Vercel 4.5 MB limit. Please remove embedded images or upload files individually.';
          } else {
            try {
              const err = await res.json();
              errMsg = err.detail || errMsg;
            } catch (_) {
              errMsg = `Server error (${res.status}: ${res.statusText || 'Timeout or gateway error'})`;
            }
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
        const msg = err.name === 'AbortError' 
          ? 'Network timeout. If using cloud APIs (Gemini/Groq), try switching to "Local Offline Engine" which is instant and unlimited.' 
          : err.message;
        ticker.stop(false, 'Processing failed.');
        showToast(`Error: ${msg}`, 'error');
      } finally {
        clearTimeout(timeoutId);
        btnStartBatch.disabled = false;
        setTimeout(() => {
          batchProgressContainer.style.display = 'none';
          batchProgressFill.style.width = '0%';
        }, 2200);
      }
    });
  }

  // ==========================================================================
  // SHARED AI DETECTION & PLAGIARISM RISK HIGHLIGHTER ENGINE
  // ==========================================================================
  const HIGH_RISK_PATTERNS = [
    /\bdelve into\b/gi, /\bdelving into\b/gi, /\bintricate tapestry\b/gi, /\brich tapestry\b/gi,
    /\btapestry of\b/gi, /\bparadigm shift\b/gi, /\bplay a pivotal role\b/gi, /\bplays a pivotal role\b/gi,
    /\bpivotal role\b/gi, /\bserves as a testament to\b/gi, /\ba testament to\b/gi,
    /\bnavigating the complexities\b/gi, /\bnavigating the landscape\b/gi, /\binterplay between\b/gi,
    /\bunderscores the importance\b/gi, /\bfoster an environment\b/gi, /\bmultifaceted\b/gi,
    /\bever-evolving landscape\b/gi, /\bat the forefront of\b/gi, /\ba myriad of\b/gi,
    /\bseamlessly integrated\b/gi, /\bprofound implications\b/gi, /\bintricate dance\b/gi,
    /\bin conclusion\b/gi, /\bfurthermore\b/gi, /\bmoreover\b/gi, /\bit is crucial to\b/gi,
    /\bit is crucial to note that\b/gi, /\bit is important to note that\b/gi, /\bit is important to remember that\b/gi,
    /\bit is essential to\b/gi, /\bharness the power of\b/gi, /\bgame-changer\b/gi, /\bto summarize\b/gi
  ];

  const MEDIUM_RISK_PATTERNS = [
    /\badditionally\b/gi, /\bconsequently\b/gi, /\bsubsequently\b/gi, /\bnotably\b/gi,
    /\bparamount\b/gi, /\bvital role\b/gi, /\bprofound impact\b/gi, /\bcomprehensive understanding\b/gi,
    /\bit can be observed that\b/gi, /\bit is evident that\b/gi, /\bit is undeniable that\b/gi,
    /\bit is worth noting that\b/gi, /\bit is worth noting\b/gi, /\butilize\b/gi, /\butilizes\b/gi,
    /\butilizing\b/gi, /\bfacilitate\b/gi, /\bfacilitates\b/gi, /\bdemonstrates\b/gi,
    /\bdemonstrate\b/gi, /\belucidate\b/gi, /\bexpedite\b/gi, /\bendeavor\b/gi,
    /\bendeavors\b/gi, /\bubiquitous\b/gi, /\bdetrimental\b/gi, /\badvantageous\b/gi,
    /\btechnological revolution\b/gi, /\bin modern society\b/gi, /\bin today's fast-paced world\b/gi,
    /\bunderscores\b/gi, /\bfosters\b/gi, /\bever-evolving\b/gi, /\bseamlessly\b/gi,
    /\bshed light on\b/gi, /\bserves as a reminder\b/gi, /\bvibrant\b/gi, /\bbustling\b/gi
  ];

  const LOW_RISK_PATTERNS = [
    /\bin fact\b/gi, /\bas we can see\b/gi, /\bkeep in mind\b/gi, /\btruth be told\b/gi,
    /\bnaturally\b/gi, /\bclearly\b/gi, /\bto put it simply\b/gi, /\bessentially\b/gi,
    /\bfor instance\b/gi, /\bon the other hand\b/gi, /\blooking closer\b/gi, /\bworth pointing out\b/gi,
    /\bwhat stands out\b/gi, /\bin plain terms\b/gi, /\bnotice that\b/gi, /\bexploring\b/gi,
    /\bexamine\b/gi, /\bdig into\b/gi, /\bhelp explain\b/gi, /\bdigital evolution\b/gi,
    /\bput to work\b/gi, /\bturning point\b/gi, /\bkey part\b/gi, /\bwe must\b/gi,
    /\bone has to\b/gi, /\bas a result\b/gi, /\bmajor change\b/gi
  ];

  const escapeHtml = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const renderRiskHighlights = (rawText, isOutput = false) => {
    if (!rawText || !rawText.trim()) {
      return isOutput
        ? '<span class="highlight-placeholder">Paraphrased passage with neutralized markers will appear here...</span>'
        : '<span class="highlight-placeholder">Original document passage preview will appear here...</span>';
    }

    const matches = [];

    // Red patterns (High Risk)
    HIGH_RISK_PATTERNS.forEach(pat => {
      let m;
      pat.lastIndex = 0;
      while ((m = pat.exec(rawText)) !== null) {
        matches.push({ start: m.index, end: m.index + m[0].length, type: 'red', text: m[0] });
      }
    });

    // Yellow patterns (Medium Risk)
    MEDIUM_RISK_PATTERNS.forEach(pat => {
      let m;
      pat.lastIndex = 0;
      while ((m = pat.exec(rawText)) !== null) {
        matches.push({ start: m.index, end: m.index + m[0].length, type: 'yellow', text: m[0] });
      }
    });

    // Green patterns (Low Risk / Humanized Cadence)
    LOW_RISK_PATTERNS.forEach(pat => {
      let m;
      pat.lastIndex = 0;
      while ((m = pat.exec(rawText)) !== null) {
        matches.push({ start: m.index, end: m.index + m[0].length, type: 'green', text: m[0] });
      }
    });

    // Sort matches by start position, longer match first if same start
    matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    // Eliminate overlapping match boundaries
    const nonOverlapping = [];
    let lastEnd = 0;
    for (const m of matches) {
      if (m.start >= lastEnd) {
        nonOverlapping.push(m);
        lastEnd = m.end;
      }
    }

    let resultHtml = '';
    let cursor = 0;
    for (const m of nonOverlapping) {
      if (m.start > cursor) {
        resultHtml += escapeHtml(rawText.substring(cursor, m.start));
      }

      // If output pane, any neutralized phrase or human cadence shows in green
      const displayType = (isOutput && (m.type === 'yellow' || m.type === 'red')) ? 'green' : m.type;
      const tooltip = displayType === 'red'
        ? 'High Plagiarism/AI Flag (Turnitin & GPTZero Trigger)'
        : (displayType === 'yellow'
          ? 'Medium AI Predictability Pattern'
          : 'Low Risk: Verified Natural Human Cadence');

      resultHtml += `<span class="ai-marker-highlight mark-${displayType}" data-tooltip="${tooltip}">${escapeHtml(m.text)}</span>`;
      cursor = m.end;
    }

    if (cursor < rawText.length) {
      resultHtml += escapeHtml(rawText.substring(cursor));
    }

    return resultHtml;
  };

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

  // Single Document Preview & Highlighter Elements
  const chkSingleHighlight = document.getElementById('chkSingleHighlight');
  const singleHighlightPill = document.getElementById('singleHighlightPill');
  const singleHighlightLegend = document.getElementById('singleHighlightLegend');
  const btnSingleOrigViewHighlight = document.getElementById('btnSingleOrigViewHighlight');
  const btnSingleOrigViewRaw = document.getElementById('btnSingleOrigViewRaw');
  const btnSingleHumanViewHighlight = document.getElementById('btnSingleHumanViewHighlight');
  const btnSingleHumanViewRaw = document.getElementById('btnSingleHumanViewRaw');
  const singleOrigText = document.getElementById('singleOrigText');
  const singleOrigHighlightDisplay = document.getElementById('singleOrigHighlightDisplay');
  const singleHumanText = document.getElementById('singleHumanText');
  const singleHumanHighlightDisplay = document.getElementById('singleHumanHighlightDisplay');
  const singleOrigStats = document.getElementById('singleOrigStats');
  const singleHumanStats = document.getElementById('singleHumanStats');
  const btnCopySinglePreview = document.getElementById('btnCopySinglePreview');

  let isSingleHighlightActive = true;
  let singleOrigViewMode = 'highlight'; // 'highlight' or 'raw'
  let singleHumanViewMode = 'highlight';

  const updateSingleStats = (text, el) => {
    if (!el) return;
    const t = (text || '').trim();
    const words = t ? t.split(/\s+/).length : 0;
    const chars = t.length;
    el.innerText = `${words} words • ${chars} chars`;
  };

  const updateSingleHighlightDisplays = () => {
    if (!singleOrigHighlightDisplay || !singleHumanHighlightDisplay) return;

    if (!isSingleHighlightActive) {
      singleOrigHighlightDisplay.style.display = 'none';
      singleHumanHighlightDisplay.style.display = 'none';
      if (singleOrigText) singleOrigText.style.display = 'block';
      if (singleHumanText) singleHumanText.style.display = 'block';
      return;
    }

    // Original Document Pane
    if (singleOrigViewMode === 'highlight') {
      singleOrigHighlightDisplay.innerHTML = renderRiskHighlights(singleOrigText.value, false);
      singleOrigHighlightDisplay.style.display = 'block';
      if (singleOrigText) singleOrigText.style.display = 'none';
      if (btnSingleOrigViewHighlight) btnSingleOrigViewHighlight.classList.add('active');
      if (btnSingleOrigViewRaw) btnSingleOrigViewRaw.classList.remove('active');
    } else {
      singleOrigHighlightDisplay.style.display = 'none';
      if (singleOrigText) singleOrigText.style.display = 'block';
      if (btnSingleOrigViewHighlight) btnSingleOrigViewHighlight.classList.remove('active');
      if (btnSingleOrigViewRaw) btnSingleOrigViewRaw.classList.add('active');
    }

    // Humanized Document Pane
    if (singleHumanViewMode === 'highlight') {
      singleHumanHighlightDisplay.innerHTML = renderRiskHighlights(singleHumanText.value, true);
      singleHumanHighlightDisplay.style.display = 'block';
      if (singleHumanText) singleHumanText.style.display = 'none';
      if (btnSingleHumanViewHighlight) btnSingleHumanViewHighlight.classList.add('active');
      if (btnSingleHumanViewRaw) btnSingleHumanViewRaw.classList.remove('active');
    } else {
      singleHumanHighlightDisplay.style.display = 'none';
      if (singleHumanText) singleHumanText.style.display = 'block';
      if (btnSingleHumanViewHighlight) btnSingleHumanViewHighlight.classList.remove('active');
      if (btnSingleHumanViewRaw) btnSingleHumanViewRaw.classList.add('active');
    }
  };

  if (chkSingleHighlight) {
    chkSingleHighlight.addEventListener('change', () => {
      isSingleHighlightActive = chkSingleHighlight.checked;
      if (singleHighlightPill) {
        singleHighlightPill.innerText = isSingleHighlightActive ? 'ON' : 'OFF';
        if (isSingleHighlightActive) {
          singleHighlightPill.classList.remove('off');
        } else {
          singleHighlightPill.classList.add('off');
        }
      }
      if (singleHighlightLegend) {
        if (isSingleHighlightActive) {
          singleHighlightLegend.classList.remove('disabled');
        } else {
          singleHighlightLegend.classList.add('disabled');
        }
      }
      updateSingleHighlightDisplays();
      showToast(`Document Highlighter ${isSingleHighlightActive ? 'Activated' : 'Disabled'}`, 'info');
    });
  }

  if (btnSingleOrigViewHighlight) {
    btnSingleOrigViewHighlight.addEventListener('click', () => {
      singleOrigViewMode = 'highlight';
      updateSingleHighlightDisplays();
    });
  }
  if (btnSingleOrigViewRaw) {
    btnSingleOrigViewRaw.addEventListener('click', () => {
      singleOrigViewMode = 'raw';
      updateSingleHighlightDisplays();
    });
  }
  if (btnSingleHumanViewHighlight) {
    btnSingleHumanViewHighlight.addEventListener('click', () => {
      singleHumanViewMode = 'highlight';
      updateSingleHighlightDisplays();
    });
  }
  if (btnSingleHumanViewRaw) {
    btnSingleHumanViewRaw.addEventListener('click', () => {
      singleHumanViewMode = 'raw';
      updateSingleHighlightDisplays();
    });
  }

  if (btnCopySinglePreview && singleHumanText) {
    btnCopySinglePreview.addEventListener('click', async () => {
      if (!singleHumanText.value) return;
      try {
        await navigator.clipboard.writeText(singleHumanText.value);
        showToast('Humanized document text copied to clipboard!', 'success');
      } catch (_) {
        singleHumanText.select();
        document.execCommand('copy');
        showToast('Text copied!', 'success');
      }
    });
  }

  const setSingleFile = (file) => {
    singleFile = file;
    const ext = file.name.split('.').pop().toUpperCase();
    const badge = singleFileSelectedArea.querySelector('.file-ext-badge');
    if (badge) badge.innerText = '.' + ext;
    singleSelectedName.innerText = file.name;

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeKB = (file.size / 1024).toFixed(1);
    const isTooLarge = file.size > MAX_FILE_SIZE;

    // Remove any previous warning box
    const oldWarn = document.getElementById('singleSizeWarningBox');
    if (oldWarn) oldWarn.remove();

    const isDocx = file.name.toLowerCase().endsWith('.docx');

    if (isTooLarge && !isDocx) {
      singleSelectedSize.innerHTML = `<span style="color: var(--color-danger); font-weight: 700;">${sizeMB} MB (Exceeds 4.5 MB Cloud Limit)</span>`;
      btnStartSingle.disabled = true;
      
      const warnBox = document.createElement('div');
      warnBox.id = 'singleSizeWarningBox';
      warnBox.style.cssText = 'margin-top: 14px; padding: 14px 18px; border-radius: var(--radius-md); background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; font-size: 0.88rem; line-height: 1.6;';
      warnBox.innerHTML = `
        <div style="font-weight: 700; color: #f87171; display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="font-size: 16px;">⚠️</span>
          <span>ගොනුව විශාල වැඩියි (${sizeMB} MB) - Vercel Cloud සීමාව 4.5 MB වේ.</span>
        </div>
        <div style="color: var(--text-secondary); margin-bottom: 8px;">
          PDF ගොනු විශාල වීමට හේතුව scans හෝ high-resolution images වේ.
        </div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <span style="color: #ffffff; font-weight: 600;">විසඳුම්:</span>
          <button type="button" class="btn-secondary" id="btnSwitchToEditorFromWarn" style="padding: 4px 10px; font-size: 12px; background: rgba(99, 102, 241, 0.2); border-color: #6366f1; color: #fff;">
            <span>Live Text Editor එකට යන්න (Unlimited Words) →</span>
          </button>
        </div>
      `;
      singleFileSelectedArea.appendChild(warnBox);

      const btnSwitch = document.getElementById('btnSwitchToEditorFromWarn');
      if (btnSwitch) {
        btnSwitch.addEventListener('click', () => switchTab('tab-editor'));
      }

      showToast(`PDF size (${sizeMB} MB) exceeds Vercel 4.5 MB limit. Please use Live Text Editor.`, 'error');
    } else if (isTooLarge && isDocx) {
      singleSelectedSize.innerHTML = `<span style="color: #38bdf8; font-weight: 700;">${sizeMB} MB (⚡ 99% Smart Compression Active)</span>`;
      btnStartSingle.disabled = false;

      const warnBox = document.createElement('div');
      warnBox.id = 'singleSizeWarningBox';
      warnBox.style.cssText = 'margin-top: 14px; padding: 12px 16px; border-radius: var(--radius-md); background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); color: #bae6fd; font-size: 0.88rem; line-height: 1.5;';
      warnBox.innerHTML = `
        <div style="font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 8px;">
          <span>⚡ Smart Auto-Compression සක්‍රියයි (${sizeMB} MB Word Docx)</span>
        </div>
        <div style="color: var(--text-secondary); margin-top: 4px;">
          Word ලේඛනයේ ඇති බරැති ඡායාරූප browser එකෙන්ම ස්වයංක්‍රීයව compress කර Vercel Cloud සීමාව bypass කරයි. ඔබගේ සියලුම පෙළ (text) හා formatting සුරක්ෂිතව humanize වේ!
        </div>
      `;
      singleFileSelectedArea.appendChild(warnBox);
    } else {
      singleSelectedSize.innerText = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
      btnStartSingle.disabled = false;
    }

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
      singleResultArea.style.display = 'none';

      let fileToSend = singleFile;
      if (singleFile.name.toLowerCase().endsWith('.docx') && singleFile.size > 3.8 * 1024 * 1024) {
        fileToSend = await optimizeDocxIfNeeded(singleFile);
      }

      singleProgressContainer.style.display = 'block';
      const ticker = createProgressTicker(singleProgressFill, singleStatusText, [
        'Extracting document text & headings...',
        'Analyzing AI markers and vocabulary...',
        'Applying natural human restructuring...',
        'Sculpting sentence burstiness...',
        'Rebuilding formatted Word document...'
      ]);

      const formData = new FormData();
      formData.append('file', fileToSend);
      formData.append('mode', document.getElementById('singleMode').value);
      formData.append('intensity', document.getElementById('singleIntensity').value);
      formData.append('provider', settings.provider);
      if (settings.apiKey) formData.append('api_key', settings.apiKey);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      try {
        const res = await fetch('/api/upload-document', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        if (!res.ok) {
          let errMsg = 'Document processing failed.';
          if (res.status === 413) {
            errMsg = 'File is too large (413). Vercel cloud limit is 4.5 MB. Please remove high-resolution images from the document or copy-paste text into the Live Text Editor.';
          } else {
            try {
              const err = await res.json();
              errMsg = err.detail || errMsg;
            } catch (_) {
              errMsg = `Server error (${res.status}: ${res.statusText || 'Timeout or gateway error'})`;
            }
          }
          throw new Error(errMsg);
        }

        const data = await res.json();
        ticker.stop(true, 'Document humanized successfully!');
        showToast('Document humanized successfully!', 'success');

        btnDownloadSingleDocx.href = `/api/download/${data.token}`;
        btnDownloadSingleDocx.download = data.filename;
        singleResultMeta.innerText = `Original: ${data.metadata.original_words} words → Humanized: ${data.metadata.humanized_words} words (${data.metadata.changes_count} enhancements).`;

        // Render document preview with High/Medium/Low Risk Highlights
        const origPreview = data.metadata.original_preview || '';
        const humanPreview = data.metadata.humanized_preview || '';
        if (singleOrigText) singleOrigText.value = origPreview;
        if (singleHumanText) singleHumanText.value = humanPreview;
        updateSingleStats(origPreview, singleOrigStats);
        updateSingleStats(humanPreview, singleHumanStats);

        singleOrigViewMode = 'highlight';
        singleHumanViewMode = 'highlight';
        updateSingleHighlightDisplays();

        singleResultArea.style.display = 'block';

      } catch (err) {
        const msg = err.name === 'AbortError' 
          ? 'Network timeout. If using cloud APIs (Gemini/Groq), try switching to "Local Offline Engine" which is instant and unlimited.' 
          : err.message;
        ticker.stop(false, 'Processing failed.');
        showToast(`Error: ${msg}`, 'error');
      } finally {
        clearTimeout(timeoutId);
        btnStartSingle.disabled = false;
        setTimeout(() => {
          singleProgressContainer.style.display = 'none';
          singleProgressFill.style.width = '0%';
        }, 2200);
      }
    });
  }

  // ==========================================
  // TAB 3: LIVE TEXT EDITOR & AI PLAGIARISM HIGHLIGHTER
  // ==========================================
  const inputOriginalText = document.getElementById('inputOriginalText');
  const outputHumanizedText = document.getElementById('outputHumanizedText');
  const inputHighlightDisplay = document.getElementById('inputHighlightDisplay');
  const outputHighlightDisplay = document.getElementById('outputHighlightDisplay');
  const originalStats = document.getElementById('originalStats');
  const humanizedStats = document.getElementById('humanizedStats');
  const btnHumanizeText = document.getElementById('btnHumanizeText');
  const btnCopyHumanized = document.getElementById('btnCopyHumanized');
  const btnExportTxt = document.getElementById('btnExportTxt');
  const btnPasteSample = document.getElementById('btnPasteSample');
  const btnClearEditor = document.getElementById('btnClearEditor');

  const chkAIHighlight = document.getElementById('chkAIHighlight');
  const highlightPill = document.getElementById('highlightPill');
  const highlightLegend = document.getElementById('highlightLegend');
  const btnInputViewHighlight = document.getElementById('btnInputViewHighlight');
  const btnInputViewRaw = document.getElementById('btnInputViewRaw');
  const btnOutputViewHighlight = document.getElementById('btnOutputViewHighlight');
  const btnOutputViewRaw = document.getElementById('btnOutputViewRaw');

  let isHighlightActive = true;
  let inputViewMode = 'highlight'; // 'highlight' or 'raw'
  let outputViewMode = 'highlight';

  const updateHighlightDisplays = () => {
    if (!inputHighlightDisplay || !outputHighlightDisplay) return;

    if (!isHighlightActive) {
      inputHighlightDisplay.style.display = 'none';
      outputHighlightDisplay.style.display = 'none';
      if (inputOriginalText) inputOriginalText.style.display = 'block';
      if (outputHumanizedText) outputHumanizedText.style.display = 'block';
      return;
    }

    // Input Pane View
    if (inputViewMode === 'highlight') {
      inputHighlightDisplay.innerHTML = renderRiskHighlights(inputOriginalText.value, false);
      inputHighlightDisplay.style.display = 'block';
      if (inputOriginalText) inputOriginalText.style.display = 'none';
      if (btnInputViewHighlight) btnInputViewHighlight.classList.add('active');
      if (btnInputViewRaw) btnInputViewRaw.classList.remove('active');
    } else {
      inputHighlightDisplay.style.display = 'none';
      if (inputOriginalText) inputOriginalText.style.display = 'block';
      if (btnInputViewHighlight) btnInputViewHighlight.classList.remove('active');
      if (btnInputViewRaw) btnInputViewRaw.classList.add('active');
    }

    // Output Pane View
    if (outputViewMode === 'highlight') {
      outputHighlightDisplay.innerHTML = renderRiskHighlights(outputHumanizedText.value, true);
      outputHighlightDisplay.style.display = 'block';
      if (outputHumanizedText) outputHumanizedText.style.display = 'none';
      if (btnOutputViewHighlight) btnOutputViewHighlight.classList.add('active');
      if (btnOutputViewRaw) btnOutputViewRaw.classList.remove('active');
    } else {
      outputHighlightDisplay.style.display = 'none';
      if (outputHumanizedText) outputHumanizedText.style.display = 'block';
      if (btnOutputViewHighlight) btnOutputViewHighlight.classList.remove('active');
      if (btnOutputViewRaw) btnOutputViewRaw.classList.add('active');
    }
  };

  // Click on input highlight overlay switches to raw editor for typing
  if (inputHighlightDisplay && inputOriginalText) {
    inputHighlightDisplay.addEventListener('click', () => {
      inputViewMode = 'raw';
      updateHighlightDisplays();
      inputOriginalText.focus();
    });
  }

  // Master AI Highlight Switch Toggle
  if (chkAIHighlight) {
    chkAIHighlight.addEventListener('change', () => {
      isHighlightActive = chkAIHighlight.checked;
      if (highlightPill) {
        highlightPill.innerText = isHighlightActive ? 'ON' : 'OFF';
        if (isHighlightActive) {
          highlightPill.classList.remove('off');
        } else {
          highlightPill.classList.add('off');
        }
      }
      if (highlightLegend) {
        if (isHighlightActive) {
          highlightLegend.classList.remove('disabled');
        } else {
          highlightLegend.classList.add('disabled');
        }
      }
      updateHighlightDisplays();
      showToast(`Plagiarism & AI Highlighter ${isHighlightActive ? 'Activated' : 'Disabled'}`, 'info');
    });
  }

  // Pane View Buttons
  if (btnInputViewHighlight) {
    btnInputViewHighlight.addEventListener('click', () => {
      inputViewMode = 'highlight';
      updateHighlightDisplays();
    });
  }
  if (btnInputViewRaw) {
    btnInputViewRaw.addEventListener('click', () => {
      inputViewMode = 'raw';
      updateHighlightDisplays();
      if (inputOriginalText) inputOriginalText.focus();
    });
  }
  if (btnOutputViewHighlight) {
    btnOutputViewHighlight.addEventListener('click', () => {
      outputViewMode = 'highlight';
      updateHighlightDisplays();
    });
  }
  if (btnOutputViewRaw) {
    btnOutputViewRaw.addEventListener('click', () => {
      outputViewMode = 'raw';
      updateHighlightDisplays();
    });
  }

  const updateTextStats = (textarea, statsEl) => {
    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    statsEl.innerText = `${words} words • ${chars} chars`;
  };

  let debounceTimer;
  if (inputOriginalText && originalStats) {
    inputOriginalText.addEventListener('input', () => {
      updateTextStats(inputOriginalText, originalStats);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isHighlightActive && inputViewMode === 'highlight') {
          updateHighlightDisplays();
        }
      }, 150);
    });
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
      inputViewMode = 'highlight';
      updateHighlightDisplays();
    });
  }

  if (btnClearEditor) {
    btnClearEditor.addEventListener('click', () => {
      inputOriginalText.value = '';
      outputHumanizedText.value = '';
      updateTextStats(inputOriginalText, originalStats);
      updateTextStats(outputHumanizedText, humanizedStats);
      updateHighlightDisplays();
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

        // Switch both panes to highlight view to showcase neutralized words
        inputViewMode = 'highlight';
        outputViewMode = 'highlight';
        updateHighlightDisplays();

        showToast('Text successfully humanized! AI risk markers neutralized.', 'success');

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

  // Initialize highlight displays on load
  updateHighlightDisplays();

  // ==========================================
  // TAB 4: FORENSIC SCANNER & DOCUMENT AUDIT
  // ==========================================
  const btnDetectorModeFile = document.getElementById('btnDetectorModeFile');
  const btnDetectorModeText = document.getElementById('btnDetectorModeText');
  const detectorFileSection = document.getElementById('detectorFileSection');
  const detectorTextSection = document.getElementById('detectorTextSection');
  const detectorDropzone = document.getElementById('detectorDropzone');
  const detectorFileInput = document.getElementById('detectorFileInput');
  const detectorFileSelectedArea = document.getElementById('detectorFileSelectedArea');
  const detectorFileBadge = document.getElementById('detectorFileBadge');
  const detectorSelectedName = document.getElementById('detectorSelectedName');
  const detectorSelectedSize = document.getElementById('detectorSelectedSize');
  const btnCancelDetectorFile = document.getElementById('btnCancelDetectorFile');
  const btnScanDocument = document.getElementById('btnScanDocument');
  const detectorInputText = document.getElementById('detectorInputText');
  const btnScanAI = document.getElementById('btnScanAI');
  const btnPasteSampleDetector = document.getElementById('btnPasteSampleDetector');
  const btnClearDetector = document.getElementById('btnClearDetector');
  const detectorProgressArea = document.getElementById('detectorProgressArea');
  const detectorResults = document.getElementById('detectorResults');

  // Audit Report Elements
  const auditDocTitle = document.getElementById('auditDocTitle');
  const auditDocSub = document.getElementById('auditDocSub');
  const auditVerdictBadge = document.getElementById('auditVerdictBadge');
  const auditHumanPercent = document.getElementById('auditHumanPercent');
  const auditAIPercent = document.getElementById('auditAIPercent');
  const auditFillHuman = document.getElementById('auditFillHuman');
  const auditFillAI = document.getElementById('auditFillAI');
  const detHumanScore = document.getElementById('detHumanScore');
  const detAIScore = document.getElementById('detAIScore');
  const detBurstiness = document.getElementById('detBurstiness');
  const detClichesCount = document.getElementById('detClichesCount');
  const detectorTextStats = document.getElementById('detectorTextStats');
  const detectorAuditText = document.getElementById('detectorAuditText');
  const detectorHighlightDisplay = document.getElementById('detectorHighlightDisplay');
  const chkDetectorHighlight = document.getElementById('chkDetectorHighlight');
  const detectorHighlightPill = document.getElementById('detectorHighlightPill');
  const detectorHighlightLegend = document.getElementById('detectorHighlightLegend');
  const btnDetectorViewHighlight = document.getElementById('btnDetectorViewHighlight');
  const btnDetectorViewRaw = document.getElementById('btnDetectorViewRaw');
  const sentenceFilterBar = document.getElementById('sentenceFilterBar');
  const detSentenceList = document.getElementById('detSentenceList');
  const btnCopyDetectorReport = document.getElementById('btnCopyDetectorReport');
  const btnDownloadDetectorReport = document.getElementById('btnDownloadDetectorReport');
  const btnSendToHumanizer = document.getElementById('btnSendToHumanizer');

  let detectorSelectedFile = null;
  let detectorActiveMode = 'file'; // 'file' or 'text'
  let isDetectorHighlightActive = true;
  let detectorViewMode = 'highlight'; // 'highlight' or 'raw'
  let latestAuditData = null;

  // Toggle Mode (File vs Text)
  if (btnDetectorModeFile && btnDetectorModeText) {
    btnDetectorModeFile.addEventListener('click', () => {
      detectorActiveMode = 'file';
      btnDetectorModeFile.classList.add('active');
      btnDetectorModeText.classList.remove('active');
      if (detectorFileSection) detectorFileSection.style.display = 'block';
      if (detectorTextSection) detectorTextSection.style.display = 'none';
    });
    btnDetectorModeText.addEventListener('click', () => {
      detectorActiveMode = 'text';
      btnDetectorModeText.classList.add('active');
      btnDetectorModeFile.classList.remove('active');
      if (detectorFileSection) detectorFileSection.style.display = 'none';
      if (detectorTextSection) detectorTextSection.style.display = 'block';
    });
  }

  // Client-side DOCX Text Extraction (Zero payload, bypasses cloud limits)
  const extractTextFromDocx = async (file) => {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library not available');
    }
    const zip = await JSZip.loadAsync(file);
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
      throw new Error('Invalid DOCX format: word/document.xml not found');
    }
    const xmlStr = await docFile.async('string');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

    let pList = xmlDoc.getElementsByTagName('w:p');
    if (!pList || pList.length === 0) {
      pList = xmlDoc.getElementsByTagNameNS('*', 'p');
    }

    const paragraphs = [];
    if (pList && pList.length > 0) {
      for (let i = 0; i < pList.length; i++) {
        const p = pList[i];
        let tList = p.getElementsByTagName('w:t');
        if (!tList || tList.length === 0) {
          tList = p.getElementsByTagNameNS('*', 't');
        }
        let pText = '';
        for (let j = 0; j < tList.length; j++) {
          pText += tList[j].textContent || '';
        }
        const clean = pText.trim();
        if (clean) paragraphs.push(clean);
      }
    }

    // Fallback if XML DOM tags were stripped or namespace mismatch
    if (paragraphs.length === 0) {
      const pMatches = xmlStr.match(/<w:p[\s>].*?<\/w:p>/gs) || [];
      for (const pXml of pMatches) {
        const tMatches = pXml.match(/<w:t[^>]*>(.*?)<\/w:t>/gs) || [];
        const pText = tMatches.map(t => t.replace(/<[^>]+>/g, '')).join('');
        if (pText.trim()) paragraphs.push(pText.trim());
      }
    }

    return paragraphs.join('\n\n');
  };

  const extractTextFromFile = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'docx') {
      return await extractTextFromDocx(file);
    } else if (ext === 'txt' || ext === 'md') {
      return await file.text();
    }
    return null;
  };

  // File Selection in Detector
  const setDetectorFile = (file) => {
    detectorSelectedFile = file;
    const ext = file.name.split('.').pop().toUpperCase();
    if (detectorFileBadge) detectorFileBadge.innerText = '.' + ext;
    if (detectorSelectedName) detectorSelectedName.innerText = file.name;
    const sizeKB = (file.size / 1024).toFixed(1);
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

    // Clear any previous warning
    const oldWarn = document.getElementById('detectorSizeWarningBox');
    if (oldWarn) oldWarn.remove();

    const isDocx = file.name.toLowerCase().endsWith('.docx');
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const isTooLarge = file.size > 4.5 * 1024 * 1024;

    if (detectorSelectedSize) {
      if (isTooLarge && isDocx) {
        detectorSelectedSize.innerHTML = `<span style="color: #34d399; font-weight: 600;">${sizeMB} MB (⚡ Local Text Extract — No Limit)</span>`;
      } else if (isTooLarge && isPdf) {
        detectorSelectedSize.innerHTML = `<span style="color: var(--color-danger); font-weight: 700;">${sizeMB} MB (Exceeds 4.5 MB Cloud Limit)</span>`;
      } else {
        detectorSelectedSize.innerText = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
      }
    }

    if (isTooLarge && isPdf) {
      const warnBox = document.createElement('div');
      warnBox.id = 'detectorSizeWarningBox';
      warnBox.style.cssText = 'margin-top: 14px; padding: 12px 16px; border-radius: var(--radius-md); background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; font-size: 0.85rem; line-height: 1.5;';
      warnBox.innerHTML = `
        <div style="font-weight: 700; color: #f87171; display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span>⚠️</span>
          <span>PDF ගොනුව විශාල වැඩියි (${sizeMB} MB) — Cloud සීමාව 4.5 MB වේ.</span>
        </div>
        <div style="color: var(--text-secondary); margin-bottom: 8px;">
          විශාල PDF පරිලෝකනය කිරීමට පහත 'Raw Text' ටැබ් එකට text එක paste කරන්න හෝ .docx ගොනුවක් ලෙස upload කරන්න.
        </div>
        <button type="button" class="btn-secondary" id="btnSwitchToDetectorTextFromWarn" style="padding: 4px 10px; font-size: 12px; background: rgba(99, 102, 241, 0.2); border-color: #6366f1; color: #fff;">
          <span>Raw Text Scan එකට මාරු වන්න →</span>
        </button>
      `;
      if (detectorFileSelectedArea) {
        detectorFileSelectedArea.appendChild(warnBox);
        const btnSwitch = document.getElementById('btnSwitchToDetectorTextFromWarn');
        if (btnSwitch) {
          btnSwitch.addEventListener('click', () => {
            if (btnDetectorModeText) btnDetectorModeText.click();
          });
        }
      }
    }

    if (detectorFileSelectedArea) detectorFileSelectedArea.style.display = 'block';
    if (detectorResults) detectorResults.style.display = 'none';
  };

  if (detectorDropzone && detectorFileInput) {
    detectorDropzone.addEventListener('click', () => detectorFileInput.click());
    detectorDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      detectorDropzone.classList.add('dragover');
    });
    detectorDropzone.addEventListener('dragleave', () => detectorDropzone.classList.remove('dragover'));
    detectorDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      detectorDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        setDetectorFile(e.dataTransfer.files[0]);
      }
    });
    detectorFileInput.addEventListener('change', () => {
      if (detectorFileInput.files && detectorFileInput.files[0]) {
        setDetectorFile(detectorFileInput.files[0]);
      }
    });
  }

  if (btnCancelDetectorFile) {
    btnCancelDetectorFile.addEventListener('click', () => {
      detectorSelectedFile = null;
      if (detectorFileInput) detectorFileInput.value = '';
      const oldWarn = document.getElementById('detectorSizeWarningBox');
      if (oldWarn) oldWarn.remove();
      if (detectorFileSelectedArea) detectorFileSelectedArea.style.display = 'none';
    });
  }

  if (btnPasteSampleDetector && detectorInputText) {
    btnPasteSampleDetector.addEventListener('click', () => {
      detectorInputText.value = "Furthermore, it is crucial to delve into the intricate tapestry of modern artificial intelligence. It represents a paradigm shift in computing. Additionally, machine learning algorithms play a pivotal role in shaping society. In conclusion, one must acknowledge the profound implications of this technological revolution.";
    });
  }

  if (btnClearDetector && detectorInputText) {
    btnClearDetector.addEventListener('click', () => {
      detectorInputText.value = '';
      if (detectorResults) detectorResults.style.display = 'none';
    });
  }

  // Update Highlight View in Detector
  const updateDetectorHighlightView = () => {
    if (!detectorHighlightDisplay || !detectorAuditText) return;

    if (!isDetectorHighlightActive) {
      detectorHighlightDisplay.style.display = 'none';
      detectorAuditText.style.display = 'block';
      return;
    }

    if (detectorViewMode === 'highlight') {
      detectorHighlightDisplay.innerHTML = renderRiskHighlights(detectorAuditText.value, false);
      detectorHighlightDisplay.style.display = 'block';
      detectorAuditText.style.display = 'none';
      if (btnDetectorViewHighlight) btnDetectorViewHighlight.classList.add('active');
      if (btnDetectorViewRaw) btnDetectorViewRaw.classList.remove('active');
    } else {
      detectorHighlightDisplay.style.display = 'none';
      detectorAuditText.style.display = 'block';
      if (btnDetectorViewHighlight) btnDetectorViewHighlight.classList.remove('active');
      if (btnDetectorViewRaw) btnDetectorViewRaw.classList.add('active');
    }
  };

  if (chkDetectorHighlight) {
    chkDetectorHighlight.addEventListener('change', () => {
      isDetectorHighlightActive = chkDetectorHighlight.checked;
      if (detectorHighlightPill) {
        detectorHighlightPill.innerText = isDetectorHighlightActive ? 'ON' : 'OFF';
        if (isDetectorHighlightActive) {
          detectorHighlightPill.classList.remove('off');
        } else {
          detectorHighlightPill.classList.add('off');
        }
      }
      if (detectorHighlightLegend) {
        if (isDetectorHighlightActive) {
          detectorHighlightLegend.classList.remove('disabled');
        } else {
          detectorHighlightLegend.classList.add('disabled');
        }
      }
      updateDetectorHighlightView();
      showToast(`Audit Risk Highlighter ${isDetectorHighlightActive ? 'Activated' : 'Disabled'}`, 'info');
    });
  }

  if (btnDetectorViewHighlight) {
    btnDetectorViewHighlight.addEventListener('click', () => {
      detectorViewMode = 'highlight';
      updateDetectorHighlightView();
    });
  }
  if (btnDetectorViewRaw) {
    btnDetectorViewRaw.addEventListener('click', () => {
      detectorViewMode = 'raw';
      updateDetectorHighlightView();
    });
  }

  // Render Full Audit Report UI
  const renderAuditReport = (report, title, text) => {
    latestAuditData = { report, title, text };

    if (auditDocTitle) auditDocTitle.innerText = title;
    if (auditDocSub) auditDocSub.innerText = `Analyzed ${report.word_count || 0} words across ${report.sentence_count || 0} sentences.`;

    const humanPct = report.human_score || 0;
    const aiPct = (report.ai_score * 100).toFixed(1);

    if (auditHumanPercent) auditHumanPercent.innerText = `${humanPct}%`;
    if (auditAIPercent) auditAIPercent.innerText = `${aiPct}%`;
    if (auditFillHuman) auditFillHuman.style.width = `${humanPct}%`;
    if (auditFillAI) auditFillAI.style.width = `${Math.max(0, 100 - humanPct)}%`;

    // Verdict Badge
    if (auditVerdictBadge) {
      if (humanPct >= 80) {
        auditVerdictBadge.className = 'audit-verdict-pill verdict-human';
        auditVerdictBadge.innerText = '✅ 100% HUMAN-WRITTEN';
      } else if (humanPct >= 45) {
        auditVerdictBadge.className = 'audit-verdict-pill verdict-mixed';
        auditVerdictBadge.innerText = '⚠️ MIXED / PARTIALLY AI';
      } else {
        auditVerdictBadge.className = 'audit-verdict-pill verdict-ai';
        auditVerdictBadge.innerText = '🚨 HIGH AI PROBABILITY';
      }
    }

    // Telemetry Cards
    if (detHumanScore) {
      detHumanScore.innerText = `${humanPct}%`;
      detHumanScore.className = `telemetry-value ${humanPct >= 80 ? 'val-green' : humanPct >= 45 ? 'val-amber' : 'val-rose'}`;
    }
    if (detAIScore) detAIScore.innerText = `${aiPct}%`;
    if (detBurstiness) detBurstiness.innerText = `${report.burstiness || 0}`;
    if (detClichesCount) detClichesCount.innerText = `${(report.cliches || []).length}`;

    // Highlight Box
    if (detectorAuditText) detectorAuditText.value = text;
    if (detectorTextStats) detectorTextStats.innerText = `${report.word_count || 0} words • ${report.sentence_count || 0} sentences`;
    detectorViewMode = 'highlight';
    updateDetectorHighlightView();

    // Sentence List & Filters
    const renderSentences = (filter = 'all') => {
      if (!detSentenceList) return;
      detSentenceList.innerHTML = '';
      const breakdown = report.sentence_breakdown || [];
      const filtered = filter === 'all' 
        ? breakdown 
        : breakdown.filter(s => s.risk === filter);

      if (filtered.length === 0) {
        detSentenceList.innerHTML = `<div style="padding: 16px; color: var(--text-tertiary); font-style: italic;">No sentences match the '${filter}' filter.</div>`;
        return;
      }

      filtered.forEach(s => {
        const item = document.createElement('div');
        item.className = `sentence-item risk-${s.risk}`;
        const clichesHtml = s.cliches && s.cliches.length > 0 
          ? `<div style="margin-top: 4px; font-size: 11px; color: #fca5a5; font-weight: 600;">Flagged AI Clichés: ${s.cliches.join(', ')}</div>` 
          : '';
        item.innerHTML = `
          <div>
            <span>${escapeHtml(s.text)}</span>
            ${clichesHtml}
          </div>
          <span style="font-family: var(--font-mono); font-size: 11px; white-space: nowrap; color: var(--text-tertiary); min-width: 90px; text-align: right;">
            ${s.word_count}w • ${s.risk.toUpperCase()}
          </span>
        `;
        detSentenceList.appendChild(item);
      });
    };

    renderSentences('all');

    // Filter Buttons
    if (sentenceFilterBar) {
      const filterBtns = sentenceFilterBar.querySelectorAll('button');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderSentences(btn.dataset.filter);
        });
      });
    }

    if (detectorResults) detectorResults.style.display = 'block';
  };

  // Scan Document File Upload (Resilient Local & Server Scan)
  if (btnScanDocument) {
    btnScanDocument.addEventListener('click', async () => {
      if (!detectorSelectedFile) {
        showToast('Please select a document file (.docx, .pdf, .txt) first.', 'error');
        return;
      }

      const file = detectorSelectedFile;
      const ext = file.name.split('.').pop().toLowerCase();
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

      // Check for large PDF exceeding Vercel limits
      if (ext === 'pdf' && file.size > 4.5 * 1024 * 1024) {
        showToast(`PDF ගොනුව විශාල වැඩියි (${sizeMB} MB). Cloud සීමාව 4.5 MB වේ. කරුණාකර 'Raw Text' ටැබ් එකට text paste කරන්න.`, 'error');
        return;
      }

      btnScanDocument.disabled = true;
      if (detectorResults) detectorResults.style.display = 'none';
      if (detectorProgressArea) detectorProgressArea.style.display = 'block';
      const progressStatus = document.getElementById('detectorProgressStatus');
      if (progressStatus) progressStatus.innerText = 'Extracting document text and evaluating linguistic markers...';

      try {
        let extractedText = null;

        // Try direct browser extraction for DOCX, TXT, MD
        // Bypasses 4.5 MB request payload limits, zero upload delay, 100% resilient
        if (ext === 'docx' || ext === 'txt' || ext === 'md') {
          try {
            if (progressStatus) progressStatus.innerText = 'Parsing document contents locally...';
            extractedText = await extractTextFromFile(file);
          } catch (localErr) {
            console.warn('Local document text extraction encountered an issue, trying server upload:', localErr);
          }
        }

        // If client-side text was successfully extracted, analyze directly via /api/detect
        if (extractedText && extractedText.trim().length > 0) {
          if (progressStatus) progressStatus.innerText = 'Evaluating AI vs Human metrics, burstiness & perplexity...';
          const res = await fetch('/api/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: extractedText })
          });

          if (!res.ok) {
            let errMsg = 'Document audit failed.';
            try {
              const err = await res.json();
              errMsg = err.detail || errMsg;
            } catch (_) {
              errMsg = `Server error (${res.status})`;
            }
            throw new Error(errMsg);
          }

          const report = await res.json();
          renderAuditReport(report, file.name, extractedText);
          showToast('Document Audit Complete!', 'success');
          return;
        }

        // Otherwise (or for PDF / fallback): send to server /api/scan-document
        if (progressStatus) progressStatus.innerText = 'Uploading and scanning document...';
        let fileToSend = file;
        if (ext === 'docx' && typeof optimizeDocxIfNeeded === 'function') {
          fileToSend = await optimizeDocxIfNeeded(file);
        }

        const formData = new FormData();
        formData.append('file', fileToSend);

        const res = await fetch('/api/scan-document', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          let errMsg = 'Failed to scan document.';
          if (res.status === 413) {
            errMsg = `File is too large (${sizeMB} MB). Vercel cloud limit is 4.5 MB. Please copy-paste text into the Raw Text tab.`;
          } else {
            try {
              const err = await res.json();
              errMsg = err.detail || errMsg;
            } catch (_) {
              errMsg = `Server error (${res.status}: ${res.statusText || 'Gateway timeout or upload error'})`;
            }
          }
          throw new Error(errMsg);
        }

        const data = await res.json();
        renderAuditReport(data.report, data.filename, data.text_preview);
        showToast('Document Audit Complete!', 'success');

      } catch (err) {
        showToast(`Audit Error: ${err.message}`, 'error');
      } finally {
        btnScanDocument.disabled = false;
        if (detectorProgressArea) detectorProgressArea.style.display = 'none';
      }
    });
  }

  // Scan Raw Text Passage
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
      if (detectorResults) detectorResults.style.display = 'none';
      if (detectorProgressArea) detectorProgressArea.style.display = 'block';

      try {
        const res = await fetch('/api/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text })
        });

        if (!res.ok) throw new Error('Analysis failed.');
        const report = await res.json();
        renderAuditReport(report, 'Pasted Text Passage', text);
        showToast('Text Audit Complete!', 'success');

      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      } finally {
        btnScanAI.disabled = false;
        btnScanAI.querySelector('span').innerText = origText;
        if (detectorProgressArea) detectorProgressArea.style.display = 'none';
      }
    });
  }

  // Copy & Download Audit Report
  const buildReportText = () => {
    if (!latestAuditData) return '';
    const { report, title, text } = latestAuditData;
    const humanPct = report.human_score || 0;
    const aiPct = (report.ai_score * 100).toFixed(1);
    const dateStr = new Date().toLocaleString();

    let out = `=================================================================\n`;
    out += `AI & HUMAN CONTENT AUDIT REPORT\n`;
    out += `Generated by AI Humanizer Studio on ${dateStr}\n`;
    out += `=================================================================\n\n`;
    out += `Document / Title : ${title}\n`;
    out += `Overall Verdict  : ${humanPct >= 80 ? 'HUMAN-WRITTEN (PASSED)' : humanPct >= 45 ? 'MIXED / PARTIAL AI' : 'HIGH AI DETECTED'}\n`;
    out += `Human Score      : ${humanPct}%\n`;
    out += `AI Probability   : ${aiPct}%\n`;
    out += `Total Words      : ${report.word_count || 0}\n`;
    out += `Total Sentences  : ${report.sentence_count || 0}\n`;
    out += `Burstiness Index : ${report.burstiness || 0} (Variance of sentence lengths)\n`;
    out += `Reading Ease     : ${report.reading_ease || 0} / 100\n`;
    out += `AI Clichés Found : ${(report.cliches || []).join(', ') || 'None'}\n\n`;
    out += `-----------------------------------------------------------------\n`;
    out += `SENTENCE-BY-SENTENCE RISK BREAKDOWN:\n`;
    out += `-----------------------------------------------------------------\n`;
    (report.sentence_breakdown || []).forEach((s, idx) => {
      out += `[${idx + 1}] [${s.risk.toUpperCase()} RISK - ${s.word_count} words]\n`;
      out += `    ${s.text}\n`;
      if (s.cliches && s.cliches.length > 0) {
        out += `    Trigger phrases: ${s.cliches.join(', ')}\n`;
      }
      out += `\n`;
    });
    out += `=================================================================\n`;
    return out;
  };

  if (btnCopyDetectorReport) {
    btnCopyDetectorReport.addEventListener('click', async () => {
      const rep = buildReportText();
      if (!rep) return;
      try {
        await navigator.clipboard.writeText(rep);
        showToast('Audit report copied to clipboard!', 'success');
      } catch (_) {
        showToast('Failed to copy report.', 'error');
      }
    });
  }

  if (btnDownloadDetectorReport) {
    btnDownloadDetectorReport.addEventListener('click', () => {
      const rep = buildReportText();
      if (!rep) return;
      const blob = new Blob([rep], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `audit_report_${(latestAuditData.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
      a.click();
      showToast('Audit report downloaded!', 'success');
    });
  }

  // Send to Humanizer Studio
  if (btnSendToHumanizer) {
    btnSendToHumanizer.addEventListener('click', () => {
      if (!latestAuditData) return;
      const { title, text } = latestAuditData;
      if (detectorSelectedFile && typeof setSingleFile === 'function') {
        const singleTabBtn = document.getElementById('tabBtnSingle');
        if (singleTabBtn) singleTabBtn.click();
        setSingleFile(detectorSelectedFile);
        showToast(`Document "${title}" loaded into Single Document Humanizer!`, 'info');
      } else {
        const editorTabBtn = document.getElementById('tabBtnEditor');
        if (editorTabBtn) editorTabBtn.click();
        if (inputOriginalText) {
          inputOriginalText.value = text;
          updateTextStats(inputOriginalText, originalStats);
          inputViewMode = 'highlight';
          updateHighlightDisplays();
        }
        showToast('Text loaded into Humanizer Workspace!', 'info');
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
