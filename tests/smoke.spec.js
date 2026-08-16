import { expect, test } from '@playwright/test'
import { emporiumApi } from '../src/mockApi.js'

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

test('keeps the same name when rename is unchanged', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Actions for Regional architecture.md' }).click()
  await page.getByRole('button', { name: 'Rename' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Regional architecture.md', { exact: true })).toBeVisible()
  await expect(page.getByText('Regional architecture (2).md')).toHaveCount(0)
})

test('keeps the same name when moving within the same folder', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Actions for Regional architecture.md' }).click()
  await page.getByRole('button', { name: 'Move' }).click()
  await page.getByLabel('Destination').selectOption({ label: 'My files' })
  await page.getByRole('button', { name: 'Move', exact: true }).click()
  await expect(page.getByText('Regional architecture.md', { exact: true })).toBeVisible()
  await expect(page.getByText('Regional architecture (2).md')).toHaveCount(0)
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

test('queues and uploads multiple files', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: '↑ Upload' }).click()
  const input = page.locator('input[type="file"]')
  await input.setInputFiles([
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('notes') },
    { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('image') }
  ])
  await expect(page.getByText('notes.txt')).toBeVisible()
  await expect(page.getByText('photo.jpg')).toBeVisible()
  await page.getByRole('button', { name: 'Upload 2' }).click()
  await expect(page.getByText('2 files uploaded')).toBeVisible()
  await expect(page.getByText('notes.txt')).toBeVisible()
  await expect(page.getByText('photo.jpg')).toBeVisible()
})

test('shows duplicate upload conflict choices', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: '↑ Upload' }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'Q3 roadmap.pdf', mimeType: 'application/pdf', buffer: Buffer.from('replacement')
  })
  await expect(page.getByText(/existing file has the same name/i)).toBeVisible()
  await expect(page.getByLabel('Keep both and rename new files')).toBeChecked()
  await page.getByLabel('Replace existing files').check()
  await expect(page.getByLabel('Replace existing files')).toBeChecked()
})

test('removing a queued duplicate clears its conflict warning', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: '↑ Upload' }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'Q3 roadmap.pdf', mimeType: 'application/pdf', buffer: Buffer.from('replacement')
  })
  await expect(page.getByText(/existing file has the same name/i)).toBeVisible()
  await page.getByRole('button', { name: 'Remove Q3 roadmap.pdf' }).click()
  await expect(page.getByText(/existing file has the same name/i)).toHaveCount(0)
})

test('shows projected storage for queued uploads', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: '↑ Upload' }).click()
  const quotaPreview = page.locator('.quota-preview strong')
  const before = await quotaPreview.textContent()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'large.bin', mimeType: 'application/octet-stream', buffer: Buffer.alloc(16 * 1024 * 1024)
  })
  await expect(quotaPreview).not.toHaveText(before)
})

test('shares a file with a person and revokes access', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Actions for Q3 roadmap.pdf' }).click()
  await page.getByRole('button', { name: 'Share' }).click()
  await page.getByLabel('Person or organisation').selectOption('person-alex')
  await page.getByLabel('Permission').selectOption('editor')
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(page.getByText('Alex Morgan')).toBeVisible()
  await expect(page.getByText(/person · editor/)).toBeVisible()
  await page.getByRole('button', { name: 'Revoke Alex Morgan' }).click()
  await expect(page.getByText(/Access revoked for Alex Morgan/)).toBeVisible()
})

test('warns before sharing with an external organisation', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Actions for Regional architecture.md' }).click()
  await page.getByRole('button', { name: 'Share' }).click()
  await page.getByLabel('Person or organisation').selectOption('org-northstar')
  await expect(page.getByRole('alert')).toContainText('External sharing')
  await expect(page.getByRole('alert')).toContainText('does not move or replicate it')
})

test('distinguishes shared by you from shared with you', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /Shared/ }).click()
  await expect(page.getByText('Partner launch plan.pdf')).toBeVisible()
  await expect(page.getByText(/Shared with you · viewer/)).toBeVisible()
  await expect(page.getByText(/Shared by you/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Actions for Partner launch plan.pdf' }).click()
  await expect(page.getByRole('button', { name: 'Rename' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Move to Trash' })).toHaveCount(0)
})

test('shows and restores file versions without deleting history', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Actions for Q3 roadmap.pdf' }).click()
  await page.getByRole('button', { name: 'Version history' }).click()
  await expect(page.getByRole('dialog', { name: 'Q3 roadmap.pdf' })).toBeVisible()
  await expect(page.getByText('Version 3', { exact: true })).toBeVisible()
  await expect(page.getByText('Alex Morgan')).toBeVisible()
  await page.getByRole('button', { name: 'Restore version 2' }).click()
  await expect(page.getByText(/Version 2 restored as the latest version/)).toBeVisible()
  await expect(page.getByText('Version 4', { exact: true })).toBeVisible()
  await expect(page.getByText('Restored from version 2')).toBeVisible()
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible()
})

test('retained versions consume storage quota', async () => {
  const before = await emporiumApi.quota()
  await emporiumApi.restoreVersion('d1', 'd1-v2')
  const after = await emporiumApi.quota()
  expect(after.versionBytes).toBe(before.versionBytes + 2516582)
  expect(after.usedBytes).toBe(before.usedBytes + 2516582)
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