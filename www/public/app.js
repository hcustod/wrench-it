function app() {
  return {
    q: "",
    results: [],
    selected: null,
    loading: false,
    error: null,

    apiOk: false,
    pinging: false,

    init() {
      this.ping().catch(() => {});
    },

    formatLoc(s) {
      const parts = [s.address, s.city, s.state, s.postalCode].filter(Boolean);
      return parts.join(", ") || "--";
    },

    async ping() {
      this.pinging = true;
      try {
        const res = await fetch("/api/stores/search?limit=1&offset=0", {
          headers: { "Accept": "application/json" },
        });
        this.apiOk = res.ok;
      } finally {
        this.pinging = false;
      }
    },

    async search() {
      this.loading = true;
      this.error = null;
      this.selected = null;

      try {
        const params = new URLSearchParams();
        if (this.q) params.set("q", this.q);
        params.set("limit", "25");
        params.set("offset", "0");

        const res = await fetch(`/api/stores/search?${params.toString()}`, {
          headers: { "Accept": "application/json" },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Search failed (${res.status}): ${text || res.statusText}`);
        }

        const data = await res.json();
        this.results = Array.isArray(data)
          ? data
          : (data.items ?? data.results ?? []);
      } catch (e) {
        this.error = e?.message || "Search failed.";
      } finally {
        this.loading = false;
      }
    },
  };
}
