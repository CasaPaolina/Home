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

    addBeachMarkers(filter = 'all') {
        this.markers.forEach(({ marker }) => this.map.removeLayer(marker));
        this.markers = [];

        this.filterBeaches(filter).forEach(beach => {
            const isIonic   = beach.sea === 'ionico';
            const isClosest = (beach.distanceNum || 999) <= 5;
            const color = isClosest ? '#e76f51' : isIonic ? '#0d6e8e' : '#2c7873';
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
                permanent: true,
                direction: 'top',
                offset: [0, -11],
                className: 'mc-tooltip mc-tooltip--beach'
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
        document.querySelectorAll('.beach-list-item').forEach(c => c.classList.remove('selected'));
        const item = document.querySelector(`[data-beach-id="${id}"]`);
        if (!item) return;
        item.classList.add('selected');

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
        const ACTIVITY_LABELS = {
            swim:'🏊 Nuoto', snorkel:'🤿 Snorkeling', dive:'🧜 Immersioni',
            family:'👨‍👩‍👧 Famiglie', nature:'🌿 Natura', hidden:'💎 Cala',
            sup:'🏄 SUP', nightlife:'🎶 Movida', thermal:'🌡️ Terme'
        };
        const SAND_LABELS = {
            fine_sand:'🏖️ Sabbia fine', golden_sand:'🏖️ Sabbia dorata',
            white_sand:'🏖️ Sabbia bianca', pebbles:'🪨 Ghiaia', rocks:'🪨 Scogliera'
        };

        const imageSrc   = (beach.images && beach.images[0]) || beach.image || '';
        const seaLabel   = beach.sea === 'ionico' ? 'Ionico' : 'Adriatico';
        const seaClass   = beach.sea === 'ionico' ? 'mc-card__badge--ionico' : 'mc-card__badge--adriatico';
        const sandLabel  = SAND_LABELS[beach.sandType] || '';
        const desc       = beach.description_it || beach.description || '';
        const isClosest  = (beach.distanceNum || 999) <= 5;
        const casaLat    = 40.102558, casaLng = 18.446024;
        const mapsUrl    = `https://www.google.com/maps/dir/?api=1&origin=${casaLat},${casaLng}&destination=${beach.lat},${beach.lng}`;

        const activities = (beach.activities || []).slice(0, 3)
            .map(a => `<span class="mc-card__activity">${ACTIVITY_LABELS[a] || a}</span>`).join('');

        const bookBtn = beach.bookingLink
            ? `<a href="${beach.bookingLink}" target="_blank" class="mc-card__btn mc-card__btn--sec" onclick="event.stopPropagation()">🎫 Prenota</a>`
            : '';

        return `<div class="mc-beach-card beach-list-item" data-beach-id="${beach.id}">
            <div class="mc-card__photo-wrap">
                ${imageSrc
                    ? `<img src="images/${imageSrc}" alt="${beach.name}" loading="lazy" onerror="this.style.display='none'">`
                    : `<div class="mc-card__photo-placeholder">🌊</div>`}
                <span class="mc-card__badge mc-card__badge--dist">${beach.distance || ''}</span>
                <span class="mc-card__badge mc-card__badge--sea ${seaClass}">${seaLabel}</span>
                ${isClosest ? `<span class="mc-card__badge mc-card__badge--closest">⭐ Più vicina</span>` : ''}
            </div>
            <div class="mc-card__body">
                <div class="mc-card__name">${beach.name}</div>
                ${sandLabel ? `<div class="mc-card__type">${sandLabel}</div>` : ''}
                ${desc ? `<p class="mc-card__desc">${desc}</p>` : ''}
                ${activities ? `<div class="mc-card__activities">${activities}</div>` : ''}
                <div class="mc-card__actions">
                    <a href="${mapsUrl}" target="_blank" class="mc-card__btn mc-card__btn--pri" onclick="event.stopPropagation()">🧭 Portami qui</a>
                    ${bookBtn}
                </div>
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
