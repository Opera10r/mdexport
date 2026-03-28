import chalk from 'chalk';
import { createInterface } from 'readline';
import { getLicenseKey, setLicenseKey, clearLicenseKey } from '../config.js';
import { validateLicenseAPI } from '../api.js';

export async function authLogin() {
  console.log('');

  const key = await prompt('  Enter your license key: ');

  if (!key || !key.startsWith('mdexp_')) {
    console.error(chalk.red('  ✗ Invalid key format. Keys start with mdexp_'));
    console.log('');
    process.exit(1);
  }

  console.log(chalk.dim('  Validating...'));

  try {
    const result = await validateLicenseAPI(key);

    if (result.valid) {
      setLicenseKey(key);
      console.log(chalk.green('  ✓ License activated!'));
      console.log(chalk.dim(`  Email: ${result.email}`));
      console.log(chalk.dim(`  Exports: ${result.exports_count}`));
    } else {
      console.error(chalk.red('  ✗ Invalid or expired license key.'));
      console.log(chalk.dim('  Get a key at https://mdexport.dev'));
    }
  } catch (err) {
    console.error(chalk.red(`  ✗ Validation failed: ${err.message}`));
  }

  console.log('');
}

export async function authStatus() {
  console.log('');

  const key = getLicenseKey();

  if (!key) {
    console.log(chalk.yellow('  No license key configured.'));
    console.log(chalk.dim('  Free tier: basic PDF export only.'));
    console.log('');
    console.log(chalk.cyan('  Get MDExport → https://mdexport.dev'));
    console.log(chalk.dim('  Already have a key? Run: mdexport auth login'));
    console.log('');
    return;
  }

  console.log(chalk.dim('  Checking license...'));

  try {
    const result = await validateLicenseAPI(key);

    if (result.valid) {
      console.log(chalk.green('  ✓ License active'));
      console.log(chalk.dim(`  Email: ${result.email}`));
      console.log(chalk.dim(`  Status: ${result.status}`));
      console.log(chalk.dim(`  Total exports: ${result.exports_count}`));
    } else {
      console.log(chalk.yellow('  ⚠ License key found but no longer valid.'));
      console.log(chalk.dim('  Run: mdexport auth login — to enter a new key.'));
    }
  } catch (err) {
    console.error(chalk.red(`  ✗ Could not validate: ${err.message}`));
    console.log(chalk.dim(`  Key on file: ${key.slice(0, 10)}...`));
  }

  console.log('');
}

export async function authLogout() {
  console.log('');

  const key = getLicenseKey();

  if (!key) {
    console.log(chalk.dim('  No license key to remove.'));
    console.log('');
    return;
  }

  clearLicenseKey();
  console.log(chalk.green('  ✓ License key removed.'));
  console.log(chalk.dim('  You\'re now on the free tier.'));
  console.log('');
}

// ── Helpers ──────────────────────────────────────────────────────────

function prompt(question) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
