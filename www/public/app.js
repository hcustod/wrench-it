function app() {
  return {
    q: "mechanic",
    radiusKm: 25,
    results: [],
    selected: null,
    selectedDetail: null,
    reviews: [],
    loading: false,
    error: null,
    notice: null,

    profileLoading: false,
    profileError: null,

    apiOk: false,
    pinging: false,
    locating: false,

    searchCenter: null,

    googleMapsApiKey: "",
    map: null,
    mapReady: false,
    mapMarkers: [],
    userMarker: null,
    searchCircle: null,
    mapStatus: "",

    authTokenInput: "",
    authToken: "",
    me: null,
    meLoading: false,
    meError: null,

    savedShops: [],
    savedStoreIds: [],
    savedLoading: false,
    saveBusyIds: [],

    reviewRating: 5,
    reviewComment: "",
    reviewSubmitting: false,
    reviewNotice: null,

    compareIds: [],
    compareStores: [],
    compareLoading: false,
    compareError: null,

    currentPage: "explore",
    pendingStoreId: "",
    pages: [
      { id: "explore", label: "Explore Stores", path: "/index.html" },
      { id: "compare", label: "Compare", path: "/compare.html" },
      { id: "saved", label: "Saved Shops", path: "/saved.html" },
      { id: "profile", label: "User Settings", path: "/profile.html" },
      { id: "receipts", label: "Receipts Lab", path: "/receipts.html" },
    ],

    userSettings: {
      displayName: "",
      emailAlias: "",
      homeCity: "",
      homeState: "",
      notifications: true,
      compactMode: false,
    },
    settingsNotice: null,

    mockReceipts: [],
    receiptFilterStatus: "ALL",
    receiptFilterQuery: "",
    receiptNotice: null,

    async init() {
      const pageFromDom = document.body?.dataset?.page || "explore";
      await this.initPage(pageFromDom);
    },

    async initPage(page = "explore") {
      this.currentPage = this.normalizePage(page);
      const params = new URLSearchParams(window.location.search);
      this.pendingStoreId = (params.get("storeId") || "").trim();
      const fromUrl = (params.get("gmapsKey") || "").trim();
      const fromConfig = (window.WRENCHIT_CONFIG?.googleMapsApiKey || "").trim();
      this.googleMapsApiKey = fromUrl || fromConfig;

      this.authToken = (window.localStorage.getItem("wrenchit.auth.token") || "").trim();
      this.authTokenInput = this.authToken;
      this.loadCompareIds();
      this.loadUserSettings();
      this.loadMockReceipts();

      this.ping().catch(() => {});
      this.loadMe().catch(() => {});
      this.loadSavedShops().catch(() => {});

      if (this.currentPage === "explore") {
        await this.initializeMap();
        await this.useMyLocation({ auto: true });
        if (!this.searchCenter && this.results.length === 0) {
          await this.search({ selectFirst: true });
        }
      } else if (this.currentPage === "compare") {
        await this.search({ selectFirst: false });
      }
    },

    formatLoc(s) {
      const parts = [s?.address, s?.city, s?.state, s?.postalCode].filter(Boolean);
      return parts.join(", ") || "--";
    },

    formatDate(v) {
      if (!v) return "--";
      const date = new Date(v);
      if (Number.isNaN(date.getTime())) return "--";
      return date.toLocaleString();
    },

    formatMoney(value) {
      const amount = Number(value);
      if (!Number.isFinite(amount)) return "--";
      return amount.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      });
    },

    isSelectedStore(store) {
      return this.selected && (this.selected.id || this.selected.placeId) === (store.id || store.placeId);
    },

    hasAuthToken() {
      return Boolean(this.authToken);
    },

    pagePath(page) {
      const normalized = this.normalizePage(page);
      const item = this.pages.find((entry) => entry.id === normalized);
      return item?.path || "/index.html";
    },

    buildPageUrl(page, params = {}) {
      const path = this.pagePath(page);
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params || {})) {
        if (value == null || value === "") continue;
        query.set(key, String(value));
      }
      const suffix = query.toString();
      return suffix ? `${path}?${suffix}` : path;
    },

    goToPage(page, params = {}) {
      window.location.assign(this.buildPageUrl(page, params));
    },

    isPage(page) {
      return this.currentPage === this.normalizePage(page);
    },

    normalizePage(page) {
      const key = (page || "").toString().trim().toLowerCase();
      const allowed = this.pages.map((entry) => entry.id);
      return allowed.includes(key) ? key : "explore";
    },

    pendingReceiptsCount() {
      return this.mockReceipts.filter((item) => item.status === "PENDING").length;
    },

    approvedReceiptsCount() {
      return this.mockReceipts.filter((item) => item.status === "APPROVED").length;
    },

    rejectedReceiptsCount() {
      return this.mockReceipts.filter((item) => item.status === "REJECTED").length;
    },

    filteredReceiptsCount() {
      return this.filteredMockReceipts().length;
    },

    settingsStorageKey() {
      return "wrenchit.settings.local";
    },

    mockReceiptsStorageKey() {
      return "wrenchit.mock.receipts.v1";
    },

    compareStorageKey() {
      return "wrenchit.compare.ids.v1";
    },

    loadCompareIds() {
      try {
        const raw = window.localStorage.getItem(this.compareStorageKey());
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) {
          this.compareIds = [];
          return;
        }
        this.compareIds = parsed
          .map((id) => String(id || "").trim())
          .filter(Boolean)
          .slice(0, 4);
      } catch (_e) {
        this.compareIds = [];
      }
    },

    persistCompareIds() {
      window.localStorage.setItem(this.compareStorageKey(), JSON.stringify(this.compareIds));
    },

    buildDefaultSettings() {
      return {
        displayName: this.me?.displayName || "Local Dev User",
        emailAlias: this.me?.email || "local-dev@wrenchit.local",
        homeCity: "",
        homeState: "",
        notifications: true,
        compactMode: false,
      };
    },

    normalizeSettings(raw) {
      const defaults = this.buildDefaultSettings();
      const source = raw && typeof raw === "object" ? raw : {};
      const cleanText = (value, fallback = "") => {
        if (typeof value !== "string") return fallback;
        return value.trim();
      };

      return {
        displayName: cleanText(source.displayName, defaults.displayName),
        emailAlias: cleanText(source.emailAlias, defaults.emailAlias),
        homeCity: cleanText(source.homeCity, defaults.homeCity),
        homeState: cleanText(source.homeState, defaults.homeState),
        notifications: source.notifications == null ? defaults.notifications : Boolean(source.notifications),
        compactMode: source.compactMode == null ? defaults.compactMode : Boolean(source.compactMode),
      };
    },

    loadUserSettings() {
      try {
        const raw = window.localStorage.getItem(this.settingsStorageKey());
        const parsed = raw ? JSON.parse(raw) : null;
        this.userSettings = this.normalizeSettings(parsed);
      } catch (_e) {
        this.userSettings = this.buildDefaultSettings();
      }
    },

    persistUserSettings() {
      window.localStorage.setItem(this.settingsStorageKey(), JSON.stringify(this.userSettings));
    },

    syncSettingsFromProfile() {
      if (!this.userSettings) {
        this.userSettings = this.buildDefaultSettings();
      }
      if (!this.me) return;

      let changed = false;
      if (!this.userSettings.displayName && this.me.displayName) {
        this.userSettings.displayName = this.me.displayName;
        changed = true;
      }
      if (!this.userSettings.emailAlias && this.me.email) {
        this.userSettings.emailAlias = this.me.email;
        changed = true;
      }
      if (changed) {
        this.persistUserSettings();
      }
    },

    saveUserSettings() {
      this.userSettings = this.normalizeSettings(this.userSettings);
      this.persistUserSettings();
      this.settingsNotice = "Settings saved locally for test mode.";
    },

    resetUserSettings() {
      this.userSettings = this.buildDefaultSettings();
      this.persistUserSettings();
      this.settingsNotice = "Settings reset to local defaults.";
    },

    profileDisplayName() {
      return this.userSettings?.displayName || this.me?.displayName || this.me?.email || this.me?.keycloakSub || "User";
    },

    profileEmailAlias() {
      return this.userSettings?.emailAlias || this.me?.email || "--";
    },

    profileHomeLabel() {
      const city = this.userSettings?.homeCity;
      const state = this.userSettings?.homeState;
      if (!city && !state) return "Home base not set";
      return [city, state].filter(Boolean).join(", ");
    },

    defaultMockReceipts() {
      return [
        {
          id: "rcpt-local-1001",
          storeName: "Capital City Auto Care",
          submittedBy: "local-dev@wrenchit.local",
          uploadedAt: "2026-02-20T14:25:00Z",
          amount: 184.21,
          status: "PENDING",
          issue: "Awaiting manual validation",
        },
        {
          id: "rcpt-local-1002",
          storeName: "Peachtree Mechanic Center",
          submittedBy: "local-dev@wrenchit.local",
          uploadedAt: "2026-02-19T10:42:00Z",
          amount: 629.5,
          status: "APPROVED",
          issue: "Looks valid",
        },
        {
          id: "rcpt-local-1003",
          storeName: "Bay Area Auto Collective",
          submittedBy: "qa-sandbox@wrenchit.local",
          uploadedAt: "2026-02-17T22:11:00Z",
          amount: 72.0,
          status: "REJECTED",
          issue: "Blurry image / unreadable total",
        },
        {
          id: "rcpt-local-1004",
          storeName: "Sunset Boulevard Auto",
          submittedBy: "qa-sandbox@wrenchit.local",
          uploadedAt: "2026-02-21T08:05:00Z",
          amount: 311.44,
          status: "PENDING",
          issue: "Missing tax breakdown",
        },
      ];
    },

    loadMockReceipts() {
      try {
        const raw = window.localStorage.getItem(this.mockReceiptsStorageKey());
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.mockReceipts = parsed;
          return;
        }
      } catch (_e) {
      }
      this.mockReceipts = this.defaultMockReceipts();
      this.persistMockReceipts();
    },

    persistMockReceipts() {
      window.localStorage.setItem(this.mockReceiptsStorageKey(), JSON.stringify(this.mockReceipts));
    },

    filteredMockReceipts() {
      const status = this.receiptFilterStatus || "ALL";
      const query = (this.receiptFilterQuery || "").trim().toLowerCase();

      return this.mockReceipts.filter((receipt) => {
        if (status !== "ALL" && receipt.status !== status) return false;
        if (!query) return true;
        const haystack = [
          receipt.id,
          receipt.storeName,
          receipt.submittedBy,
          receipt.issue,
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(query);
      });
    },

    markReceiptStatus(receiptId, status) {
      const allowed = ["PENDING", "APPROVED", "REJECTED"];
      if (!allowed.includes(status)) return;

      const idx = this.mockReceipts.findIndex((item) => item.id === receiptId);
      if (idx < 0) return;

      this.mockReceipts[idx] = {
        ...this.mockReceipts[idx],
        status,
        updatedAt: new Date().toISOString(),
      };
      this.persistMockReceipts();
      this.receiptNotice = `Receipt ${receiptId} marked ${status}.`;
    },

    resetMockReceipts() {
      this.mockReceipts = this.defaultMockReceipts();
      this.persistMockReceipts();
      this.receiptNotice = "Mock receipt data reset.";
    },

    withAuthHeaders(base = {}) {
      const headers = { ...base };
      if (this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }
      return headers;
    },

    async apiFetch(url, { method = "GET", body, headers = {} } = {}) {
      const res = await fetch(url, {
        method,
        headers: this.withAuthHeaders({
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...headers,
        }),
        body: body ? JSON.stringify(body) : undefined,
      });
      return res;
    },

    async readError(res, prefix) {
      const text = await res.text().catch(() => "");
      return `${prefix} (${res.status}): ${text || res.statusText}`;
    },

    async ping() {
      this.pinging = true;
      try {
        const res = await this.apiFetch("/api/stores/search?q=mechanic&limit=1&offset=0");
        this.apiOk = res.ok;
      } finally {
        this.pinging = false;
      }
    },

    saveAuthToken() {
      this.authToken = (this.authTokenInput || "").trim();
      if (this.authToken) {
        window.localStorage.setItem("wrenchit.auth.token", this.authToken);
      } else {
        window.localStorage.removeItem("wrenchit.auth.token");
      }
      this.loadMe().catch(() => {});
      this.loadSavedShops().catch(() => {});
    },

    clearAuthToken() {
      this.authToken = "";
      this.authTokenInput = "";
      window.localStorage.removeItem("wrenchit.auth.token");
      this.loadMe().catch(() => {});
      this.loadSavedShops().catch(() => {});
    },

    async loadMe() {
      this.meLoading = true;
      this.meError = null;
      try {
        const res = await this.apiFetch("/api/me");
        if (!res.ok) {
          this.me = null;
          this.meError = await this.readError(res, "Could not load profile");
          this.syncSettingsFromProfile();
          return;
        }
        this.me = await res.json();
        this.syncSettingsFromProfile();
      } catch (e) {
        this.me = null;
        this.meError = e?.message || "Could not load profile.";
        this.syncSettingsFromProfile();
      } finally {
        this.meLoading = false;
      }
    },

    setSavedStoreIdsFromSavedShops() {
      this.savedStoreIds = this.savedShops
        .map((item) => item?.store?.id)
        .filter((id) => Boolean(id));
    },

    async loadSavedShops() {
      this.savedLoading = true;
      try {
        const res = await this.apiFetch("/api/me/saved");
        if (!res.ok) {
          this.savedShops = [];
          this.setSavedStoreIdsFromSavedShops();
          return;
        }
        this.savedShops = await res.json();
        this.setSavedStoreIdsFromSavedShops();
      } catch (_e) {
        this.savedShops = [];
        this.setSavedStoreIdsFromSavedShops();
      } finally {
        this.savedLoading = false;
      }
    },

    isStoreSaved(storeId) {
      return Boolean(storeId) && this.savedStoreIds.includes(storeId);
    },

    isSaveBusy(storeId) {
      return Boolean(storeId) && this.saveBusyIds.includes(storeId);
    },

    async toggleSaved(store) {
      this.error = null;
      this.notice = null;
      if (!store?.id) {
        this.notice = "Cannot save this store yet.";
        return;
      }

      const storeId = store.id;
      if (this.isSaveBusy(storeId)) return;
      this.saveBusyIds = [...this.saveBusyIds, storeId];

      try {
        if (this.isStoreSaved(storeId)) {
          const res = await this.apiFetch(`/api/stores/${storeId}/save`, { method: "DELETE" });
          if (!res.ok) {
            this.error = await this.readError(res, "Failed to unsave store");
            return;
          }
          this.savedStoreIds = this.savedStoreIds.filter((id) => id !== storeId);
          this.savedShops = this.savedShops.filter((s) => s?.store?.id !== storeId);
          this.notice = "Store removed from saved shops.";
        } else {
          const res = await this.apiFetch(`/api/stores/${storeId}/save`, { method: "POST" });
          if (!res.ok) {
            this.error = await this.readError(res, "Failed to save store");
            return;
          }
          if (!this.savedStoreIds.includes(storeId)) {
            this.savedStoreIds = [...this.savedStoreIds, storeId];
          }
          this.notice = "Store saved.";
        }
        await this.loadSavedShops();
      } catch (e) {
        this.error = e?.message || "Save action failed.";
      } finally {
        this.saveBusyIds = this.saveBusyIds.filter((id) => id !== storeId);
      }
    },

    isCompareSelected(storeId) {
      const id = String(storeId || "").trim();
      return Boolean(id) && this.compareIds.includes(id);
    },

    toggleCompare(store) {
      if (!store?.id) {
        this.notice = "Cannot compare this store yet.";
        return;
      }
      const id = String(store.id).trim();
      this.compareError = null;

      if (this.compareIds.includes(id)) {
        this.compareIds = this.compareIds.filter((x) => x !== id);
        this.persistCompareIds();
        return;
      }

      if (this.compareIds.length >= 4) {
        this.compareError = "Compare supports up to 4 stores.";
        return;
      }
      this.compareIds = [...this.compareIds, id];
      this.persistCompareIds();
    },

    clearCompare() {
      this.compareIds = [];
      this.compareStores = [];
      this.compareError = null;
      this.persistCompareIds();
    },

    async runCompare() {
      if (this.compareIds.length < 2) {
        this.compareError = "Pick at least 2 stores to compare.";
        return;
      }

      this.compareLoading = true;
      this.compareError = null;
      try {
        const params = new URLSearchParams();
        for (const id of this.compareIds) params.append("ids", id);
        params.set("sort", "RATING");
        params.set("direction", "DESC");

        const res = await this.apiFetch(`/api/stores/compare?${params.toString()}`);
        if (!res.ok) {
          this.compareError = await this.readError(res, "Compare failed");
          this.compareStores = [];
          return;
        }

        const data = await res.json();
        this.compareStores = Array.isArray(data?.stores) ? data.stores : [];
      } catch (e) {
        this.compareError = e?.message || "Compare failed.";
        this.compareStores = [];
      } finally {
        this.compareLoading = false;
      }
    },

    async initializeMap() {
      const mapHost = document.getElementById("mapCanvas");
      if (!mapHost) return;

      if (!this.googleMapsApiKey) {
        this.mapStatus = "Google Map disabled. Add key in window.WRENCHIT_CONFIG.googleMapsApiKey or ?gmapsKey=...";
        return;
      }

      this.mapStatus = "Loading Google Map...";
      try {
        await this.loadGoogleMaps();
        this.map = new window.google.maps.Map(mapHost, {
          center: { lat: 39.8283, lng: -98.5795 },
          zoom: 4,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        this.mapReady = true;
        this.mapStatus = "";
      } catch (_e) {
        this.mapStatus = "Could not load Google Maps API. Check key, API enablement, billing, and localhost referrer restrictions.";
      }
    },

    async loadGoogleMaps() {
      if (window.google?.maps) return;

      if (!window.__wrenchitMapLoader) {
        window.__wrenchitMapLoader = new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(this.googleMapsApiKey)}`;
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Google Maps script"));
          document.head.appendChild(script);
        });
      }
      await window.__wrenchitMapLoader;
    },

    async useMyLocation({ auto = false } = {}) {
      if (!navigator.geolocation) {
        if (!auto) this.error = "Geolocation is not supported by this browser.";
        return;
      }

      this.locating = true;
      this.error = null;
      this.notice = null;

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        });

        this.searchCenter = {
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude),
        };

        this.refreshMap();
        await this.search();
      } catch (_e) {
        if (auto) {
          this.notice = "Location unavailable. Searching without nearby filter.";
        } else {
          this.error = "Could not get your location. Check browser location permissions.";
        }
      } finally {
        this.locating = false;
      }
    },

    async fetchSearch(includeGeo) {
      const params = new URLSearchParams();
      if (this.q) params.set("q", this.q.trim());
      params.set("limit", "25");
      params.set("offset", "0");

      if (includeGeo && this.searchCenter && this.radiusKm > 0) {
        params.set("lat", String(this.searchCenter.lat));
        params.set("lng", String(this.searchCenter.lng));
        params.set("radiusKm", String(this.radiusKm));
      }

      const res = await this.apiFetch(`/api/stores/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error(await this.readError(res, "Search failed"));
      }

      const data = await res.json();
      return Array.isArray(data) ? data : (data.items ?? data.results ?? []);
    },

    withDistances(stores, center) {
      if (!Array.isArray(stores)) return [];
      return stores.map((store) => {
        if (!center || store.lat == null || store.lng == null) {
          return { ...store, distanceKm: null };
        }
        return {
          ...store,
          distanceKm: this.distanceKm(center.lat, center.lng, Number(store.lat), Number(store.lng)),
        };
      });
    },

    distanceKm(lat1, lng1, lat2, lng2) {
      const toRad = (deg) => (deg * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
        * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    consumePendingStoreInUrl() {
      if (!window.history?.replaceState) return;
      const url = new URL(window.location.href);
      if (!url.searchParams.has("storeId")) return;
      url.searchParams.delete("storeId");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    },

    preferredStoreFromResults() {
      if (!this.pendingStoreId) return null;
      const wanted = String(this.pendingStoreId).trim();
      if (!wanted) return null;
      const match = this.results.find((item) => String(item?.id || "").trim() === wanted);
      if (!match) return null;
      this.pendingStoreId = "";
      this.consumePendingStoreInUrl();
      return match;
    },

    exploreStoreLink(storeId) {
      const id = String(storeId || "").trim();
      return this.buildPageUrl("explore", id ? { storeId: id } : {});
    },

    async search({ selectFirst = true } = {}) {
      this.loading = true;
      this.error = null;
      this.notice = null;
      this.selected = null;
      this.selectedDetail = null;
      this.reviews = [];
      this.profileError = null;
      this.reviewNotice = null;

      try {
        const useGeo = Boolean(this.searchCenter && this.radiusKm > 0);
        let stores = await this.fetchSearch(useGeo);
        let centerForDistance = useGeo ? this.searchCenter : null;

        if (useGeo && stores.length === 0) {
          stores = await this.fetchSearch(false);
          centerForDistance = null;
          if (stores.length > 0) {
            this.notice = `No stores found within ${this.radiusKm} km. Showing broader matches.`;
          }
        }

        this.results = this.withDistances(stores, centerForDistance);
        this.refreshMap();

        const preferred = this.preferredStoreFromResults();
        if (preferred) {
          await this.selectStore(preferred, { silentErrors: true });
        } else if (selectFirst && this.results.length > 0) {
          await this.selectStore(this.results[0], { silentErrors: true });
        }
      } catch (e) {
        this.error = e?.message || "Search failed.";
        this.results = [];
        this.refreshMap();
      } finally {
        this.loading = false;
      }
    },

    clearMapMarkers() {
      for (const marker of this.mapMarkers) {
        marker.setMap(null);
      }
      this.mapMarkers = [];
    },

    refreshMap() {
      if (!this.mapReady || !this.map) return;

      this.clearMapMarkers();
      this.updateSearchCenterOverlays();

      const bounds = new window.google.maps.LatLngBounds();
      let markerCount = 0;

      if (this.searchCenter) {
        bounds.extend(this.searchCenter);
      }

      for (const store of this.results) {
        if (store.lat == null || store.lng == null) continue;
        const position = { lat: Number(store.lat), lng: Number(store.lng) };
        const marker = new window.google.maps.Marker({
          position,
          map: this.map,
          title: store.name || "Store",
        });
        marker.addListener("click", () => {
          this.selectStore(store).catch(() => {});
        });
        this.mapMarkers.push(marker);
        bounds.extend(position);
        markerCount += 1;
      }

      if (markerCount === 0 && this.searchCenter) {
        this.map.setCenter(this.searchCenter);
        this.map.setZoom(11);
        return;
      }

      if (markerCount > 0) {
        this.map.fitBounds(bounds);
        if (markerCount === 1 && !this.searchCenter) {
          this.map.setZoom(13);
        }
      }
    },

    updateSearchCenterOverlays() {
      if (!this.mapReady || !this.map) return;

      if (!this.searchCenter) {
        if (this.userMarker) this.userMarker.setMap(null);
        if (this.searchCircle) this.searchCircle.setMap(null);
        this.userMarker = null;
        this.searchCircle = null;
        return;
      }

      if (!this.userMarker) {
        this.userMarker = new window.google.maps.Marker({
          map: this.map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#4da3ff",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          title: "Your location",
        });
      }
      this.userMarker.setPosition(this.searchCenter);

      if (!this.searchCircle) {
        this.searchCircle = new window.google.maps.Circle({
          map: this.map,
          strokeColor: "#4da3ff",
          strokeOpacity: 0.6,
          strokeWeight: 1,
          fillColor: "#4da3ff",
          fillOpacity: 0.1,
        });
      }
      this.searchCircle.setCenter(this.searchCenter);
      this.searchCircle.setRadius((Number(this.radiusKm) || 25) * 1000);
    },

    async selectStore(store, { silentErrors = false } = {}) {
      this.selected = store;
      this.selectedDetail = null;
      this.reviews = [];
      this.profileError = null;
      this.profileLoading = true;
      this.reviewNotice = null;
      this.reviewComment = "";
      this.reviewRating = 5;

      if (this.mapReady && this.map && store.lat != null && store.lng != null) {
        this.map.panTo({ lat: Number(store.lat), lng: Number(store.lng) });
      }

      if (!store.id) {
        this.selectedDetail = store;
        this.profileLoading = false;
        return;
      }

      try {
        const [detailRes, reviewsRes] = await Promise.all([
          this.apiFetch(`/api/stores/${store.id}`),
          this.apiFetch(`/api/stores/${store.id}/reviews`),
        ]);

        if (!detailRes.ok) {
          throw new Error(await this.readError(detailRes, "Could not load store profile"));
        }
        if (!reviewsRes.ok) {
          throw new Error(await this.readError(reviewsRes, "Could not load reviews"));
        }

        this.selectedDetail = await detailRes.json();
        this.reviews = await reviewsRes.json();

        if (this.me?.id) {
          const mine = this.reviews.find((r) => r?.userId === this.me.id);
          if (mine) {
            this.reviewRating = Number(mine.rating) || 5;
            this.reviewComment = mine.comment || "";
          }
        }
      } catch (e) {
        this.selectedDetail = store;
        if (!silentErrors) {
          this.profileError = e?.message || "Failed to load store profile.";
        }
      } finally {
        this.profileLoading = false;
      }
    },

    async submitReview() {
      const storeId = this.selected?.id;
      if (!storeId) {
        this.reviewNotice = "Pick a store first.";
        return;
      }
      const rating = Number(this.reviewRating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        this.reviewNotice = "Rating must be between 1 and 5.";
        return;
      }

      this.reviewSubmitting = true;
      this.reviewNotice = null;
      this.profileError = null;

      try {
        const res = await this.apiFetch(`/api/stores/${storeId}/reviews`, {
          method: "POST",
          body: {
            rating: Math.round(rating),
            comment: (this.reviewComment || "").trim() || null,
          },
        });

        if (!res.ok) {
          this.profileError = await this.readError(res, "Could not submit review");
          return;
        }

        await this.selectStore(this.selected, { silentErrors: false });
        this.reviewNotice = "Review saved.";
      } catch (e) {
        this.profileError = e?.message || "Could not submit review.";
      } finally {
        this.reviewSubmitting = false;
      }
    },
  };
}
