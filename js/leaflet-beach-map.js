// Leaflet Beach Map with Filters and Interactive List
class LeafletBeachMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.beaches = [];
        this.currentFilter = 'all';
    }

    async init() {
        // Load locations data
        if (!locationsData.loaded) {
            await locationsData.load();
        }

        this.beaches = locationsData.getBeaches();
        this.casaPaolina = locationsData.getCasaPaolina();

        if (!this.casaPaolina) {
            console.error('LeafletBeachMap: Casa Paolina data is missing from locations.json. Map will not initialize.');
            return;
        }

        // Initialize map and list
        this.initMap();
        this.renderBeachList();
        this.initFilters();
    }

    initMap() {
        const mapElement = document.getElementById('beaches-map');
        if (!mapElement) return;

        // Center on Salento region with fullscreen control
        this.map = L.map('beaches-map', {
            fullscreenControl: true,
            fullscreenControlOptions: {
                position: 'topleft'
            }
        }).setView([40.15, 18.35], 10);

        // Add CartoDB Voyager tiles (cleaner, less roads)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(this.map);

        // Add Center on Casa Paolina button
        L.Control.CenterHome = L.Control.extend({
            onAdd: (map) => {
                const btn = L.DomUtil.create('button', 'leaflet-center-home');
                btn.innerHTML = '🏠';
                btn.title = 'Center on Casa Paolina';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.map.setView([this.casaPaolina.lat, this.casaPaolina.lng], 13);
                };
                return btn;
            }
        });
        this.map.addControl(new L.Control.CenterHome({ position: 'topleft' }));

        // Add Casa Paolina marker
        this.addHomeMarker();

        // Add beach markers
        this.addBeachMarkers();
    }

    addHomeMarker() {
        const homeIcon = L.divIcon({
            className: 'custom-home-marker',
            html: `<div class="map-badge map-badge--home">
                     <span class="map-badge-emoji">🏠</span>
                   </div>`,
            iconSize: [42, 46],
            iconAnchor: [21, 46]
        });

        const marker = L.marker([this.casaPaolina.lat, this.casaPaolina.lng], { icon: homeIcon })
            .addTo(this.map)
            .bindPopup(`
                <div class="beach-popup">
                    <h3>🏠 Casa Paolina</h3>
                    <p>${this.casaPaolina.address}</p>
                </div>
            `);
    }

    addBeachMarkers(filter = 'all') {
        // Clear existing markers
        this.markers.forEach(({ marker }) => this.map.removeLayer(marker));
        this.markers = [];

        const filteredBeaches = this.filterBeaches(filter);

        filteredBeaches.forEach(beach => {
            const sandTypeRaw = (beach.sandType || '').toString().toLowerCase();
            const isSand = sandTypeRaw.includes('sand');
            const emoji = isSand ? '🏖️' : '🪨';
            const typeClass = isSand ? 'map-badge--sand' : 'map-badge--rock';

            const beachIcon = L.divIcon({
                className: 'custom-beach-marker',
                html: `<div class="map-badge ${typeClass}">
                         <span class="map-badge-emoji">${emoji}</span>
                       </div>`,
                iconSize: [38, 42],
                iconAnchor: [19, 42]
            });

            const marker = L.marker([beach.lat, beach.lng], { icon: beachIcon })
                .addTo(this.map)
                .bindPopup(this.createPopupContent(beach), { maxWidth: 320, className: 'beach-leaflet-popup' });

            marker.on('click', () => {
                this.selectBeach(beach.id);
            });

            this.markers.push({ marker, beach });
        });
    }

    createPopupContent(beach) {
        // Prefer global renderer if available for consistent layout
        if (typeof window.getBeachPopupHTML === 'function') {
            return window.getBeachPopupHTML(beach, { inline: true });
        }

        const sandTypeLabel = (beach.sandType || beach.type || '').toString().toLowerCase().includes('sabb') ? '🏖️ Sabbia' : '🪨 Scogliera';
        const bookingButton = (beach.bookingLink || beach.booking)
            ? `<a href="${beach.bookingLink || beach.booking}" target="_blank" class="popup-book-btn">Prenota</a>`
            : '';

        const imageSrc = beach.image || beach.photo || (beach.photos && beach.photos[0]) || '';

        const facilityLabel = (facility) => {
            if (typeof window.getFacilityLabel === 'function') {
                return window.getFacilityLabel(facility);
            }
            if (!facility) return '';
            return facility.toString().replace(/_/g, ' ');
        };

        return `
            <div class="beach-popup popup-grid">
                ${imageSrc ? `
                    <div class="popup-image">
                        <img src="${imageSrc}" alt="${beach.name}" loading="lazy">
                    </div>
                ` : ''}
                <div class="popup-body">
                    <h3>${beach.name}</h3>
                    <p class="popup-type">${sandTypeLabel}</p>
                    <p class="popup-distance">📍 ${beach.distance}</p>
                    <p class="popup-desc">${beach.description}</p>
                    ${beach.facilities && beach.facilities.length > 0 ? `
                        <div class="popup-facilities"><strong>Servizi:</strong> ${beach.facilities.map(f => facilityLabel(f)).join(', ')}</div>
                    ` : ''}
                    <div class="popup-actions">
                        <a href="https://www.google.com/maps/dir/?api=1&origin=${this.casaPaolina.lat},${this.casaPaolina.lng}&destination=${beach.lat},${beach.lng}" target="_blank" class="popup-btn popup-btn-secondary">Portami qui</a>
                        ${bookingButton}
                    </div>
                </div>
            </div>
        `;
    }

    filterBeaches(filter) {
        if (filter === 'all') return this.beaches;

        const ACTIVITY_CODES = ['swim','snorkel','dive','family','nature','hidden','sup','nightlife','thermal'];

        return this.beaches.filter(beach => {
            if (ACTIVITY_CODES.includes(filter)) {
                return Array.isArray(beach.activities) && beach.activities.includes(filter);
            }
            switch (filter) {
                case 'sand':
                    return beach.sandType && beach.sandType.toLowerCase().includes('sand');
                case 'rocks':
                    return beach.sandType && (beach.sandType.toLowerCase().includes('rock') || beach.sandType.toLowerCase().includes('pebble'));
                case 'adriatic':
                    return beach.lng > 18.2;
                case 'ionian':
                    return beach.lng <= 18.2;
                case 'recommended-today': {
                    const wind = window.currentWindCardinal;
                    if (!wind) return false;
                    const prot = Array.isArray(beach.protectedFrom) ? beach.protectedFrom : [];
                    return prot.includes(wind);
                }
                default:
                    return true;
            }
        });
    }

    initFilters() {
        const allBtns = document.querySelectorAll('.beach-filter-btn, .mc-pill');

        allBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                allBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter || btn.dataset.activity || 'all';
                this.currentFilter = filter;
                this.addBeachMarkers(filter);
                this.renderBeachList(filter);
            });
        });
    }

    renderBeachList(filter = 'all') {
        const listContainer = document.getElementById('beaches-list');
        if (!listContainer) return;

        const filteredBeaches = this.filterBeaches(filter);

        listContainer.innerHTML = filteredBeaches.map(beach => this.createBeachListItem(beach)).join('');

        // Add click handlers
        listContainer.querySelectorAll('.beach-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const beachId = item.dataset.beachId;
                this.selectBeach(beachId);
            });
        });
    }

    createBeachListItem(beach) {
        const ACTIVITY_LABELS = { swim:'🏊 Nuoto', snorkel:'🤿 Snorkeling', dive:'🧜 Immersioni', family:'👨‍👩‍👧 Famiglie', nature:'🌿 Natura', hidden:'💎 Cala', sup:'🏄 SUP', nightlife:'🎶 Movida', thermal:'🌡️ Terme' };
        const SAND_LABELS = { fine_sand:'🏖️ Sabbia fine', golden_sand:'🏖️ Sabbia dorata', white_sand:'🏖️ Sabbia bianca', pebbles:'🪨 Ghiaia', rocks:'🪨 Scogliera' };

        const imageSrc = (beach.images && beach.images[0]) || beach.image || '';
        const seaLabel = beach.sea === 'ionico' ? 'Ionico' : 'Adriatico';
        const seaClass = beach.sea === 'ionico' ? 'mc-card__badge--ionico' : 'mc-card__badge--adriatico';
        const sandLabel = SAND_LABELS[beach.sandType] || '';
        const desc = beach.description_it || beach.description || '';
        const isClosest = (beach.distanceNum || 999) <= 5;
        const casaLat = 40.102558, casaLng = 18.446024;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${casaLat},${casaLng}&destination=${beach.lat},${beach.lng}`;

        const activityPills = (beach.activities || []).slice(0, 3).map(a =>
            `<span class="mc-card__activity">${ACTIVITY_LABELS[a] || a}</span>`
        ).join('');

        const bookBtn = beach.bookingLink
            ? `<a href="${beach.bookingLink}" target="_blank" class="mc-card__btn mc-card__btn--sec" onclick="event.stopPropagation()">🎫 Prenota</a>`
            : '';

        return `
            <div class="mc-beach-card beach-list-item" data-beach-id="${beach.id}">
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
                    ${activityPills ? `<div class="mc-card__activities">${activityPills}</div>` : ''}
                    <div class="mc-card__actions">
                        <a href="${mapsUrl}" target="_blank" class="mc-card__btn mc-card__btn--pri" onclick="event.stopPropagation()">🧭 Portami qui</a>
                        ${bookBtn}
                    </div>
                </div>
            </div>
        `;
    }

    selectBeach(beachId) {
        // Remove previous selection
        document.querySelectorAll('.beach-list-item').forEach(c => c.classList.remove('selected'));

        // Add selection
        const item = document.querySelector(`[data-beach-id="${beachId}"]`);
        if (item) {
            item.classList.add('selected');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Find beach and marker
        const selectedBeachId = String(beachId);
        const beach = this.beaches.find(b => String(b.id) === selectedBeachId);
        if (beach) {
            const markerData = this.markers.find(m => String(m.beach.id) === selectedBeachId);
            if (markerData) {
                this.map.setView([beach.lat, beach.lng], 13);
                markerData.marker.openPopup();
            }
        }
    }
}

// Initialize
let leafletBeachMap;

async function initLeafletBeachMap() {
    leafletBeachMap = new LeafletBeachMap();
    await leafletBeachMap.init();
}

// Auto-initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initLeafletBeachMap, 500);
    });
} else {
    setTimeout(initLeafletBeachMap, 500);
}
