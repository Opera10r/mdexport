import { getLicense } from './kv.js';

/**
 * Validate a license key against KV.
 * Returns the license record if active, null otherwise.
 */
export async function validateLicense(key, env) {
  if (!key) return null;
  const license = await getLicense(key, env);
  if (!license) return null;
  if (license.status !== 'active') return null;
  return license;
}

/**
 * Generate a new license key.
 * Format: mdexp_<uuid without dashes>
 */
export function generateLicenseKey() {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return `mdexp_${uuid}`;
}
