const items = [
  { id: 'f1', parentId: null, type: 'folder', name: 'Projects', modified: 'Today, 17:42', owner: 'You', region: 'UK', shared: false },
  { id: 'f2', parentId: null, type: 'folder', name: 'Finance', modified: 'Yesterday', owner: 'KiTech Software', region: 'UK', shared: true },
  { id: 'f3', parentId: null, type: 'folder', name: 'Design', modified: '12 Aug 2026', owner: 'You', region: 'UK', shared: true },
  { id: 'd1', parentId: null, type: 'file', name: 'Q3 roadmap.pdf', modified: 'Today, 14:08', owner: 'You', region: 'UK', shared: false, size: '2.4 MB', bytes: 2516582 },
  { id: 'd2', parentId: null, type: 'file', name: 'Brand assets.zip', modified: '14 Aug 2026', owner: 'KiTech Software', region: 'UK', shared: true, size: '18.9 MB', bytes: 19818086 },
  { id: 'd3', parentId: null, type: 'file', name: 'Regional architecture.md', modified: '13 Aug 2026', owner: 'You', region: 'UK', shared: false, size: '84 KB', bytes: 86016 },
  { id: 'p1', parentId: 'f1', type: 'file', name: 'Emporium brief.md', modified: 'Today, 16:10', owner: 'You', region: 'UK', shared: false, size: '18 KB', bytes: 18432 },
  { id: 'p2', parentId: 'f1', type: 'folder', name: 'Research', modified: 'Today, 15:30', owner: 'You', region: 'UK', shared: false },
  { id: 'r1', parentId: 'p2', type: 'file', name: 'Storage notes.txt', modified: 'Today, 15:12', owner: 'You', region: 'UK', shared: false, size: '6 KB', bytes: 6144 },
  { id: 'in1', parentId: null, type: 'file', name: 'Partner launch plan.pdf', modified: 'Today, 11:20', owner: 'Northstar Labs', region: 'UK', shared: true, sharedWithMe: true, permission: 'viewer', size: '1.8 MB', bytes: 1887437 }
]

const trash = []
const shares = {
  f2: [{ id: 's1', targetId: 'org-kitech', name: 'KiTech Software', kind: 'organisation', permission: 'editor', external: false }],
  f3: [{ id: 's2', targetId: 'person-alex', name: 'Alex Morgan', kind: 'person', permission: 'viewer', external: false }],
  d2: [{ id: 's3', targetId: 'org-kitech', name: 'KiTech Software', kind: 'organisation', permission: 'editor', external: false }]
}
const shareTargets = [
  { id: 'person-alex', name: 'Alex Morgan', detail: 'alex@kitechsoftware.uk', kind: 'person', external: false },
  { id: 'person-jordan', name: 'Jordan Lee', detail: 'jordan@kitechsoftware.uk', kind: 'person', external: false },
  { id: 'org-kitech', name: 'KiTech Software', detail: 'Organisation', kind: 'organisation', external: false },
  { id: 'org-northstar', name: 'Northstar Labs', detail: 'External organisation', kind: 'organisation', external: true }
]
const versions = {
  d1: [
    { id: 'd1-v3', number: 3, createdAt: 'Today, 14:08', modifiedBy: 'You', size: '2.4 MB', bytes: 2516582, current: true },
    { id: 'd1-v2', number: 2, createdAt: '14 Aug 2026, 18:32', modifiedBy: 'Alex Morgan', size: '2.3 MB', bytes: 2411724, current: false },
    { id: 'd1-v1', number: 1, createdAt: '12 Aug 2026, 09:17', modifiedBy: 'You', size: '2.1 MB', bytes: 2202009, current: false }
  ],
  d3: [
    { id: 'd3-v2', number: 2, createdAt: '13 Aug 2026, 16:21', modifiedBy: 'You', size: '84 KB', bytes: 86016, current: true },
    { id: 'd3-v1', number: 1, createdAt: '11 Aug 2026, 10:04', modifiedBy: 'You', size: '77 KB', bytes: 78848, current: false }
  ]
}

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

function childrenOf(parentId) { return items.filter((item) => item.parentId === parentId && !item.sharedWithMe) }

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

function uniqueName(name, parentId, excludeId = null) {
  const existing = new Set(childrenOf(parentId).filter((item) => item.id !== excludeId).map((item) => item.name.toLowerCase()))
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
  const copy = { ...clone(source), id: crypto.randomUUID(), parentId, name: uniqueName(source.name, parentId), modified: now(), shared: false, sharedWithMe: false }
  items.unshift(copy)
  if (source.type === 'folder') for (const child of childrenOf(sourceId)) copyRecursive(child.id, copy.id)
  if (source.type === 'file') versions[copy.id] = [{ id: `${copy.id}-v1`, number: 1, createdAt: now(), modifiedBy: 'You', size: copy.size || '—', bytes: copy.bytes || 0, current: true }]
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

function retainedVersionBytes() {
  return Object.values(versions).flat().filter((version) => !version.current).reduce((sum, version) => sum + (version.bytes || 0), 0)
}

function ensureVersions(item) {
  if (item.type !== 'file') return []
  versions[item.id] ||= [{ id: `${item.id}-v1`, number: 1, createdAt: item.modified, modifiedBy: item.owner === 'You' ? 'You' : item.owner, size: item.size || '—', bytes: item.bytes || 0, current: true }]
  return versions[item.id]
}

function addVersion(item, bytes, modifiedBy = 'You') {
  const history = ensureVersions(item)
  for (const version of history) version.current = false
  const number = Math.max(0, ...history.map((version) => version.number)) + 1
  const version = { id: `${item.id}-v${number}-${crypto.randomUUID()}`, number, createdAt: now(), modifiedBy, size: formatBytes(bytes), bytes, current: true }
  history.unshift(version)
  item.bytes = bytes
  item.size = version.size
  item.modified = now()
  return version
}

export const emporiumApi = {
  async list(parentId = null) { return wait(clone(childrenOf(parentId))) },
  async get(id) { return wait(clone(requireItem(id))) },
  async recent() { return wait(clone(items.filter((item) => !item.sharedWithMe).slice(0, 6))) },
  async shared() { return wait(clone(items.filter((item) => item.shared || item.sharedWithMe))) },
  async trash() { return wait(clone(trash)) },
  async quota() {
    const versionBytes = retainedVersionBytes()
    const usedBytes = BASE_USED_BYTES + uploadedBytes() + versionBytes
    return wait({ usedBytes, versionBytes, quotaBytes: QUOTA_BYTES, percent: Math.min(100, Math.round((usedBytes / QUOTA_BYTES) * 100)) }, 30)
  },
  async conflicts(files, parentId = null) {
    const existing = new Set(childrenOf(parentId).map((item) => item.name.toLowerCase()))
    return wait(files.filter((file) => existing.has(file.name.toLowerCase())).map((file) => file.name), 30)
  },
  async shareTargets() { return wait(clone(shareTargets), 30) },
  async getShares(id) { return wait(clone(shares[id] || []), 30) },
  async share(id, targetId, permission = 'viewer') {
    const item = requireItem(id)
    const target = shareTargets.find((entry) => entry.id === targetId)
    if (!target) throw new Error('Share target not found')
    shares[id] ||= []
    const existing = shares[id].find((entry) => entry.targetId === targetId)
    if (existing) existing.permission = permission
    else shares[id].push({ id: crypto.randomUUID(), targetId, name: target.name, kind: target.kind, permission, external: target.external })
    item.shared = true
    return wait(clone(shares[id]), 60)
  },
  async revokeShare(id, shareId) {
    const item = requireItem(id)
    shares[id] = (shares[id] || []).filter((entry) => entry.id !== shareId)
    item.shared = shares[id].length > 0
    return wait(clone(shares[id]), 60)
  },
  async versions(id) {
    const item = requireItem(id)
    if (item.type !== 'file') throw new Error('Folders do not have file versions')
    return wait(clone(ensureVersions(item)), 40)
  },
  async restoreVersion(id, versionId) {
    const item = requireItem(id)
    const history = ensureVersions(item)
    const source = history.find((version) => version.id === versionId)
    if (!source) throw new Error('Version not found')
    const restored = addVersion(item, source.bytes, 'You')
    restored.restoredFrom = source.number
    return wait(clone({ item, versions: history }), 80)
  },

  async createFolder(name, parentId = null) {
    const folder = { id: crypto.randomUUID(), parentId, type: 'folder', name: uniqueName(name || 'New folder', parentId), modified: now(), owner: 'You', region: 'UK', shared: false }
    items.unshift(folder)
    return wait(clone(folder))
  },

  async rename(id, name) {
    const item = requireItem(id)
    item.name = uniqueName(name.trim() || item.name, item.parentId, item.id)
    item.modified = now()
    return wait(clone(item))
  },

  async move(id, parentId = null) {
    const item = requireItem(id)
    if (id === parentId) throw new Error('Cannot move a folder into itself')
    if (item.type === 'folder' && descendantIds(id).includes(parentId)) throw new Error('Cannot move a folder into one of its descendants')
    item.name = uniqueName(item.name, parentId, item.id)
    item.parentId = parentId
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
    const restoredRoot = restored.find((item) => item.id === id)
    if (restoredRoot) restoredRoot.name = uniqueName(restoredRoot.name, restoredRoot.parentId, restoredRoot.id)
    for (const item of restored) items.unshift(item)
    return wait(clone(restoredRoot))
  },

  async uploadFile(file, parentId = null, strategy = 'rename') {
    const existing = childrenOf(parentId).find((item) => item.name.toLowerCase() === file.name.toLowerCase())
    if (existing && strategy === 'replace' && existing.type === 'file') {
      addVersion(existing, file.size || 0, 'You')
      existing.uploaded = true
      return wait(clone(existing), 120)
    }
    const name = existing ? uniqueName(file.name, parentId) : file.name
    const entry = {
      id: crypto.randomUUID(), parentId, type: 'file', name, modified: now(), owner: 'You', region: 'UK', shared: false,
      size: formatBytes(file.size || 0), bytes: file.size || 0, uploaded: true
    }
    items.unshift(entry)
    versions[entry.id] = [{ id: `${entry.id}-v1`, number: 1, createdAt: now(), modifiedBy: 'You', size: entry.size, bytes: entry.bytes, current: true }]
    return wait(clone(entry), 120)
  },

  async upload(name = 'Untitled upload', parentId = null) { return this.uploadFile({ name, size: 0 }, parentId, 'rename') },
  async folders() { return wait(clone(items.filter((item) => item.type === 'folder' && !item.sharedWithMe))) }
}