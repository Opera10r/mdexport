/**
 * Send the license key to the customer via Resend.
 */
export async function sendLicenseEmail(toEmail, licenseKey, env) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'MDExport <noreply@mdexport.dev>',
      to: [toEmail],
      subject: 'Your MDExport License Key',
      html: `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">MDExport</h1>
          <p style="color: #666; margin-bottom: 32px;">Your markdown. Publication-ready in seconds.</p>

          <p>Thanks for subscribing! Here's your license key:</p>

          <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 24px 0; font-family: monospace; font-size: 16px; word-break: break-all;">
            ${licenseKey}
          </div>

          <p><strong>To activate in VS Code:</strong></p>
          <ol>
            <li>Open the command palette (<code>Cmd+Shift+P</code>)</li>
            <li>Type <code>MDExport: Enter License Key</code></li>
            <li>Paste your key</li>
          </ol>

          <p><strong>To activate in the CLI:</strong></p>
          <pre style="background: #18181b; color: #a1a1aa; padding: 12px; border-radius: 6px; overflow-x: auto;">mdexport auth login</pre>

          <p style="color: #666; margin-top: 32px; font-size: 14px;">
            Questions? Reply to this email.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    console.error('Resend error:', await res.text());
  }

  return res.ok;
}
