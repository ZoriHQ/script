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

let cookieStore = "";
Object.defineProperty(document, "cookie", {
  get() {
    return cookieStore;
  },
  set(value) {
    const [pair] = value.split(";");
    if (pair.includes("expires=Thu, 01 Jan 1970")) {
      const [name] = pair.split("=");
      const cookies = cookieStore
        .split("; ")
        .filter((c) => !c.startsWith(name));
      cookieStore = cookies.join("; ");
    } else {
      const [name] = pair.split("=");
      const cookies = cookieStore
        .split("; ")
        .filter((c) => c && !c.startsWith(name));
      cookies.push(pair);
      cookieStore = cookies.join("; ");
    }
  },
});

beforeEach(() => {
  localStorage.clear();
  cookieStore = "";
  jest.clearAllMocks();
});
