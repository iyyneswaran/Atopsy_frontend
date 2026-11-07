import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

test('real backend: case, acquisition, review, hypothesis, retrieval, reports and desktop layouts', async ({
  page,
  request,
}) => {
  test.setTimeout(300000);
  // Deliberately synthetic account/records. Never touch another user's investigations.
  const marker = randomUUID();
  const email = `atopsy.ui.${marker}@example.test`;
  const password = `AtopsyTest${marker.slice(0, 8)}!`;
  const account = await request.post('/api/v1/auth/signup', {
    data: { email, password, firstName: 'Alex', lastName: 'Morgan' },
  });
  expect(account.status(), await account.text()).toBe(201);
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Investigation Overview' })).toBeVisible();
  await expect(page.getByText('A workspace ready for discovery')).toBeVisible();
  await page.getByRole('button', { name: 'New case', exact: true }).click();
  await page.getByRole('button', { name: 'Create case', exact: true }).click();
  await expect(page.getByText('Use at least 3 characters.')).toBeVisible();
  await page.getByLabel('Case title').fill('Synthetic · North district inquiry');
  await page
    .getByLabel('Description', { exact: true })
    .fill(
      `Synthetic frontend acceptance test ${marker}. Document examination and source verification. Not a real investigation.`,
    );
  await page.getByLabel('Priority', { exact: true }).selectOption('4');
  const selfId = await page
    .getByLabel('Assigned investigator')
    .locator('option')
    .nth(1)
    .getAttribute('value');
  await page.getByLabel('Assigned investigator').selectOption(selfId!);
  await page.getByRole('button', { name: 'Create case', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Case created successfully' })).toBeVisible();
  await expect(page.locator('.success-mark')).toBeVisible();
  await page.screenshot({ path: 'verification/case-created.png' });
  await page.getByRole('link', { name: 'Open investigation', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Synthetic · North district inquiry' }),
  ).toBeVisible();
  const caseId = page.url().split('/cases/')[1].split('?')[0];
  const access = await page.evaluate(() => localStorage.getItem('atopsy.accessToken'));
  const headers = { Authorization: `Bearer ${access}` };
  await page.getByRole('button', { name: 'Edit case' }).click();
  await page.getByLabel('Case status').selectOption('IN_PROGRESS');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const persisted = await request.get(`/api/v1/investigations/${caseId}`, { headers });
  expect((await persisted.json()).data.status).toBe('IN_PROGRESS');
  await page
    .getByRole('navigation', { name: 'Case sections' })
    .getByRole('link', { name: 'Evidence' })
    .click();
  await page.getByRole('button', { name: 'Upload evidence', exact: true }).first().click();
  const autopsy = await readFile(path.resolve('tests/fixtures/autopsy.txt'), 'utf8');
  const inquest = await readFile(path.resolve('tests/fixtures/inquest.txt'), 'utf8');
  await page.getByLabel('Choose evidence files').setInputFiles([
    {
      name: 'synthetic-autopsy.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(`${autopsy}\nAcceptance batch: ${marker}\n`),
    },
    {
      name: 'synthetic-inquest.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(`${inquest}\nAcceptance batch: ${marker}\n`),
    },
  ]);
  await page.getByRole('button', { name: 'Register 2 files' }).click();
  await expect(page.getByText('Examination version 1 has been queued.')).toBeVisible({
    timeout: 60000,
  });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Inspect synthetic-autopsy.txt' })).toBeVisible();
  await page.getByRole('button', { name: 'Inspect synthetic-autopsy.txt' }).click();
  await page.getByRole('button', { name: 'Verify & preview' }).click();
  await expect(page.locator('.document-preview')).toContainText('SYNTHETIC TRAINING DATA');
  const originalDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download original' }).click();
  expect((await originalDownload).suggestedFilename()).toBe('synthetic-autopsy.txt');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page
    .getByRole('navigation', { name: 'Case sections' })
    .getByRole('link', { name: 'Examination', exact: true })
    .click();
  await expect
    .poll(
      async () => {
        const response = await request.get(`/api/v1/intelligence/cases/${caseId}`, { headers });
        return (await response.json()).data.run.status;
      },
      { timeout: 90000, intervals: [2000, 3000, 5000] },
    )
    .toBe('COMPLETED');
  await expect(page.getByText('Examination in progress.')).not.toBeVisible();
  await page.getByRole('tab', { name: 'Findings & reviews' }).click();
  await expect(page.getByRole('heading', { name: 'Extracted observations' })).toBeVisible();
  await page.getByRole('button', { name: 'Review', exact: true }).first().click();
  await page.getByLabel('Review decision').selectOption('ACCEPTED');
  await page
    .getByLabel('Reason / review note')
    .fill('Synthetic acceptance: compared the extraction with its original source.');
  await page.getByRole('button', { name: 'Save review' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.review-note').first()).toContainText('Synthetic acceptance');
  await page.getByRole('tab', { name: 'Hypotheses', exact: true }).click();
  await page.getByRole('button', { name: 'Add hypothesis' }).first().click();
  await page
    .getByLabel('Hypothesis', { exact: true })
    .fill('The source records contain different reported ages.');
  await page
    .getByLabel('Investigator notes')
    .fill('Synthetic workflow test; compare the original source assertions.');
  await page.getByRole('button', { name: 'Save revision' }).click();
  await expect(
    page.getByRole('heading', { name: 'The source records contain different reported ages.' }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Evidence search' }).click();
  await page.getByLabel('Question about case evidence').fill('What injuries are documented?');
  await page.getByRole('button', { name: 'Find sources' }).click();
  await expect(page.locator('.citation').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Pipeline stages' }).click();
  await page.screenshot({ path: 'verification/examination.png', fullPage: true });
  await page
    .getByRole('navigation', { name: 'Case sections' })
    .getByRole('link', { name: 'Reports' })
    .click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.report-preview')).toContainText('North district');
  for (const name of ['Markdown report', 'JSON export']) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name, exact: true }).click();
    expect((await download).suggestedFilename()).toContain(caseId);
  }
  await page
    .getByRole('navigation', { name: 'Case sections' })
    .getByRole('link', { name: 'Activity' })
    .click();
  await expect(page.getByText('Report generated').first()).toBeVisible();
  for (const [title, status, priority] of [
    ['Synthetic · Riverside records', 'REVIEW', 2],
    ['Synthetic · Laboratory review', 'CLOSED', 1],
  ] as const) {
    const response = await request.post('/api/v1/investigations', {
      headers,
      data: {
        title,
        description: `Synthetic UI layout validation ${marker}`,
        priority,
        assignedToId: selfId,
      },
    });
    expect(response.status()).toBe(201);
    const created = (await response.json()).data;
    await request.patch(`/api/v1/investigations/${created.id}`, { headers, data: { status } });
  }
  await page.goto('/overview');
  await expect(page.getByRole('heading', { name: 'Investigation Overview' })).toBeVisible();
  await page.getByLabel('Select featured investigation').selectOption(caseId);
  await expect(page.locator('.stage-bars')).toBeVisible();
  for (const width of [1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: width === 1024 ? 1100 : 1000 });
    await expect
      .poll(async () => Math.round((await page.locator('.sidebar').boundingBox())!.width))
      .toBe(width === 1024 ? 230 : width === 1920 ? 264 : 252);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.screenshot({ path: `verification/overview-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/is-collapsed/);
  await expect
    .poll(async () => Math.round((await page.locator('.sidebar').boundingBox())!.width))
    .toBe(76);
  await page.screenshot({ path: 'verification/overview-collapsed.png', fullPage: true });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel('Search cases', { exact: true }).fill('North district');
  await page.getByLabel('Search cases', { exact: true }).press('Enter');
  await expect(page.locator('.data-table tbody tr')).toHaveCount(1);
  await page.getByLabel('Filter case status').selectOption('CLOSED');
  await expect(page.getByText('No matching investigations')).toBeVisible();
  for (const section of ['evidence', 'examinations', 'reports', 'activity']) {
    await page.goto(`/${section}?case=${caseId}`);
    await expect(
      page.getByRole('heading', { name: section[0].toUpperCase() + section.slice(1), exact: true }),
    ).toBeVisible();
  }
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();
  // Force a stale access token; the HTTP-only refresh cookie must restore the session.
  await page.evaluate(() => localStorage.setItem('atopsy.accessToken', 'expired-test-token'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();
  const refreshed = await page.evaluate(() => localStorage.getItem('atopsy.accessToken'));
  expect(refreshed).not.toBe('expired-test-token');
  await mkdir('verification', { recursive: true });
  await writeFile(
    'verification/live-workflow.json',
    JSON.stringify(
      {
        caseId,
        account: email,
        status: 'passed',
        viewportWidths: [1024, 1440, 1920],
        browserErrors,
        testedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  expect(browserErrors).toEqual([]);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
