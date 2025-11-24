const KEY = 'mabu_favorites'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* empty */ }
  return []
}

function write(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)) } catch { /* empty */ }
}

export function getFavorites() {
  return read()
}

export function isFavorite(id) {
  const set = read()
  return set.includes(id)
}

export function toggleFavorite(id) {
  const set = read()
  const idx = set.indexOf(id)
  if (idx >= 0) {
    set.splice(idx, 1)
  } else {
    set.push(id)
  }
  write(set)
  return set.includes(id)
}

