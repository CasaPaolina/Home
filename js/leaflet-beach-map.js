// Beach Map — marecalmo-style UX
// - No popups on map: the side card IS the detail view
// - Click pin  → highlight card, scroll list (desktop) or page (mobile)
// - Click card → fly map to beach, highlight pin
// - Fullscreen toggle button on map

class LeafletBeachMap {
    constructor() {
        this.map        = null;
        this.markers    = [];
        this.beaches    = [];
        this.currentFilter = 'all';
        this._fsHandler = null;
    }

    async init() {
        if (!locationsData.loaded) await locationsData.load();

        this.beaches     = locationsData.getBeaches ? locationsData.getBeaches() : [];
        this.casaPaolina = locationsData.getCasaPaolina ? locationsData.getCasaPaolina() : null;

        if (!this.casaPaolina) return;

        this.initMap();
        this.renderBeachList();
        this.initFilters();
    }

    // ── MAP INIT ─────────────────────────────────────────────────

    initMap() {
        const el = document.getElementById('beaches-map');
        if (!el) return;

        this.map = L.map('beaches-map', {
            zoomControl: false,
            attributionControl: true
        }).setView([40.12, 18.28], 10);

        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // ESRI World Imagery — satellite (same provider as marecalmo)
        L.tileLayer(
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                attribution: 'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community',
                maxZoom: 19
            }
        ).addTo(this.map);

        // ESRI reference labels on top
        L.tileLayer(
            'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            { maxZoom: 19 }
        ).addTo(this.map);

        this._addHomeControl();
        this._addFullscreenControl();
        this.addHomeMarker();
        this.addBeachMarkers();

        setTimeout(() => this.map && this.map.invalidateSize(), 300);
    }

    _addHomeControl() {
        const self = this;
        L.Control.CenterHome = L.Control.extend({
            onAdd() {
                const btn = L.DomUtil.create('button', 'mc-ctrl mc-ctrl--home');
                btn.title = 'Centra su Casa Paolina';
                btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>`;
                L.DomEvent.on(btn, 'click', L.DomEvent.stopPropagation);
                L.DomEvent.on(btn, 'click', () => {
                    self.map.flyTo([self.casaPaolina.lat, self.casaPaolina.lng], 11, { duration: 1 });
                });
                return btn;
            }
        });
        this.map.addControl(new L.Control.CenterHome({ position: 'topleft' }));
    }

    _addFullscreenControl() {
        const self = this;
        const EXPAND_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>`;
        const COMPRESS_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3"/>
        </svg>`;

        L.Control.Fullscreen = L.Control.extend({
            onAdd() {
                const btn = L.DomUtil.create('button', 'mc-ctrl mc-ctrl--fullscreen');
                btn.title = 'Schermo intero';
                btn.innerHTML = EXPAND_ICON;
                btn.dataset.fs = '0';
                L.DomEvent.on(btn, 'click', L.DomEvent.stopPropagation);
                L.DomEvent.on(btn, 'click', () => {
                    const isFs = btn.dataset.fs === '1';
                    self._toggleFullscreen(!isFs);
                    btn.dataset.fs = isFs ? '0' : '1';
                    btn.innerHTML = isFs ? EXPAND_ICON : COMPRESS_ICON;
                    btn.title = isFs ? 'Schermo intero' : 'Esci dallo schermo intero';
                });
                return btn;
            }
        });
        this.map.addControl(new L.Control.Fullscreen({ position: 'topright' }));
    }

    _toggleFullscreen(on) {
        const side = document.querySelector('.mc-map-side');
        if (!side) return;
        side.classList.toggle('mc-map--fullscreen', on);
        document.body.classList.toggle('mc-body--noscroll', on);

        // ESC to exit
        if (on) {
            this._fsHandler = (e) => {
                if (e.key !== 'Escape') return;
                this._toggleFullscreen(false);
                const btn = document.querySelector('.mc-ctrl--fullscreen');
                if (btn) {
                    const EXPAND = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
                    btn.innerHTML = EXPAND;
                    btn.dataset.fs = '0';
                }
                document.removeEventListener('keydown', this._fsHandler);
            };
            document.addEventListener('keydown', this._fsHandler);
        } else if (this._fsHandler) {
            document.removeEventListener('keydown', this._fsHandler);
        }

        setTimeout(() => this.map && this.map.invalidateSize(), 200);
    }

    // ── MARKERS ──────────────────────────────────────────────────

    addHomeMarker() {
        L.circleMarker([this.casaPaolina.lat, this.casaPaolina.lng], {
            radius: 10,
            fillColor: '#f4a261',
            color: '#fff',
            weight: 3,
            opacity: 1,
            fillOpacity: 1
        })
        .addTo(this.map)
        .bindTooltip('🏠 Casa Paolina', {
            permanent: true,
            direction: 'top',
            offset: [0, -14],
            className: 'mc-tooltip mc-tooltip--home'
        });
    }

    // ── SEA-STATE COLOUR ─────────────────────────────────────────
    // Returns { color, state } based on current wind and beach exposure.
    // State: 'calm' | 'light' | 'rough' | 'default'
    _seaState(beach) {
        const windDir   = window.currentWindCardinal;
        const windSpeed = window.currentWindSpeedKmh;

        if (!windDir || windSpeed === undefined) {
            // No wind data yet — colour by sea / distance
            const isClosest = (beach.distanceNum || 999) <= 5;
            const isIonic   = beach.sea === 'ionico';
            return {
                color: isClosest ? '#e76f51' : isIonic ? '#0d6e8e' : '#2c7873',
                state: 'default'
            };
        }

        const prot = Array.isArray(beach.protectedFrom) ? beach.protectedFrom : [];
        const protected_ = prot.includes(windDir);

        if (protected_ && windSpeed <= 15) return { color: '#22c55e', state: 'calm' };
        if (protected_ && windSpeed <= 30) return { color: '#f59e0b', state: 'light' };
        if (protected_)                    return { color: '#ef4444', state: 'rough' };
        if (windSpeed <= 12)               return { color: '#f59e0b', state: 'light' };
        return                                    { color: '#ef4444', state: 'rough' };
    }

    _updateLegend() {
        const el = document.getElementById('mc-sea-legend');
        if (!el) return;
        const hasWind = !!window.currentWindCardinal;
        el.style.display = hasWind ? 'flex' : 'none';
    }

    addBeachMarkers(filter = 'all') {
        this.markers.forEach(({ marker }) => this.map.removeLayer(marker));
        this.markers = [];

        this._updateLegend();

        this.filterBeaches(filter).forEach(beach => {
            const { color } = this._seaState(beach);
            const isClosest = (beach.distanceNum || 999) <= 5;
            const radius = isClosest ? 9 : 7;

            const marker = L.circleMarker([beach.lat, beach.lng], {
                radius,
                fillColor: color,
                color: '#fff',
                weight: 2.5,
                opacity: 1,
                fillOpacity: 1
            })
            .addTo(this.map)
            .bindTooltip(beach.name, {
                permanent: false,
                direction: 'top',
                offset: [0, -11],
                className: 'mc-tooltip mc-tooltip--beach',
                sticky: false
            });

            marker._mcColor  = color;
            marker._mcRadius = radius;

            // Click on pin → highlight card, keep map roughly in place
            marker.on('click', () => this.selectBeach(beach.id, { fromMap: true }));

            this.markers.push({ marker, beach });
        });
    }

    // ── SELECTION ────────────────────────────────────────────────

    selectBeach(beachId, { fromMap = false } = {}) {
        const id = String(beachId);

        // Reset all pins
        this.markers.forEach(({ marker }) => marker.setStyle({
            color: '#fff', weight: 2.5, radius: marker._mcRadius || 7, fillOpacity: 1
        }));

        // Highlight selected pin
        const markerData = this.markers.find(m => String(m.beach.id) === id);
        if (markerData) {
            markerData.marker.setStyle({ color: '#f4a261', weight: 3.5, radius: (markerData.marker._mcRadius || 7) + 4 });
        }

        const beach = this.beaches.find(b => String(b.id) === id);

        if (fromMap) {
            // Pin was clicked: keep map roughly centered, just highlight card in list
            this._selectCard(id);

            // On mobile (stacked layout): scroll page down to the card list
            if (window.innerWidth < 900) {
                const listEl = document.getElementById('beaches-list');
                if (listEl) listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            // Card was clicked: fly the map to the beach
            if (beach && this.map) {
                this.map.flyTo([beach.lat, beach.lng], 13, { duration: 1.2 });
            }
            this._selectCard(id);

            // On mobile: scroll page up to the map
            if (window.innerWidth < 900) {
                const mapEl = document.querySelector('.mc-map-side');
                if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    _selectCard(id) {
        document.querySelectorAll('.beach-list-item').forEach(c => c.classList.remove('selected', 'mc-row--selected'));
        const item = document.querySelector(`[data-beach-id="${id}"]`);
        if (!item) return;
        item.classList.add('selected', 'mc-row--selected');

        // Scroll the card panel to the selected card (desktop side panel)
        const panel = document.getElementById('beaches-list');
        if (panel) {
            const itemTop    = item.offsetTop;
            const panelTop   = panel.scrollTop;
            const panelH     = panel.clientHeight;
            const itemH      = item.clientHeight;
            const isVisible  = itemTop >= panelTop && (itemTop + itemH) <= (panelTop + panelH);
            if (!isVisible) {
                panel.scrollTo({ top: itemTop - 12, behavior: 'smooth' });
            }
        }
    }

    // ── FILTERS ──────────────────────────────────────────────────

    filterBeaches(filter) {
        if (filter === 'all') return this.beaches;
        const ACTIVITIES = ['swim','snorkel','dive','family','nature','hidden','sup','nightlife','thermal'];
        return this.beaches.filter(beach => {
            if (ACTIVITIES.includes(filter)) {
                return Array.isArray(beach.activities) && beach.activities.includes(filter);
            }
            switch (filter) {
                case 'sand':   return (beach.sandType || '').toLowerCase().includes('sand');
                case 'rocks':  return (beach.sandType || '').toLowerCase().match(/rock|pebble/);
                case 'adriatic': return beach.lng > 18.2;
                case 'ionian':   return beach.lng <= 18.2;
                case 'recommended-today': {
                    const wind = window.currentWindCardinal;
                    return wind && Array.isArray(beach.protectedFrom) && beach.protectedFrom.includes(wind);
                }
                default: return true;
            }
        });
    }

    initFilters() {
        document.querySelectorAll('.beach-filter-btn, .mc-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.beach-filter-btn, .mc-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter || btn.dataset.activity || 'all';
                this.currentFilter = filter;
                this.addBeachMarkers(filter);
                this.renderBeachList(filter);
            });
        });
    }

    // ── LIST RENDERING ───────────────────────────────────────────

    renderBeachList(filter = 'all') {
        const container = document.getElementById('beaches-list');
        if (!container) return;

        const beaches = this.filterBeaches(filter);
        container.innerHTML = beaches.map(b => this._cardHTML(b)).join('');

        container.querySelectorAll('.beach-list-item').forEach(item => {
            item.addEventListener('click', () => this.selectBeach(item.dataset.beachId, { fromMap: false }));
        });
    }

    _cardHTML(beach) {
        // Activity emojis only (no text) for compact view
        const ACT_EMOJI = {
            swim:'🏊', snorkel:'🤿', dive:'🧜', family:'👨‍👩‍👧',
            nature:'🌿', hidden:'💎', sup:'🏄', nightlife:'🎶', thermal:'🌡️'
        };
        // Placeholder gradient based on sea + sand type
        const GRADIENTS = {
            fine_sand_adriatico:   'linear-gradient(135deg,#60b8d4,#1a94c4)',
            golden_sand_adriatico: 'linear-gradient(135deg,#f59e0b,#fb923c)',
            white_sand_adriatico:  'linear-gradient(135deg,#93c5fd,#38bdf8)',
            rocks_adriatico:       'linear-gradient(135deg,#2c7873,#1a6b55)',
            pebbles_adriatico:     'linear-gradient(135deg,#4aadc7,#2c7873)',
            fine_sand_ionico:      'linear-gradient(135deg,#06b6d4,#0891b2)',
            golden_sand_ionico:    'linear-gradient(135deg,#fbbf24,#06b6d4)',
            white_sand_ionico:     'linear-gradient(135deg,#a5f3fc,#0ea5e9)',
            rocks_ionico:          'linear-gradient(135deg,#0d6e8e,#06b6d4)',
            pebbles_ionico:        'linear-gradient(135deg,#0ea5e9,#0d6e8e)'
        };
        const SAND_EMOJI = {
            fine_sand:'🏖️', golden_sand:'🏖️', white_sand:'🏖️',
            pebbles:'🪨', rocks:'🪨'
        };

        const imageSrc  = (beach.images && beach.images[0]) || beach.image || '';
        const seaKey    = beach.sea === 'ionico' ? 'ionico' : 'adriatico';
        const gradKey   = (beach.sandType || 'rocks') + '_' + seaKey;
        const gradient  = GRADIENTS[gradKey] || GRADIENTS['rocks_adriatico'];
        const sandEmoji = SAND_EMOJI[beach.sandType] || '🌊';
        const seaLabel  = beach.sea === 'ionico' ? 'Ion.' : 'Adr.';
        const isClosest = (beach.distanceNum || 999) <= 5;
        const casaLat   = 40.102558, casaLng = 18.446024;
        const mapsUrl   = `https://www.google.com/maps/dir/?api=1&origin=${casaLat},${casaLng}&destination=${beach.lat},${beach.lng}`;

        const actEmojis = (beach.activities || []).slice(0, 4)
            .map(a => ACT_EMOJI[a] || '').filter(Boolean).join(' ');

        const bookLink = beach.bookingLink
            ? `<a href="${beach.bookingLink}" target="_blank" class="mc-row__link mc-row__link--book" onclick="event.stopPropagation()" title="Prenota">🎫</a>`
            : '';

        return `<div class="mc-beach-row beach-list-item" data-beach-id="${beach.id}">
            <div class="mc-row__thumb">
                ${imageSrc
                    ? `<img src="images/${imageSrc}" alt="${beach.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'mc-row__ph\\' style=\\'${gradient}\\'>${sandEmoji}</div>'">`
                    : `<div class="mc-row__ph" style="${gradient}">${sandEmoji}</div>`}
            </div>
            <div class="mc-row__body">
                <div class="mc-row__name">${beach.name}${isClosest ? ' <span class="mc-row__star">⭐</span>' : ''}</div>
                <div class="mc-row__meta">
                    <span class="mc-row__sea ${beach.sea === 'ionico' ? 'mc-row__sea--ion' : ''}">${seaLabel}</span>
                    <span class="mc-row__dist">${beach.distance || ''}</span>
                    ${actEmojis ? `<span class="mc-row__acts">${actEmojis}</span>` : ''}
                </div>
            </div>
            <div class="mc-row__actions">
                <a href="${mapsUrl}" target="_blank" class="mc-row__link" onclick="event.stopPropagation()" title="Portami qui">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                </a>
                ${bookLink}
            </div>
        </div>`;
    }
}

// ── BOOT ─────────────────────────────────────────────────────────

let leafletBeachMap;

async function initLeafletBeachMap() {
    leafletBeachMap = new LeafletBeachMap();
    await leafletBeachMap.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initLeafletBeachMap, 400));
} else {
    setTimeout(initLeafletBeachMap, 400);
}

// Re-colour pins whenever fresh wind data arrives
document.addEventListener('windUpdated', () => {
    if (leafletBeachMap) {
        leafletBeachMap.addBeachMarkers(leafletBeachMap.currentFilter);
    }
});
