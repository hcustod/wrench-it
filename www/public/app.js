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

    async init() {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = (params.get("gmapsKey") || "").trim();
      const fromConfig = (window.WRENCHIT_CONFIG?.googleMapsApiKey || "").trim();
      this.googleMapsApiKey = fromUrl || fromConfig;

      this.ping().catch(() => {});
      await this.initializeMap();
      await this.useMyLocation({ auto: true });
      if (!this.searchCenter) {
        await this.search();
      }
    },

    formatLoc(s) {
      const parts = [s.address, s.city, s.state, s.postalCode].filter(Boolean);
      return parts.join(", ") || "--";
    },

    formatDate(v) {
      if (!v) return "--";
      const date = new Date(v);
      if (Number.isNaN(date.getTime())) return "--";
      return date.toLocaleString();
    },

    async ping() {
      this.pinging = true;
      try {
        const res = await fetch("/api/stores/search?q=mechanic&limit=1&offset=0", {
          headers: { "Accept": "application/json" },
        });
        this.apiOk = res.ok;
      } finally {
        this.pinging = false;
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
        this.mapStatus = "Could not load Google Maps API. Check API key and network.";
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

      const res = await fetch(`/api/stores/search?${params.toString()}`, {
        headers: { "Accept": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Search failed (${res.status}): ${text || res.statusText}`);
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

    async search() {
      this.loading = true;
      this.error = null;
      this.notice = null;
      this.selected = null;
      this.selectedDetail = null;
      this.reviews = [];
      this.profileError = null;

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

        if (this.results.length > 0) {
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
          fetch(`/api/stores/${store.id}`, { headers: { "Accept": "application/json" } }),
          fetch(`/api/stores/${store.id}/reviews`, { headers: { "Accept": "application/json" } }),
        ]);

        if (!detailRes.ok) {
          const text = await detailRes.text().catch(() => "");
          throw new Error(`Could not load store profile (${detailRes.status}): ${text || detailRes.statusText}`);
        }
        if (!reviewsRes.ok) {
          const text = await reviewsRes.text().catch(() => "");
          throw new Error(`Could not load reviews (${reviewsRes.status}): ${text || reviewsRes.statusText}`);
        }

        this.selectedDetail = await detailRes.json();
        this.reviews = await reviewsRes.json();
      } catch (e) {
        this.selectedDetail = store;
        if (!silentErrors) {
          this.profileError = e?.message || "Failed to load store profile.";
        }
      } finally {
        this.profileLoading = false;
      }
    },
  };
}
