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

async function mockUpload() {
  await emporiumApi.upload('New upload.txt', currentFolderId.value)
  activeView.value = 'My files'
  await loadView()
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

function closeDialog() {
  dialog.value = null
  dialogValue.value = ''
}

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

onMounted(loadView)
</script>

<template>
  <div class="app-shell" @click.self="menuItem = null">
    <aside class="sidebar">
      <div class="brand-row">
        <div class="brand-mark">E</div>
        <div><strong>Emporium</strong><span>Regional storage</span></div>
      </div>

      <button class="primary-action" @click="mockUpload">＋ Upload</button>

      <nav aria-label="Storage navigation">
        <button v-for="view in views" :key="view" :class="['nav-item', { active: activeView === view }]" @click="changeView(view)">
          <span>{{ view === 'My files' ? '▣' : view === 'Recent' ? '◷' : view === 'Shared' ? '♢' : '⌫' }}</span>{{ view }}
        </button>
      </nav>

      <div class="storage-card">
        <div class="storage-card__row"><strong>Storage</strong><span>24%</span></div>
        <div class="meter"><span /></div><small>24 GB of 100 GB used</small>
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

        <div class="region-banner">
          <div><strong>Stored in the United Kingdom</strong><p>Your authoritative files and metadata remain in the UK region.</p></div><span>UK</span>
        </div>

        <nav v-if="activeView === 'My files'" class="breadcrumbs" aria-label="Folder path">
          <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id ?? 'root'">
            <span v-if="index">/</span><button @click="navigateTo(index)">{{ crumb.name }}</button>
          </template>
        </nav>

        <div class="toolbar">
          <button class="secondary-action" @click="openDialog('new-folder')">＋ New folder</button>
          <button class="ghost-action">⇅ Sort</button><button class="ghost-action">▦ View</button>
        </div>

        <p v-if="statusMessage" class="status-message" role="status">{{ statusMessage }}</p>

        <div class="file-panel">
          <div class="file-head"><span>Name</span><span>Owner</span><span>Modified</span><span>Region</span><span></span></div>
          <div v-if="loading" class="empty-state">Loading files…</div>
          <div v-else-if="filteredItems.length === 0" class="empty-state"><strong>No files here</strong><span>{{ query ? 'Try another search.' : 'This view is currently empty.' }}</span></div>

          <div v-for="item in filteredItems" v-else :key="item.id" class="file-row" @dblclick="openFolder(item)">
            <button class="file-main" @click="openFolder(item)">
              <span class="file-name"><span :class="['file-icon', item.type]">{{ item.type === 'folder' ? '▰' : '▤' }}</span><span><strong>{{ item.name }}</strong><small v-if="item.size">{{ item.size }}</small></span></span>
            </button>
            <span>{{ item.owner }}</span><span>{{ item.modified }}</span><span><span class="region-chip">{{ item.region }}</span></span>
            <div class="row-actions">
              <button class="more" :aria-label="`Actions for ${item.name}`" @click.stop="menuItem = menuItem?.id === item.id ? null : item">•••</button>
              <div v-if="menuItem?.id === item.id" class="context-menu">
                <template v-if="activeView !== 'Trash'">
                  <button v-if="item.type === 'folder' && activeView === 'My files'" @click="openFolder(item)">Open</button>
                  <button @click="openDialog('rename', item)">Rename</button>
                  <button @click="openDialog('move', item)">Move</button>
                  <button @click="openDialog('copy', item)">Copy</button>
                  <button class="danger" @click="removeItem(item)">Move to Trash</button>
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
  </div>
</template>
