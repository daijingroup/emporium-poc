import { expect, test } from '@playwright/test'

test('loads the Emporium file experience', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'My files' })).toBeVisible()
  await expect(page.getByText('Stored in the United Kingdom')).toBeVisible()
  await expect(page.getByText('Q3 roadmap.pdf')).toBeVisible()
})

test('switches to shared files', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /Shared/ }).click()
  await expect(page.getByRole('heading', { name: 'Shared' })).toBeVisible()
  await expect(page.getByText('Brand assets.zip')).toBeVisible()
})

test('search filters files', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Search files').fill('roadmap')
  await expect(page.getByText('Q3 roadmap.pdf')).toBeVisible()
  await expect(page.getByText('Regional architecture.md')).toHaveCount(0)
})
