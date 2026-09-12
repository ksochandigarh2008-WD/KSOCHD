import { useState, useEffect } from 'react'

/**
 * useState that persists to localStorage.
 * Used for admin UI preferences (nav state) that shouldn't live in the site store.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
      return raw === null ? initialValue : JSON.parse(raw)
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage full or unavailable — the UI still works, it just won't persist */
    }
  }, [key, value])

  return [value, setValue]
}

export default useLocalStorage
