/**
 * KV helpers for license key storage and retrieval.
 *
 * Key format:  license:{key}
 * Value:       JSON { email, status, customer_id, subscription_id, created_at, exports_count }
 */

const PREFIX = 'license:';

export async function getLicense(key, env) {
  const raw = await env.LICENSES.get(`${PREFIX}${key}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function putLicense(key, data, env) {
  await env.LICENSES.put(`${PREFIX}${key}`, JSON.stringify(data));
}

export async function deleteLicense(key, env) {
  await env.LICENSES.delete(`${PREFIX}${key}`);
}

export async function incrementExports(key, env) {
  const license = await getLicense(key, env);
  if (!license) return null;
  license.exports_count = (license.exports_count || 0) + 1;
  await putLicense(key, license, env);
  return license;
}
