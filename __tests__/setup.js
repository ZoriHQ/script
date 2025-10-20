// Test setup file
// Mock localStorage for tests
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = value.toString();
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  },
};

// Mock document.cookie
let cookieStore = '';
Object.defineProperty(document, 'cookie', {
  get() {
    return cookieStore;
  },
  set(value) {
    // Simple cookie parsing for tests
    const [pair] = value.split(';');
    if (pair.includes('expires=Thu, 01 Jan 1970')) {
      // Delete cookie
      const [name] = pair.split('=');
      const cookies = cookieStore.split('; ').filter(c => !c.startsWith(name));
      cookieStore = cookies.join('; ');
    } else {
      // Set/update cookie
      const [name] = pair.split('=');
      const cookies = cookieStore.split('; ').filter(c => c && !c.startsWith(name));
      cookies.push(pair);
      cookieStore = cookies.join('; ');
    }
  },
});

// Reset storage before each test
beforeEach(() => {
  localStorage.clear();
  cookieStore = '';
  jest.clearAllMocks();
});
