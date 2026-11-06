'use strict';

(async () => {
  const D = window.DWDesktop;
  const status = D.setStatus;
  let file = null;
  let previewUrl = null;
  let requestInFlight = false;
  let submissionUncertain = false;

  try {
    const session = await D.initSession();
    if (session.role === 'unlinked') {
      status('Ask a tournament admin to link this Discord account before submitting screenshots.', 'error');
      D.$('browse-button').disabled = true;
      return;
    }
  } catch (error) {
    status(error.message, 'error');
    if (error.status === 401) location.href = '/';
    return;
  }

  const input = D.$('image-file');
  const zone = D.$('drop-zone');
  const preview = D.$('preview-panel');
  const image = D.$('image-preview');
  const result = D.$('upload-result');
  const progress = D.$('upload-progress');
  const uploadButton = D.$('upload-button');

  function clearFile({ keepResult = false } = {}) {
    file = null;
    input.value = '';
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    image.removeAttribute('src');
    preview.classList.add('hidden');
    zone.classList.remove('hidden');
    if (!keepResult) result.classList.add('hidden');
  }

  function showResult(title, message, kind = 'warning', recordId = null) {
    result.className = 'notice ' + kind;
    result.classList.remove('hidden');
    result.replaceChildren(D.node('h2', '', title));
    result.append(D.node('p', '', message));
    if (recordId) result.append(D.node('p', 'muted', 'Record ID: ' + recordId));
    const link = D.node('a', 'button secondary small', 'Open Player page');
    link.href = '/player.html';
    result.append(link);
  }

  function choose(next) {
    if (!next) return;
    if (submissionUncertain) {
      status('Check the Player page for a received submission before uploading again. Refresh this page only after confirming the prior request.', 'error');
      return;
    }
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/tiff'];
    const ext = (next.name.split('.').pop() || '').toLowerCase();
    if (!allowed.includes(next.type) && !['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff'].includes(ext)) {
      clearFile();
      status('Choose a PNG, JPG, WEBP, BMP or TIFF screenshot.', 'error');
      return;
    }
    if (next.size > 25 * 1024 * 1024) {
      clearFile();
      status('The maximum upload size is 25 MiB.', 'error');
      return;
    }
    if (next.size === 0) {
      clearFile();
      status('The selected file is empty.', 'error');
      return;
    }

    file = next;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(next);
    image.src = previewUrl;
    D.$('file-name').textContent = next.name;
    D.$('file-meta').textContent = (next.size / 1024 / 1024).toFixed(2) + ' MiB · ' + (next.type || 'image type detected by server');
    zone.classList.add('hidden');
    preview.classList.remove('hidden');
    result.classList.add('hidden');
    D.$('progress-percent').textContent = '0%';
    D.$('progress-bar').style.width = '0%';
    uploadButton.disabled = false;
    status('Image selected. Review the preview before submitting.', 'success');
  }

  D.$('browse-button').addEventListener('click', () => input.click());
  zone.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    input.click();
  });
  input.addEventListener('change', () => choose(input.files?.[0]));
  for (const name of ['dragenter', 'dragover']) {
    zone.addEventListener(name, event => {
      event.preventDefault();
      zone.classList.add('dragover');
    });
  }
  for (const name of ['dragleave', 'drop']) {
    zone.addEventListener(name, event => {
      event.preventDefault();
      zone.classList.remove('dragover');
    });
  }
  zone.addEventListener('drop', event => choose(event.dataTransfer?.files?.[0]));
  D.$('remove-file').addEventListener('click', () => clearFile());

  uploadButton.addEventListener('click', () => {
    if (!file || requestInFlight || submissionUncertain) return;
    requestInFlight = true;
    uploadButton.disabled = true;
    progress.classList.remove('hidden');
    result.classList.add('hidden');
    D.$('progress-label').textContent = 'Uploading screenshot…';
    D.$('progress-detail').textContent = 'The image is sent to the local Node bot service and enters the shared OCR queue.';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.withCredentials = true;
    xhr.timeout = 180000;

    const csrfToken = D.csrfToken();
    if (!csrfToken) {
      requestInFlight = false;
      uploadButton.disabled = false;
      progress.classList.add('hidden');
      status('Your local session expired. Refresh and sign in again.', 'error');
      return;
    }

    xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    xhr.setRequestHeader('X-File-Name', file.name);
    if (file.type) xhr.setRequestHeader('X-File-Content-Type', file.type);

    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable) {
        const percent = Math.round(event.loaded / event.total * 100);
        D.$('progress-percent').textContent = percent + '%';
        D.$('progress-bar').style.width = percent + '%';
      }
    });

    xhr.addEventListener('load', () => {
      requestInFlight = false;
      progress.classList.add('hidden');
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      const received = xhr.status >= 200 && xhr.status < 300;

      if (received) {
        const message = (data.message || 'The local service received the screenshot.')
          + ' Receipt is not final OCR acceptance or score approval; review the record on the Player page.';
        showResult('Screenshot received', message, 'info', data.submissionId || null);
        if (data.missingFields?.length) {
          result.append(D.node('p', '', data.missingFields.length + ' mandatory field(s) need exact confirmation. Open the Player page to review the correction prompts.'));
        }
        if (data.status === 'admin-review') {
          result.append(D.node('p', '', 'OCR identity does not match the linked player automatically. An administrator must review this record.'));
        }
        D.$('progress-label').textContent = 'Screenshot received by the local service';
        clearFile({ keepResult: true });
        status('The local service received the image. Review its status on the Player page.', 'success');
        return;
      }

      showResult('Upload rejected', data.message || data.error || ('Status: ' + (data.status || xhr.status)), 'warning');
      if (xhr.status >= 500) {
        submissionUncertain = true;
        showResult('Submission status uncertain', 'The service returned an error after the request was sent. Check the Player page for a received record before attempting another upload.', 'warning');
        status('Request outcome is uncertain. Check the Player page before retrying.', 'error');
      } else {
        uploadButton.disabled = false;
        status(data.message || data.error || 'Upload failed.', 'error');
      }
    });

    const uncertainFailure = message => {
      requestInFlight = false;
      submissionUncertain = true;
      progress.classList.add('hidden');
      showResult('Submission status uncertain', message + ' Check the Player page for a received record before attempting another upload.', 'warning');
      status('Request outcome is uncertain. Check the Player page before retrying.', 'error');
    };
    xhr.addEventListener('error', () => uncertainFailure('The connection ended before the service confirmed the request.'));
    xhr.addEventListener('timeout', () => uncertainFailure('The request exceeded the three-minute response limit.'));
    xhr.addEventListener('abort', () => uncertainFailure('The upload request was interrupted.'));

    xhr.send(file);
  });

  window.addEventListener('beforeunload', () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  });
})();
