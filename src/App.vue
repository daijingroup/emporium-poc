<script setup>
import { computed, onMounted, ref } from 'vue'
import { emporiumApi } from './mockApi'

const views = ['My files', 'Recent', 'Shared', 'Trash']
const activeView = ref('My files')
const storageSpace = ref('Personal')
const query = ref('')
const loading = ref(true)
const items = ref([])
const currentFolderId = ref(null)
const breadcrumbs = ref([{ id: null, name: 'My files' }])
const menuItem = ref(null)
const dialog = ref(null)
const dialogValue = ref('')
const folderChoices = ref([])
const statusMessage = ref('')
const uploadOpen = ref(false)
const uploadQueue = ref([])
const uploadConflicts = ref([])
const conflictStrategy = ref('rename')
const dragging = ref(false)
const quota = ref({ usedBytes: 0, quotaBytes: 100 * 1024 ** 3, percent: 24 })
const fileInput = ref(null)
const shareOpen = ref(false)
const shareItem = ref(null)
const shareTargets = ref([])
const shareTargetId = ref('')
const sharePermission = ref('viewer')
const shareEntries = ref([])
const versionOpen = ref(false)
const versionItem = ref(null)
const versionEntries = ref([])

function formatGb(bytes) { return `${(bytes / 1024 ** 3).toFixed(bytes % 1024 ** 3 === 0 ? 0 : 1)} GB` }
async function refreshQuota() { quota.value = await emporiumApi.quota() }

async function loadView() {
  loading.value = true
  menuItem.value = null
  if (activeView.value === 'Recent') items.value = await emporiumApi.recent()
  else if (activeView.value === 'Shared') items.value = await emporiumApi.shared()
  else if (activeView.value === 'Trash') items.value = await emporiumApi.trash()
  else items.value = await emporiumApi.list(currentFolderId.value)
  loading.value = false
}

async function changeView(view) {
  activeView.value = view
  if (view === 'My files') {
    currentFolderId.value = null
    breadcrumbs.value = [{ id: null, name: 'My files' }]
  }
  await loadView()
}

async function openFolder(item) {
  if (activeView.value !== 'My files' || item.type !== 'folder') return
  currentFolderId.value = item.id
  breadcrumbs.value.push({ id: item.id, name: item.name })
  await loadView()
}

async function navigateTo(index) {
  const crumb = breadcrumbs.value[index]
  currentFolderId.value = crumb.id
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1)
  activeView.value = 'My files'
  await loadView()
}

function openUpload() {
  uploadOpen.value = true
  uploadQueue.value = []
  uploadConflicts.value = []
  conflictStrategy.value = 'rename'
}

function closeUpload() {
  if (uploadQueue.value.some((entry) => entry.status === 'uploading')) return
  uploadOpen.value = false
  dragging.value = false
}

async function addFiles(fileList) {
  const files = Array.from(fileList || [])
  if (!files.length) return
  const conflicts = await emporiumApi.conflicts(files, currentFolderId.value)
  uploadConflicts.value = [...new Set([...uploadConflicts.value, ...conflicts])]
  for (const file of files) uploadQueue.value.push({ id: crypto.randomUUID(), file, name: file.name, size: file.size, progress: 0, status: 'ready' })
}

function onDrop(event) { dragging.value = false; addFiles(event.dataTransfer.files) }
function removeQueued(id) { uploadQueue.value = uploadQueue.value.filter((entry) => entry.id !== id) }

async function startUploads() {
  const queued = uploadQueue.value.filter((entry) => entry.status === 'ready')
  for (const entry of queued) {
    entry.status = 'uploading'
    for (const progress of [18, 43, 71, 92]) {
      entry.progress = progress
      await new Promise((resolve) => setTimeout(resolve, 70))
    }
    await emporiumApi.uploadFile(entry.file, currentFolderId.value, conflictStrategy.value)
    entry.progress = 100
    entry.status = 'complete'
  }
  statusMessage.value = `${queued.length} ${queued.length === 1 ? 'file' : 'files'} uploaded`
  activeView.value = 'My files'
  await Promise.all([loadView(), refreshQuota()])
}

async function openShare(item) {
  menuItem.value = null
  shareItem.value = item
  shareTargetId.value = ''
  sharePermission.value = 'viewer'
  const [targets, entries] = await Promise.all([emporiumApi.shareTargets(), emporiumApi.getShares(item.id)])
  shareTargets.value = targets
  shareEntries.value = entries
  shareOpen.value = true
}

function closeShare() {
  shareOpen.value = false
  shareItem.value = null
  shareTargetId.value = ''
  shareEntries.value = []
}

async function submitShare() {
  if (!shareItem.value || !shareTargetId.value) return
  shareEntries.value = await emporiumApi.share(shareItem.value.id, shareTargetId.value, sharePermission.value)
  statusMessage.value = `${shareItem.value.name} shared`
  await loadView()
}

async function revokeShare(entry) {
  if (!shareItem.value) return
  shareEntries.value = await emporiumApi.revokeShare(shareItem.value.id, entry.id)
  statusMessage.value = `Access revoked for ${entry.name}`
  await loadView()
}

async function openVersionHistory(item) {
  menuItem.value = null
  versionItem.value = item
  versionEntries.value = await emporiumApi.versions(item.id)
  versionOpen.value = true
}

function closeVersionHistory() {
  versionOpen.value = false
  versionItem.value = null
  versionEntries.value = []
}

async function restoreVersion(version) {
  if (!versionItem.value || version.current) return
  const result = await emporiumApi.restoreVersion(versionItem.value.id, version.id)
  versionItem.value = result.item
  versionEntries.value = result.versions
  statusMessage.value = `Version ${version.number} restored as the latest version`
  await Promise.all([loadView(), refreshQuota()])
}

function openDialog(type, item = null) {
  menuItem.value = null
  dialog.value = { type, item }
  if (type === 'new-folder') dialogValue.value = 'New folder'
  else if (type === 'rename') dialogValue.value = item.name
  else dialogValue.value = ''
  if (type === 'move' || type === 'copy') {
    emporiumApi.folders().then((folders) => {
      folderChoices.value = [{ id: null, name: 'My files' }, ...folders.filter((folder) => folder.id !== item.id)]
    })
  }
}

function closeDialog() { dialog.value = null; dialogValue.value = '' }

async function submitDialog() {
  if (!dialog.value) return
  const { type, item } = dialog.value
  if (type === 'new-folder') await emporiumApi.createFolder(dialogValue.value, currentFolderId.value)
  if (type === 'rename') await emporiumApi.rename(item.id, dialogValue.value)
  if (type === 'move') await emporiumApi.move(item.id, dialogValue.value || null)
  if (type === 'copy') await emporiumApi.copy(item.id, dialogValue.value || null)
  statusMessage.value = type === 'new-folder' ? 'Folder created' : `${item.name} updated`
  closeDialog()
  await loadView()
}

async function removeItem(item) {
  menuItem.value = null
  await emporiumApi.remove(item.id)
  statusMessage.value = `${item.name} moved to Trash`
  await loadView()
}

async function restoreItem(item) {
  menuItem.value = null
  await emporiumApi.restore(item.id)
  statusMessage.value = `${item.name} restored`
  await loadView()
}

const filteredItems = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return needle ? items.value.filter((item) => item.name.toLowerCase().includes(needle)) : items.value
})
const pendingUploads = computed(() => uploadQueue.value.filter((entry) => entry.status !== 'complete').length)
const selectedShareTarget = computed(() => shareTargets.value.find((entry) => entry.id === shareTargetId.value))

onMounted(() => Promise.all([loadView(), refreshQuota()]))
</script>

<template>
  <div class="app-shell" @click.self="menuItem = null">
    <aside class="sidebar">
      <div class="brand-row"><div class="brand-mark">E</div><div><strong>Emporium</strong><span>Regional storage</span></div></div>
      <button class="primary-action" @click="openUpload">＋ Upload</button>
      <nav aria-label="Storage navigation">
        <button v-for="view in views" :key="view" :class="['nav-item', { active: activeView === view }]" @click="changeView(view)">
          <span>{{ view === 'My files' ? '▣' : view === 'Recent' ? '◷' : view === 'Shared' ? '♢' : '⌫' }}</span>{{ view }}
        </button>
      </nav>
      <div class="storage-card">
        <div class="storage-card__row"><strong>Storage</strong><span>{{ quota.percent }}%</span></div>
        <div class="meter"><span :style="{ width: `${quota.percent}%` }" /></div>
        <small>{{ formatGb(quota.usedBytes) }} of {{ formatGb(quota.quotaBytes) }} used</small>
      </div>
    </aside>

    <main>
      <header class="topbar">
        <label class="search"><span>⌕</span><input v-model="query" aria-label="Search files" placeholder="Search Emporium" /></label>
        <div class="authority-pill"><span class="status-dot" /> UK authority</div>
        <button class="avatar" aria-label="Account">SC</button>
      </header>

      <section class="content">
        <div class="heading-row">
          <div><p class="eyebrow">{{ storageSpace }} space</p><h1>{{ activeView }}</h1></div>
          <div class="space-switch" role="group" aria-label="Storage space">
            <button :class="{ active: storageSpace === 'Personal' }" @click="storageSpace = 'Personal'">Personal</button>
            <button :class="{ active: storageSpace === 'KiTech Software' }" @click="storageSpace = 'KiTech Software'">KiTech Software</button>
          </div>
        </div>

        <div class="region-banner"><div><strong>Stored in the United Kingdom</strong><p>Your authoritative files and metadata remain in the UK region.</p></div><span>UK</span></div>

        <nav v-if="activeView === 'My files'" class="breadcrumbs" aria-label="Folder path">
          <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id ?? 'root'"><span v-if="index">/</span><button @click="navigateTo(index)">{{ crumb.name }}</button></template>
        </nav>

        <div class="toolbar">
          <button class="secondary-action" @click="openUpload">↑ Upload</button>
          <button class="secondary-action" @click="openDialog('new-folder')">＋ New folder</button>
          <button class="ghost-action">⇅ Sort</button><button class="ghost-action">▦ View</button>
        </div>

        <p v-if="statusMessage" class="status-message" role="status">{{ statusMessage }}</p>

        <div class="file-panel">
          <div class="file-head"><span>Name</span><span>Owner</span><span>Modified</span><span>Region</span><span></span></div>
          <div v-if="loading" class="empty-state">Loading files…</div>
          <div v-else-if="filteredItems.length === 0" class="empty-state"><strong>No files here</strong><span>{{ query ? 'Try another search.' : 'This view is currently empty.' }}</span></div>
          <div v-for="item in filteredItems" v-else :key="item.id" class="file-row" @dblclick="openFolder(item)">
            <button class="file-main" @click="openFolder(item)"><span class="file-name"><span :class="['file-icon', item.type]">{{ item.type === 'folder' ? '▰' : '▤' }}</span><span><strong>{{ item.name }}</strong><small v-if="item.size">{{ item.size }}<template v-if="item.sharedWithMe"> · Shared with you · {{ item.permission }}</template><template v-else-if="item.shared"> · Shared by you</template></small></span></span></button>
            <span>{{ item.owner }}</span><span>{{ item.modified }}</span><span><span class="region-chip">{{ item.region }}</span></span>
            <div class="row-actions">
              <button class="more" :aria-label="`Actions for ${item.name}`" @click.stop="menuItem = menuItem?.id === item.id ? null : item">•••</button>
              <div v-if="menuItem?.id === item.id" class="context-menu">
                <template v-if="activeView !== 'Trash'">
                  <button v-if="item.type === 'folder' && activeView === 'My files'" @click="openFolder(item)">Open</button>
                  <button v-if="!item.sharedWithMe" @click="openShare(item)">Share</button>
                  <button v-if="item.type === 'file' && !item.sharedWithMe" @click="openVersionHistory(item)">Version history</button>
                  <button v-if="!item.sharedWithMe" @click="openDialog('rename', item)">Rename</button><button v-if="!item.sharedWithMe" @click="openDialog('move', item)">Move</button><button v-if="!item.sharedWithMe" @click="openDialog('copy', item)">Copy</button>
                  <button v-if="!item.sharedWithMe" class="danger" @click="removeItem(item)">Move to Trash</button>
                </template>
                <button v-else @click="restoreItem(item)">Restore</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <div v-if="dialog" class="dialog-backdrop" @click.self="closeDialog">
      <form class="dialog" @submit.prevent="submitDialog">
        <h2>{{ dialog.type === 'new-folder' ? 'Create folder' : dialog.type === 'rename' ? 'Rename item' : dialog.type === 'move' ? 'Move item' : 'Copy item' }}</h2>
        <label v-if="dialog.type === 'new-folder' || dialog.type === 'rename'">Name<input v-model="dialogValue" autofocus /></label>
        <label v-else>Destination<select v-model="dialogValue"><option v-for="folder in folderChoices" :key="folder.id ?? 'root'" :value="folder.id ?? ''">{{ folder.name }}</option></select></label>
        <div class="dialog-actions"><button type="button" class="ghost-action" @click="closeDialog">Cancel</button><button class="secondary-action" type="submit">{{ dialog.type === 'move' ? 'Move' : dialog.type === 'copy' ? 'Copy' : 'Save' }}</button></div>
      </form>
    </div>

    <div v-if="shareOpen" class="dialog-backdrop" @click.self="closeShare">
      <form class="dialog" @submit.prevent="submitShare">
        <div><p class="eyebrow">Sharing</p><h2>Share {{ shareItem?.name }}</h2></div>
        <label>Person or organisation
          <select v-model="shareTargetId" aria-label="Person or organisation">
            <option value="" disabled>Select a recipient</option>
            <option v-for="target in shareTargets" :key="target.id" :value="target.id">{{ target.name }} — {{ target.detail }}</option>
          </select>
        </label>
        <label>Permission
          <select v-model="sharePermission" aria-label="Permission"><option value="viewer">Viewer</option><option value="editor">Editor</option></select>
        </label>
        <div v-if="selectedShareTarget?.external" class="conflict-card" role="alert">
          <strong>External sharing</strong><p>{{ selectedShareTarget.name }} is outside your organisation. The file remains authoritative in the UK region; sharing grants access and does not move or replicate it.</p>
        </div>
        <div v-if="shareEntries.length" class="upload-list" aria-label="Current access">
          <article v-for="entry in shareEntries" :key="entry.id" class="upload-item">
            <div class="upload-item__top"><div><strong>{{ entry.name }}</strong><span>{{ entry.kind }} · {{ entry.permission }}<template v-if="entry.external"> · external</template></span></div><button type="button" class="ghost-action" :aria-label="`Revoke ${entry.name}`" @click="revokeShare(entry)">Revoke</button></div>
          </article>
        </div>
        <div class="dialog-actions"><button type="button" class="ghost-action" @click="closeShare">Close</button><button class="secondary-action" type="submit" :disabled="!shareTargetId">Share</button></div>
      </form>
    </div>

    <div v-if="versionOpen" class="dialog-backdrop" @click.self="closeVersionHistory">
      <section class="version-dialog" role="dialog" aria-modal="true" aria-labelledby="version-title">
        <div class="upload-header"><div><p class="eyebrow">Version history</p><h2 id="version-title">{{ versionItem?.name }}</h2></div><button class="icon-button" aria-label="Close version history" @click="closeVersionHistory">×</button></div>
        <p class="dialog-copy">Restoring an older version creates a new latest version. Existing history is retained.</p>
        <div class="version-list" aria-label="File versions">
          <article v-for="version in versionEntries" :key="version.id" class="version-item">
            <div><div class="version-title"><strong>Version {{ version.number }}</strong><span v-if="version.current" class="current-chip">Current</span></div><p>{{ version.createdAt }} · {{ version.modifiedBy }} · {{ version.size }}</p><small v-if="version.restoredFrom">Restored from version {{ version.restoredFrom }}</small></div>
            <button v-if="!version.current" class="ghost-action" :aria-label="`Restore version ${version.number}`" @click="restoreVersion(version)">Restore</button>
          </article>
        </div>
        <div class="dialog-actions"><button class="ghost-action" @click="closeVersionHistory">Close</button></div>
      </section>
    </div>

    <div v-if="uploadOpen" class="dialog-backdrop upload-backdrop" @click.self="closeUpload">
      <section class="upload-dialog" role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <div class="upload-header"><div><p class="eyebrow">{{ breadcrumbs.at(-1)?.name }}</p><h2 id="upload-title">Upload files</h2></div><button class="icon-button" aria-label="Close upload" @click="closeUpload">×</button></div>
        <input ref="fileInput" class="sr-only" type="file" multiple @change="addFiles($event.target.files)" />
        <button class="drop-zone" :class="{ dragging }" @click="fileInput.click()" @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="onDrop">
          <strong>Drop files here</strong><span>or choose files from this device</span><small>Multiple files are supported</small>
        </button>
        <div v-if="uploadConflicts.length" class="conflict-card">
          <strong>{{ uploadConflicts.length }} existing {{ uploadConflicts.length === 1 ? 'file has' : 'files have' }} the same name</strong>
          <p>{{ uploadConflicts.join(', ') }}</p>
          <label><input v-model="conflictStrategy" type="radio" value="rename" /> Keep both and rename new files</label>
          <label><input v-model="conflictStrategy" type="radio" value="replace" /> Replace existing files</label>
        </div>
        <div v-if="uploadQueue.length" class="upload-list" aria-label="Upload queue">
          <article v-for="entry in uploadQueue" :key="entry.id" class="upload-item">
            <div class="upload-item__top"><div><strong>{{ entry.name }}</strong><span>{{ (entry.size / 1024 ** 2).toFixed(1) }} MB</span></div><button v-if="entry.status === 'ready'" class="icon-button" :aria-label="`Remove ${entry.name}`" @click="removeQueued(entry.id)">×</button><span v-else>{{ entry.status === 'complete' ? 'Done' : `${entry.progress}%` }}</span></div>
            <div class="upload-progress"><span :style="{ width: `${entry.progress}%` }" /></div>
          </article>
        </div>
        <div class="quota-preview"><span>Storage after upload</span><strong>{{ formatGb(quota.usedBytes) }} / {{ formatGb(quota.quotaBytes) }}</strong></div>
        <div class="dialog-actions"><button class="ghost-action" :disabled="uploadQueue.some((entry) => entry.status === 'uploading')" @click="closeUpload">Cancel</button><button class="secondary-action" :disabled="!pendingUploads || uploadQueue.some((entry) => entry.status === 'uploading')" @click="startUploads">Upload {{ pendingUploads || '' }}</button></div>
      </section>
    </div>
  </div>
</template>
