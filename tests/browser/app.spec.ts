import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('Today, army explanations, queue and plan work together', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Sample workspace', { exact: true })).toBeVisible();
  await expect(page.getByText('Coming up next', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/today-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Add to my plan', exact: true }).click();
  await page.getByRole('tab', { name: /Upgrade plan/ }).click();
  await expect(page.getByText('1 selected upgrades', { exact: true })).toBeVisible();
  await expect(page.getByText('Planned', { exact: true }).first()).toBeVisible();
  await page.getByRole('tab', { name: 'My army', exact: true }).click();
  await page.getByRole('button', { name: /Queen charge hybrid/ }).click();
  await expect(page.getByText('Your army, piece by piece', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Why upgrade/ }).first().click();
  await expect(page.getByText('Why this is on your list', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).last().click();
  expect(errors).toEqual([]);
});
test('equipment targets and manually entered balances survive reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  await expect(page.getByText('Spend ore with a purpose', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'shiny ore balance', exact: true }).fill('12345');
  await expect(page.getByRole('textbox', { name: 'shiny ore balance', exact: true })).toHaveValue('12345');
  await page.getByRole('button', { name: /Lower .* target/ }).first().click();
  await page.reload();
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'shiny ore balance', exact: true })).toHaveValue('12345');
});
test('history and account switching retain village-specific data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Progress', exact: true }).click();
  await expect(page.getByText('+62 levels', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch village', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to Little village', exact: true }).click();
  await expect(page.getByText('The start of your village’s story', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch village', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to Northwind', exact: true }).click();
  await expect(page.getByText('+62 levels', { exact: true })).toBeVisible();
});
test('invalid imports preserve data; accepted imports preserve unknown fields', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Update village', exact: true }).click();
  await page.getByLabel('Village export JSON', { exact: true }).fill('{broken');
  await page.getByRole('button', { name: 'Preview village', exact: true }).click();
  await expect(page.getByText(/That is not valid JSON/)).toBeVisible();
  const raw = JSON.parse(readFileSync('tests/fixtures/village-export.json', 'utf8'));
  raw.tag = '#MYVILLAGE'; raw.timestamp = Math.floor(Date.now() / 1000); raw.future_field = { preserved: true };
  await page.getByLabel('Village export JSON', { exact: true }).fill(JSON.stringify(raw));
  await page.getByRole('button', { name: 'Preview village', exact: true }).click();
  await page.getByLabel('Village name (optional)', { exact: true }).fill('My imported village');
  await page.getByRole('button', { name: 'Save village & update widgets', exact: true }).click();
  await expect(page.getByText('My imported village', { exact: true })).toBeVisible();
  await expect(page.getByText('Sample workspace', { exact: true })).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('@cocwidget/workspace-v1')!));
  expect(saved.workspace.accounts.find((a: { tag: string }) => a.tag === '#MYVILLAGE').snapshots[0].raw.future_field).toEqual({ preserved: true });
});
test('phone layout supports all five screens without page-width overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('Sample workspace', { exact: true })).toBeVisible();
  for (const name of ['Today', 'My army', 'Upgrade plan', 'Equipment', 'Progress']) {
    await page.getByRole('tab', { name, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await page.screenshot({ path: 'test-results/today-phone.png', fullPage: true });
});
test('unreadable saved data is kept until an explicit reset', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('@cocwidget/workspace-v1', '{broken'));
  await page.reload();
  await expect(page.getByText(/Your saved data could not be read/)).toBeVisible();
  await page.getByRole('button', { name: 'Reset local workspace', exact: true }).click();
  await expect(page.getByText('Reset this device?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset local workspace', exact: true }).last().click();
  await expect(page.getByText('Your next chapter starts here', { exact: true })).toBeVisible();
});
