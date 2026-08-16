<script setup>
import { computed, onMounted, ref } from 'vue'
import { emporiumApi } from './mockApi'

const views = ['My files', 'Recent', 'Shared', 'Trash']
const activeView = ref('My files')
const storageSpace = ref('Personal')
const query = ref('')
const loading = ref(true)
const items = ref([])

async function loadView() {
  loading.value = true
  if (activeView.value === 'Recent') items.value = await emporiumApi.recent()
  else if (activeView.value === 'Shared') items.value = await emporiumApi.shared()
  else if (activeView.value === 'Trash') items.value = await emporiumApi.trash()
  else items.value = await emporiumApi.list()
  loading.value = false
}

async function changeView(view) {
  activeView.value = view
  await loadView()
}

async function mockUpload() {
  await emporiumApi.upload('New upload.txt')
  activeView.value = 'My files'
  await loadView()
}

const filteredItems = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return needle ? items.value.filter((item) => item.name.toLowerCase().includes(needle)) : items.value
})

onMounted(loadView)
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand-row">
        <div class="brand-mark">E</div>
        <div>
          <strong>Emporium</strong>
          <span>Regional storage</span>
        </div>
      </div>

      <button class="primary-action" @click="mockUpload">＋ Upload</button>

      <nav aria-label="Storage navigation">
        <button
          v-for="view in views"
          :key="view"
          :class="['nav-item', { active: activeView === view }]"
          @click="changeView(view)"
        >
          <span>{{ view === 'My files' ? '▣' : view === 'Recent' ? '◷' : view === 'Shared' ? '♢' : '⌫' }}</span>
          {{ view }}
        </button>
      </nav>

      <div class="storage-card">
        <div class="storage-card__row"><strong>Storage</strong><span>24%</span></div>
        <div class="meter"><span /></div>
        <small>24 GB of 100 GB used</small>
      </div>
    </aside>

    <main>
      <header class="topbar">
        <label class="search">
          <span>⌕</span>
          <input v-model="query" aria-label="Search files" placeholder="Search Emporium" />
        </label>
        <div class="authority-pill"><span class="status-dot" /> UK authority</div>
        <button class="avatar" aria-label="Account">SC</button>
      </header>

      <section class="content">
        <div class="heading-row">
          <div>
            <p class="eyebrow">{{ storageSpace }} space</p>
            <h1>{{ activeView }}</h1>
          </div>
          <div class="space-switch" role="group" aria-label="Storage space">
            <button :class="{ active: storageSpace === 'Personal' }" @click="storageSpace = 'Personal'">Personal</button>
            <button :class="{ active: storageSpace === 'KiTech Software' }" @click="storageSpace = 'KiTech Software'">KiTech Software</button>
          </div>
        </div>

        <div class="region-banner">
          <div>
            <strong>Stored in the United Kingdom</strong>
            <p>Your authoritative files and metadata remain in the UK region.</p>
          </div>
          <span>UK</span>
        </div>

        <div class="toolbar">
          <button class="secondary-action">＋ New folder</button>
          <button class="ghost-action">⇅ Sort</button>
          <button class="ghost-action">▦ View</button>
        </div>

        <div class="file-panel">
          <div class="file-head">
            <span>Name</span><span>Owner</span><span>Modified</span><span>Region</span><span></span>
          </div>

          <div v-if="loading" class="empty-state">Loading files…</div>
          <div v-else-if="filteredItems.length === 0" class="empty-state">
            <strong>No files here</strong>
            <span>{{ query ? 'Try another search.' : 'This view is currently empty.' }}</span>
          </div>

          <button v-for="item in filteredItems" v-else :key="item.id" class="file-row">
            <span class="file-name">
              <span :class="['file-icon', item.type]">{{ item.type === 'folder' ? '▰' : '▤' }}</span>
              <span><strong>{{ item.name }}</strong><small v-if="item.size">{{ item.size }}</small></span>
            </span>
            <span>{{ item.owner }}</span>
            <span>{{ item.modified }}</span>
            <span><span class="region-chip">{{ item.region }}</span></span>
            <span class="more">•••</span>
          </button>
        </div>
      </section>
    </main>
  </div>
</template>
