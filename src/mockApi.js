const items = [
  { id: 'f1', parentId: null, type: 'folder', name: 'Projects', modified: 'Today, 17:42', owner: 'You', region: 'UK', shared: false },
  { id: 'f2', parentId: null, type: 'folder', name: 'Finance', modified: 'Yesterday', owner: 'KiTech Software', region: 'UK', shared: true },
  { id: 'f3', parentId: null, type: 'folder', name: 'Design', modified: '12 Aug 2026', owner: 'You', region: 'UK', shared: true },
  { id: 'd1', parentId: null, type: 'file', name: 'Q3 roadmap.pdf', modified: 'Today, 14:08', owner: 'You', region: 'UK', shared: false, size: '2.4 MB', bytes: 2516582 },
  { id: 'd2', parentId: null, type: 'file', name: 'Brand assets.zip', modified: '14 Aug 2026', owner: 'KiTech Software', region: 'UK', shared: true, size: '18.9 MB', bytes: 19818086 },
  { id: 'd3', parentId: null, type: 'file', name: 'Regional architecture.md', modified: '13 Aug 2026', owner: 'You', region: 'UK', shared: false, size: '84 KB', bytes: 86016 },
  { id: 'p1', parentId: 'f1', type: 'file', name: 'Emporium brief.md', modified: 'Today, 16:10', owner: 'You', region: 'UK', shared: false, size: '18 KB', bytes: 18432 },
  { id: 'p2', parentId: 'f1', type: 'folder', name: 'Research', modified: 'Today, 15:30', owner: 'You', region: 'UK', shared: false },
  { id: 'r1', parentId: 'p2', type: 'file', name: 'Storage notes.txt', modified: 'Today, 15:12', owner: 'You', region: 'UK', shared: false, size: '6 KB', bytes: 6144 }
]

const trash = []
const QUOTA_BYTES = 100 * 1024 * 1024 * 1024
const BASE_USED_BYTES = 24 * 1024 * 1024 * 1024
const wait = (value, ms = 80) => new Promise((resolve) => setTimeout(() => resolve(value), ms))
const clone = (value) => structuredClone(value)
const now = () => 'Just now'

function requireItem(id) {
  const item = items.find((entry) => entry.id === id)
  if (!item) throw new Error('Item not found')
  return item
}

function childrenOf(parentId) { return items.filter((item) => item.parentId === parentId) }

function descendantIds(folderId) {
  const ids = []
  const visit = (id) => {
    for (const child of childrenOf(id)) {
      ids.push(child.id)
      if (child.type === 'folder') visit(child.id)
    }
  }
  visit(folderId)
  return ids
}

function uniqueName(name, parentId) {
  const existing = new Set(childrenOf(parentId).map((item) => item.name.toLowerCase()))
  if (!existing.has(name.toLowerCase())) return name
  const dot = name.lastIndexOf('.')
  const hasExt = dot > 0
  const base = hasExt ? name.slice(0, dot) : name
  const ext = hasExt ? name.slice(dot) : ''
  let i = 2
  while (existing.has(`${base} (${i})${ext}`.toLowerCase())) i += 1
  return `${base} (${i})${ext}`
}

function copyRecursive(sourceId, parentId) {
  const source = requireItem(sourceId)
  const copy = { ...clone(source), id: crypto.randomUUID(), parentId, name: uniqueName(source.name, parentId), modified: now() }
  items.unshift(copy)
  if (source.type === 'folder') for (const child of childrenOf(sourceId)) copyRecursive(child.id, copy.id)
  return copy
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function uploadedBytes() {
  return items.filter((item) => item.type === 'file' && item.uploaded).reduce((sum, item) => sum + (item.bytes || 0), 0)
}

export const emporiumApi = {
  async list(parentId = null) { return wait(clone(childrenOf(parentId))) },
  async get(id) { return wait(clone(requireItem(id))) },
  async recent() { return wait(clone(items.slice(0, 6))) },
  async shared() { return wait(clone(items.filter((item) => item.shared))) },
  async trash() { return wait(clone(trash)) },
  async quota() {
    const usedBytes = BASE_USED_BYTES + uploadedBytes()
    return wait({ usedBytes, quotaBytes: QUOTA_BYTES, percent: Math.min(100, Math.round((usedBytes / QUOTA_BYTES) * 100)) }, 30)
  },
  async conflicts(files, parentId = null) {
    const existing = new Set(childrenOf(parentId).map((item) => item.name.toLowerCase()))
    return wait(files.filter((file) => existing.has(file.name.toLowerCase())).map((file) => file.name), 30)
  },

  async createFolder(name, parentId = null) {
    const folder = { id: crypto.randomUUID(), parentId, type: 'folder', name: uniqueName(name || 'New folder', parentId), modified: now(), owner: 'You', region: 'UK', shared: false }
    items.unshift(folder)
    return wait(clone(folder))
  },

  async rename(id, name) {
    const item = requireItem(id)
    item.name = uniqueName(name.trim() || item.name, item.parentId)
    item.modified = now()
    return wait(clone(item))
  },

  async move(id, parentId = null) {
    const item = requireItem(id)
    if (id === parentId) throw new Error('Cannot move a folder into itself')
    if (item.type === 'folder' && descendantIds(id).includes(parentId)) throw new Error('Cannot move a folder into one of its descendants')
    item.parentId = parentId
    item.name = uniqueName(item.name, parentId)
    item.modified = now()
    return wait(clone(item))
  },

  async copy(id, parentId = null) { return wait(clone(copyRecursive(id, parentId))) },

  async remove(id) {
    const root = requireItem(id)
    const ids = new Set([id, ...(root.type === 'folder' ? descendantIds(id) : [])])
    const removed = []
    for (let i = items.length - 1; i >= 0; i -= 1) if (ids.has(items[i].id)) removed.push(...items.splice(i, 1))
    trash.unshift(...removed.map((item) => ({ ...item, deletedAt: now() })))
    return wait(clone(root))
  },

  async restore(id) {
    const root = trash.find((item) => item.id === id)
    if (!root) throw new Error('Trashed item not found')
    const ids = new Set([id])
    if (root.type === 'folder') {
      let changed = true
      while (changed) {
        changed = false
        for (const item of trash) if (ids.has(item.parentId) && !ids.has(item.id)) { ids.add(item.id); changed = true }
      }
    }
    const restored = []
    for (let i = trash.length - 1; i >= 0; i -= 1) {
      if (ids.has(trash[i].id)) {
        const { deletedAt, ...item } = trash.splice(i, 1)[0]
        restored.push(item)
      }
    }
    for (const item of restored) items.unshift(item)
    return wait(clone(restored.find((item) => item.id === id)))
  },

  async uploadFile(file, parentId = null, strategy = 'rename') {
    const existing = childrenOf(parentId).find((item) => item.name.toLowerCase() === file.name.toLowerCase())
    let name = file.name
    if (existing && strategy === 'replace') {
      const index = items.findIndex((item) => item.id === existing.id)
      items.splice(index, 1)
    } else if (existing) {
      name = uniqueName(file.name, parentId)
    }
    const entry = {
      id: crypto.randomUUID(), parentId, type: 'file', name, modified: now(), owner: 'You', region: 'UK', shared: false,
      size: formatBytes(file.size || 0), bytes: file.size || 0, uploaded: true
    }
    items.unshift(entry)
    return wait(clone(entry), 120)
  },

  async upload(name = 'Untitled upload', parentId = null) {
    return this.uploadFile({ name, size: 0 }, parentId, 'rename')
  },

  async folders() { return wait(clone(items.filter((item) => item.type === 'folder'))) }
}
