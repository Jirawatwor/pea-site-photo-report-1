const STORAGE_KEY = 'pea_site_photo_report_v1';

// ข้อมูลเริ่มต้น (เว้นว่างช่อง Site ให้กรอกเอง)
function getDefaultData() {
  return {
    logoDataUrl: null,
    pages: [
      {
        id: crypto.randomUUID(),
        reportTitle: 'รายงานภาพถ่ายผลการปฏิบัติงานบำรุงรักษาระบบไฟฟ้า',
        siteName: '',
        sectionTitle: 'Main Distribution Board : MDB',
        footerLeft: 'การไฟฟ้าส่วนภูมิภาค (Provincial Electricity Authority)',
        cards: [
          {
            id: crypto.randomUUID(),
            image: null,
            fitMode: 'cover',
            caption: 'ตรวจวัดแรงดันก่อนปฏิบัติงาน'
          },
          {
            id: crypto.randomUUID(),
            image: null,
            fitMode: 'cover',
            caption: 'ตรวจวัด Phase Rotation ก่อนปฏิบัติงาน'
          },
          {
            id: crypto.randomUUID(),
            image: null,
            fitMode: 'cover',
            caption: 'ดำเนินการลดโหลดภายใน'
          },
          {
            id: crypto.randomUUID(),
            image: null,
            fitMode: 'cover',
            caption: 'ทดสอบ Function ON-OFF'
          }
        ]
      }
    ]
  };
}

let reportState = loadState();
let activeWebcamTarget = null;
let webcamStream = null;

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Load state error:', err);
  }
  return getDefaultData();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reportState));
    const statusEl = document.getElementById('saveStatus');
    if (statusEl) {
      const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      statusEl.textContent = `บันทึกอัตโนมัติแล้ว (${now})`;
    }
  } catch (err) {
    console.warn('Storage quota warning:', err);
    const statusEl = document.getElementById('saveStatus');
    if (statusEl) {
      statusEl.textContent = '⚠️ รูปมีขนาดใหญ่ แนะนำ Export JSON สำรองไว้';
    }
  }
}

function processImageFile(file, maxWidth = 1400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderLogoHtml() {
  if (reportState.logoDataUrl) {
    return `<img src="${reportState.logoDataUrl}" alt="Company Logo" class="logo-preview" title="คลิกเพื่อเปลี่ยนโลโก้" />`;
  }
  return `
    <div class="default-pea-logo" title="คลิกเพื่ออัปโหลดโลโก้ใหม่">
      <div class="pea-emblem">⚡</div>
      <div class="pea-brand-text">
        <div class="pea-abbr">PEA</div>
        <div class="pea-full">PROVINCIAL ELECTRICITY AUTHORITY</div>
      </div>
    </div>
  `;
}

function renderReport() {
  const container = document.getElementById('pagesContainer');
  container.innerHTML = '';

  reportState.pages.forEach((page, pageIndex) => {
    const pageEl = document.createElement('section');
    pageEl.className = 'a4-page';

    const totalCards = page.cards.length;
    const lastRowStartIndex = totalCards % 2 === 0 ? totalCards - 2 : totalCards - 1;

    const cardsHtml = page.cards
      .map((card, cardIndex) => {
        const isLastRow = cardIndex >= lastRowStartIndex;
        const fitClass = card.fitMode === 'contain' ? 'fit-contain' : '';

        return `
          <div class="photo-card ${isLastRow ? 'last-row' : ''}">
            <div class="photo-slot ${card.image ? 'has-image' : ''}" data-page="${pageIndex}" data-card="${cardIndex}">
              <input type="file" accept="image/*" class="input-gallery" data-page="${pageIndex}" data-card="${cardIndex}" hidden />
              <input type="file" accept="image/*" capture="environment" class="input-camera" data-page="${pageIndex}" data-card="${cardIndex}" hidden />

              ${
                card.image
                  ? `
                    <img src="${card.image}" alt="${escapeHtml(card.caption)}" class="${fitClass}" />
                    <div class="image-overlay-tools no-print">
                      <button type="button" class="btn-overlay btn-pick-gallery" data-page="${pageIndex}" data-card="${cardIndex}">📁 เปลี่ยนรูป</button>
                      <button type="button" class="btn-overlay btn-pick-camera" data-page="${pageIndex}" data-card="${cardIndex}">📷 ถ่ายใหม่</button>
                      <button type="button" class="btn-overlay btn-toggle-fit" data-page="${pageIndex}" data-card="${cardIndex}">
                        ${card.fitMode === 'contain' ? '↔ เต็มกรอบ' : '🖼 พอดีรูป'}
                      </button>
                      <button type="button" class="btn-overlay danger btn-remove-img" data-page="${pageIndex}" data-card="${cardIndex}">✕</button>
                    </div>
                  `
                  : `
                    <div class="slot-placeholder no-print">
                      <div class="slot-icon">📷</div>
                      <p>คลิกเพื่อใส่รูปภาพหน้างาน</p>
                      <div class="slot-action-buttons">
                        <button type="button" class="btn-slot btn-pick-gallery" data-page="${pageIndex}" data-card="${cardIndex}">📁 เลือกรูปภาพ</button>
                        <button type="button" class="btn-slot btn-pick-camera" data-page="${pageIndex}" data-card="${cardIndex}">📱 กล้องมือถือ</button>
                        <button type="button" class="btn-slot btn-open-webcam" data-page="${pageIndex}" data-card="${cardIndex}">💻 เว็บแคม</button>
                      </div>
                    </div>
                  `
              }
            </div>

            <div class="photo-caption-bar">
              <div contenteditable="true" data-field="caption" data-page="${pageIndex}" data-card="${cardIndex}" data-placeholder="ระบุคำบรรยายภาพ">${escapeHtml(card.caption)}</div>
            </div>
          </div>
        `;
      })
      .join('');

    pageEl.innerHTML = `
      ${
        reportState.pages.length > 1
          ? `<div class="page-controls no-print">
              <button type="button" class="btn-mini btn-delete-page" data-page="${pageIndex}">ลบหน้านี้ (หน้า ${pageIndex + 1})</button>
            </div>`
          : ''
      }

      <div class="report-header">
        <div class="logo-box" title="คลิกเพื่อเปลี่ยนโลโก้">
          ${renderLogoHtml()}
          <input type="file" accept="image/*" class="input-logo" hidden />
        </div>

        <div class="header-info">
          <div class="report-title" contenteditable="true" data-field="reportTitle" data-page="${pageIndex}" data-placeholder="หัวข้อรายงาน">${escapeHtml(page.reportTitle)}</div>
          <div class="site-line" contenteditable="true" data-field="siteName" data-page="${pageIndex}" data-placeholder="Site : กรอกชื่อสถานที่ / บริษัทลูกค้า">${escapeHtml(page.siteName)}</div>
        </div>
      </div>

      <div class="report-frame">
        <div class="section-banner">
          <span contenteditable="true" data-field="sectionTitle" data-page="${pageIndex}" data-placeholder="หัวข้อหมวดงาน">${escapeHtml(page.sectionTitle)}</span>
        </div>
        <div class="photo-grid">
          ${cardsHtml}
        </div>
      </div>

      <div class="report-footer">
        <span contenteditable="true" data-field="footerLeft" data-page="${pageIndex}" data-placeholder="ข้อความท้ายกระดาษ">${escapeHtml(page.footerLeft)}</span>
        <span>หน้า ${pageIndex + 1} / ${reportState.pages.length}</span>
      </div>
    `;

    container.appendChild(pageEl);
  });

  bindDynamicEvents();
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function bindDynamicEvents() {
  document.querySelectorAll('[contenteditable="true"]').forEach((el) => {
    el.addEventListener('input', (e) => {
      const pageIdx = Number(e.target.dataset.page);
      const field = e.target.dataset.field;
      const text = e.target.innerText;

      if (field === 'caption') {
        const cardIdx = Number(e.target.dataset.card);
        reportState.pages[pageIdx].cards[cardIdx].caption = text;
      } else {
        reportState.pages[pageIdx][field] = text;
      }
      saveState();
    });
  });

  document.querySelectorAll('.logo-box').forEach((box) => {
    const fileInput = box.querySelector('.input-logo');
    box.addEventListener('click', (e) => {
      if (e.target !== fileInput) fileInput.click();
    });
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      reportState.logoDataUrl = await processImageFile(file, 600, 0.9);
      saveState();
      renderReport();
    });
  });

  document.querySelectorAll('.photo-slot').forEach((slot) => {
    slot.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.tagName === 'INPUT') return;
      const galleryInput = slot.querySelector('.input-gallery');
      galleryInput?.click();
    });
  });

  document.querySelectorAll('.btn-pick-gallery').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const slot = btn.closest('.photo-slot');
      slot.querySelector('.input-gallery')?.click();
    });
  });

  document.querySelectorAll('.btn-pick-camera').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const slot = btn.closest('.photo-slot');
      slot.querySelector('.input-camera')?.click();
    });
  });

  document.querySelectorAll('.input-gallery, .input-camera').forEach((input) => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const pageIdx = Number(input.dataset.page);
      const cardIdx = Number(input.dataset.card);
      const compressedDataUrl = await processImageFile(file);
      reportState.pages[pageIdx].cards[cardIdx].image = compressedDataUrl;
      saveState();
      renderReport();
    });
  });

  document.querySelectorAll('.btn-open-webcam').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openWebcamModal(Number(btn.dataset.page), Number(btn.dataset.card));
    });
  });

  document.querySelectorAll('.btn-toggle-fit').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = Number(btn.dataset.page);
      const c = Number(btn.dataset.card);
      const current = reportState.pages[p].cards[c].fitMode;
      reportState.pages[p].cards[c].fitMode = current === 'contain' ? 'cover' : 'contain';
      saveState();
      renderReport();
    });
  });

  document.querySelectorAll('.btn-remove-img').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = Number(btn.dataset.page);
      const c = Number(btn.dataset.card);
      reportState.pages[p].cards[c].image = null;
      saveState();
      renderReport();
    });
  });

  document.querySelectorAll('.btn-delete-page').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = Number(btn.dataset.page);
      if (reportState.pages.length <= 1) return;
      reportState.pages.splice(p, 1);
      saveState();
      renderReport();
    });
  });
}

async function openWebcamModal(pageIndex, cardIndex) {
  activeWebcamTarget = { pageIndex, cardIndex };
  const modal = document.getElementById('webcamModal');
  const video = document.getElementById('webcamVideo');
  const errorEl = document.getElementById('webcamError');

  errorEl.classList.add('hidden');
  modal.classList.remove('hidden');

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    });
    video.srcObject = webcamStream;
  } catch (err) {
    errorEl.textContent = 'ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบสิทธิ์การเปิดกล้องของเบราว์เซอร์';
    errorEl.classList.remove('hidden');
  }
}

function closeWebcamModal() {
  const modal = document.getElementById('webcamModal');
  const video = document.getElementById('webcamVideo');
  if (webcamStream) {
    webcamStream.getTracks().forEach((track) => track.stop());
    webcamStream = null;
  }
  video.srcObject = null;
  modal.classList.add('hidden');
  activeWebcamTarget = null;
}

document.getElementById('btnCaptureWebcam').addEventListener('click', () => {
  if (!activeWebcamTarget || !webcamStream) return;
  const video = document.getElementById('webcamVideo');
  const canvas = document.getElementById('webcamCanvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 960;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  const { pageIndex, cardIndex } = activeWebcamTarget;
  reportState.pages[pageIndex].cards[cardIndex].image = dataUrl;

  closeWebcamModal();
  saveState();
  renderReport();
});

document.getElementById('btnCloseWebcam').addEventListener('click', closeWebcamModal);
document.getElementById('btnCancelWebcam').addEventListener('click', closeWebcamModal);

document.getElementById('btnAddRow').addEventListener('click', () => {
  const lastPage = reportState.pages[reportState.pages.length - 1];
  const nextNum = lastPage.cards.length + 1;
  lastPage.cards.push(
    { id: crypto.randomUUID(), image: null, fitMode: 'cover', caption: `รายละเอียดการปฏิบัติงานที่ ${nextNum}` },
    { id: crypto.randomUUID(), image: null, fitMode: 'cover', caption: `รายละเอียดการปฏิบัติงานที่ ${nextNum + 1}` }
  );
  saveState();
  renderReport();
});

document.getElementById('btnRemoveRow').addEventListener('click', () => {
  const lastPage = reportState.pages[reportState.pages.length - 1];
  if (lastPage.cards.length > 2) {
    lastPage.cards.splice(-2, 2);
    saveState();
    renderReport();
  }
});

document.getElementById('btnAddPage').addEventListener('click', () => {
  const prevPage = reportState.pages[reportState.pages.length - 1];
  reportState.pages.push({
    id: crypto.randomUUID(),
    reportTitle: prevPage.reportTitle,
    siteName: prevPage.siteName,
    sectionTitle: prevPage.sectionTitle,
    footerLeft: prevPage.footerLeft,
    cards: [
      { id: crypto.randomUUID(), image: null, fitMode: 'cover', caption: 'หัวข้อการปฏิบัติงานที่ 1' },
      { id: crypto.randomUUID(), image: null, fitMode: 'cover', caption: 'หัวข้อการปฏิบัติงานที่ 2' },
      { id: crypto.randomUUID(), image: null, fitMode: 'cover', caption: 'หัวข้อการปฏิบัติงานที่ 3' },
      { id: crypto.randomUUID(), image: null, fitMode: 'cover', caption: 'หัวข้อการปฏิบัติงานที่ 4' }
    ]
  });
  saveState();
  renderReport();
});

document.getElementById('btnLoadSample').addEventListener('click', () => {
  if (confirm('ต้องการรีเซ็ตข้อความกลับเป็นค่าเริ่มต้นตามเอกสารตัวอย่างหรือไม่?')) {
    reportState = getDefaultData();
    saveState();
    renderReport();
  }
});

document.getElementById('btnClearAll').addEventListener('click', () => {
  if (confirm('ต้องการล้างรูปภาพและข้อความทั้งหมดใช่หรือไม่?')) {
    reportState = {
      logoDataUrl: null,
      pages: [
        {
          id: crypto.randomUUID(),
          reportTitle: 'รายงานภาพถ่ายผลการปฏิบัติงาน',
          siteName: '',
          sectionTitle: 'หัวข้อหมวดงาน / ชื่อตู้ไฟฟ้า',
          footerLeft: 'การไฟฟ้าส่วนภูมิภาค (Provincial Electricity Authority)',
          cards: [
            { id: crypto.randomUUID(), image: null, fitMode: 'cover', caption: 'คำบรรยายภาพที่ 1' },
            { id: crypto.randomUUID(), image: null, fitMode: 'cover', caption: 'คำบรรยายภาพที่ 2' },
            { id: crypto.randomUUID(), image: null, fitMode: 'cover', caption: 'คำบรรยายภาพที่ 3' },
            { id: crypto.randomUUID(), image: null, fitMode: 'cover', caption: 'คำบรรยายภาพที่ 4' }
          ]
        }
      ]
    };
    saveState();
    renderReport();
  }
});

document.getElementById('btnExportJson').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(reportState, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PEA-Site-Report-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('inputImportJson').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (imported && Array.isArray(imported.pages)) {
        reportState = imported;
        saveState();
        renderReport();
      } else {
        alert('รูปแบบไฟล์ JSON ไม่ถูกต้อง');
      }
    } catch {
      alert('ไม่สามารถอ่านไฟล์ JSON ได้');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('btnPrint').addEventListener('click', () => {
  window.print();
});

renderReport();
