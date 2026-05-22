const API_BASE = 'https://mdexport-worker.opera10r.workers.dev';

/**
 * Call the MDExport Worker API to render markdown.
 * Returns the response body as an ArrayBuffer.
 */
export async function callExportAPI(markdown, options, licenseKey) {
  const body = {
    markdown,
    format: options.format || 'pdf',
    license_key: licenseKey || null,
    options: {
      theme: options.theme || 'clean',
      font: options.font || 'sans',
      toc: options.toc || false,
      cover: options.cover
        ? { enabled: true, title: options.coverTitle, date: options.coverDate !== false }
        : { enabled: false },
      margins: options.margins || 'normal',
      line_spacing: options.lineSpacing || 1.15,
      header: options.header || null,
      footer: options.footer || null,
      page_numbers: options.pageNumbers || false,
      accent_color: options.accent || null,
    },
  };

  const res = await fetch(`${API_BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `Export failed (${res.status})`);
  }

  return await res.arrayBuffer();
}

/**
 * Validate a license key against the API.
 */
export async function validateLicenseAPI(licenseKey) {
  const res = await fetch(`${API_BASE}/validate-license`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: licenseKey }),
  });

  if (!res.ok) {
    throw new Error(`Validation failed (${res.status})`);
  }

  return await res.json();
}
