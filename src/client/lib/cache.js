// Simple memoization cache with TTL
class CacheManager {
  constructor() {
    this.cache = new Map();
  }

  // Set cache with TTL (milliseconds)
  set(key, value, ttl = 5 * 60 * 1000) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  // Get cache if not expired
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  // Clear specific cache
  clear(key) {
    this.cache.delete(key);
  }

  // Clear all cache
  clearAll() {
    this.cache.clear();
  }

  // Check if cache exists and is valid
  has(key) {
    return this.get(key) !== null;
  }
}

export const cacheManager = new CacheManager();

// Memoize wrapper for async functions
export const memoize = (fn, ttl = 5 * 60 * 1000) => {
  // Create unique identifier for this function instance
  const fnId = Math.random().toString(36).substr(2, 9);
  
  return async (...args) => {
    const key = `${fnId}:${fn.name}:${JSON.stringify(args)}`;
    
    // Check cache first
    const cached = cacheManager.get(key);
    if (cached !== null) {
      return cached;
    }

    // Call function and cache result
    const result = await fn(...args);
    cacheManager.set(key, result, ttl);
    return result;
  };
};
