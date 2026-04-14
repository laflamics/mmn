// Clear old token from localStorage to fix quota issue
export function clearOldStorage() {
  try {
    localStorage.removeItem('token');
    console.log('Cleared old token from localStorage');
  } catch (err) {
    console.error('Error clearing storage:', err);
  }
}
