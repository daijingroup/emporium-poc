const items = [
  { id: 'f1', type: 'folder', name: 'Projects', modified: 'Today, 17:42', owner: 'You', region: 'UK', shared: false },
  { id: 'f2', type: 'folder', name: 'Finance', modified: 'Yesterday', owner: 'KiTech Software', region: 'UK', shared: true },
  { id: 'f3', type: 'folder', name: 'Design', modified: '12 Aug 2026', owner: 'You', region: 'UK', shared: true },
  { id: 'd1', type: 'file', name: 'Q3 roadmap.pdf', modified: 'Today, 14:08', owner: 'You', region: 'UK', shared: false, size: '2.4 MB' },
  { id: 'd2', type: 'file', name: 'Brand assets.zip', modified: '14 Aug 2026', owner: 'KiTech Software', region: 'UK', shared: true, size: '18.9 MB' },
  { id: 'd3', type: 'file', name: 'Regional architecture.md', modified: '13 Aug 2026', owner: 'You', region: 'UK', shared: false, size: '84 KB' }
]

const wait = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 120))

export const emporiumApi = {
  async list() { return wait([...items]) },
  async recent() { return wait([...items].slice(0, 4)) },
  async shared() { return wait(items.filter((item) => item.shared)) },
  async trash() { return wait([]) },
  async upload(name = 'Untitled upload') {
    const file = { id: crypto.randomUUID(), type: 'file', name, modified: 'Just now', owner: 'You', region: 'UK', shared: false, size: '—' }
    items.unshift(file)
    return wait(file)
  }
}
