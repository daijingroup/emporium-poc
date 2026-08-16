import { expect, test } from '@playwright/test'

test('loads the Emporium file experience', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'My files' })).toBeVisible()
  await expect(page.getByText('Stored in the United Kingdom')).toBeVisible()
  await expect(page.getByText('Q3 roadmap.pdf')).toBeVisible()
})

test('opens folders and navigates breadcrumbs', async ({ page }) => {
  await page.goto('./')
  await page.getByText('Projects', { exact: true }).click()
  await expect(page.getByText('Emporium brief.md')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Folder path' }).getByRole('button', { name: 'Projects' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Folder path' }).getByRole('button', { name: 'My files' }).click()
  await expect(page.getByText('Q3 roadmap.pdf')).toBeVisible()
})

test('creates and renames a folder', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /New folder/ }).click()
  await page.getByLabel('Name').fill('Planning')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Planning', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Actions for Planning' }).click()
  await page.getByRole('button', { name: 'Rename' }).click()
  await page.getByLabel('Name').fill('Planning 2027')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Planning 2027', { exact: true })).toBeVisible()
})

test('moves an item to trash and restores it', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Actions for Q3 roadmap.pdf' }).click()
  await page.getByRole('button', { name: 'Move to Trash' }).click()
  await expect(page.getByText('Q3 roadmap.pdf')).toHaveCount(0)

  await page.getByRole('button', { name: /Trash/ }).click()
  await expect(page.getByText('Q3 roadmap.pdf')).toBeVisible()
  await page.getByRole('button', { name: 'Actions for Q3 roadmap.pdf' }).click()
  await page.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByText('Q3 roadmap.pdf')).toHaveCount(0)

  await page.getByRole('button', { name: /My files/ }).click()
  await expect(page.getByText('Q3 roadmap.pdf')).toBeVisible()
})

test('offers move and copy actions', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Actions for Regional architecture.md' }).click()
  await page.getByRole('button', { name: 'Copy' }).click()
  await page.getByLabel('Destination').selectOption({ label: 'Projects' })
  await page.getByRole('button', { name: 'Copy' }).click()
  await page.getByText('Projects', { exact: true }).click()
  await expect(page.getByText('Regional architecture.md')).toBeVisible()
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
