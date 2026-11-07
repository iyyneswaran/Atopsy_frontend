import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

test('failed operations, keyboard access, reduced motion, partial runs and password change', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const marker = randomUUID();
  const email = `atopsy.resilience.${marker}@example.test`;
  const password = 'AtopsySynthetic123!';
  await page.goto('/signup');
  await page.getByLabel('First name').fill('Synthetic');
  await page.getByLabel('Last name').fill('Reviewer');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Account created successfully' })).toBeVisible();
  await page.getByRole('link', { name: 'Continue to sign in' }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Investigation Overview' })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.metric-card')
      .first()
      .evaluate((el) => getComputedStyle(el, '::after').animationName),
  ).toBe('none');
  await page.getByRole('button', { name: 'New case', exact: true }).click();
  await expect(page.getByLabel('Case title')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'New case', exact: true }).click();
  await page.getByLabel('Case title').fill('Synthetic · Partial media examination');
  await page
    .getByLabel('Description', { exact: true })
    .fill(`Synthetic resilience checks ${marker}. Not a real investigation.`);
  // Explicitly injected transport failure verifies that the UI never manufactures a successful case.
  await page.route('**/api/v1/investigations', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Synthetic service interruption' }),
        })
      : route.continue(),
  );
  await page.getByRole('button', { name: 'Create case', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Synthetic service interruption' }),
  ).toBeVisible();
  await expect(page.locator('.success-mark')).toHaveCount(0);
  await page.unroute('**/api/v1/investigations');
  await page.getByRole('button', { name: 'Create case', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Case created successfully' })).toBeVisible();
  await page.getByRole('link', { name: 'Open investigation', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Synthetic · Partial media examination' }),
  ).toBeVisible();
  const caseId = page.url().split('/cases/')[1].split('?')[0];
  const access = await page.evaluate(() => localStorage.getItem('atopsy.accessToken'));
  const headers = { Authorization: `Bearer ${access}` };
  await page.goto(`/cases/${caseId}?tab=evidence`);
  await page.getByRole('button', { name: 'Upload evidence', exact: true }).first().click();
  await page
    .getByLabel('Choose evidence files')
    .setInputFiles({ name: 'empty.txt', mimeType: 'text/plain', buffer: Buffer.alloc(0) });
  await expect(
    page.getByText('Files must be nonempty and no larger than 500 MB each.'),
  ).toBeVisible();
  const badFile = {
    name: 'synthetic-unsupported.exe',
    mimeType: 'application/x-msdownload',
    buffer: Buffer.from(`SYNTHETIC unsupported format ${marker}`),
  };
  await page.getByLabel('Choose evidence files').setInputFiles(badFile);
  await page.getByRole('button', { name: 'Register 1 file', exact: true }).click();
  await expect(page.locator('.upload-results .badge')).toHaveText('Failed');
  await expect(page.getByText(/has been queued/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  // DOCX is accepted for acquisition, while the active document reader explicitly rejects it.
  await page.getByRole('button', { name: 'Upload evidence', exact: true }).first().click();
  const structured = {
    name: 'synthetic-document.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.concat([
      await readFile('tests/fixtures/unsupported-reader.docx'),
      Buffer.from(marker),
    ]),
  };
  await page.getByLabel('Choose evidence files').setInputFiles(structured);
  await page.getByRole('button', { name: 'Register 1 file', exact: true }).click();
  await expect(page.getByText('Examination version 1 has been queued.')).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Upload evidence', exact: true }).first().click();
  await page.getByLabel('Choose evidence files').setInputFiles(structured);
  await page.getByRole('button', { name: 'Register 1 file', exact: true }).click();
  await expect(page.locator('.upload-results .badge')).toHaveText('Failed');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect
    .poll(
      async () =>
        (await (await request.get(`/api/v1/intelligence/cases/${caseId}`, { headers })).json()).data
          .run.status,
    )
    .toBe('FAILED');
  await page.goto(`/cases/${caseId}?tab=examination`);
  await page.getByRole('button', { name: 'Retry as new version' }).click();
  await expect
    .poll(
      async () =>
        (await (await request.get(`/api/v1/intelligence/cases/${caseId}`, { headers })).json()).data
          .run.version,
    )
    .toBe(2);
  await page.getByRole('tab', { name: 'Pipeline stages' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Findings & reviews' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.goto(`/cases/${caseId}`);
  await page.getByRole('button', { name: 'Archive case', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Archive case', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(
    (await (await request.get(`/api/v1/investigations/${caseId}`, { headers })).json()).data.status,
  ).toBe('ARCHIVED');
  await page.goto(`/cases/${randomUUID()}`);
  await expect(page.getByRole('alert').filter({ hasText: 'not found' })).toBeVisible();
  await page.goto('/settings');
  await page.getByLabel('Current password').fill(password);
  await page.getByLabel('New password', { exact: true }).fill('UpdatedSynthetic123!');
  await page.getByLabel('Confirm new password').fill('UpdatedSynthetic123!');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('UpdatedSynthetic123!');
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Investigation Overview' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
