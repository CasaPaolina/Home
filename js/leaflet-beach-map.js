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
            html: '<div class="marker-pin home-pin">🏠</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
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
            const isSand = beach.sandType.includes('sand');
            const emoji = isSand ? '🏖️' : '🪨';
            const color = isSand ? '#fbbf24' : '#3b82f6';

            const beachIcon = L.divIcon({
                className: 'custom-beach-marker',
                html: `<div class="marker-pin beach-pin" style="background: ${color}">${emoji}</div>`,
                iconSize: [35, 35],
                iconAnchor: [17, 35]
            });

            const marker = L.marker([beach.lat, beach.lng], { icon: beachIcon })
                .addTo(this.map)
                .bindPopup(this.createPopupContent(beach));

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
                        <div class="popup-facilities"><strong>Servizi:</strong> ${beach.facilities.map(f => getFacilityLabel(f)).join(', ')}</div>
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

        return this.beaches.filter(beach => {
            switch (filter) {
                case 'sand':
                    return beach.sandType && beach.sandType.toLowerCase().includes('sand');
                case 'rocks':
                    return beach.sandType && (beach.sandType.toLowerCase().includes('rock') || beach.sandType.toLowerCase().includes('pebble'));
                case 'adriatic':
                    return beach.lng > 18.2;
                case 'ionian':
                    return beach.lng <= 18.2;
                default:
                    return true;
            }
        });
    }

    initFilters() {
        const filterButtons = document.querySelectorAll('.beach-filter-btn');

        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Apply filter
                const filter = btn.dataset.filter;
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
        const isSand = beach.sandType.includes('sand');
        const typeIcon = isSand ? '🏖️' : '🪨';
        const typeLabel = isSand ? 'Sabbia' : 'Scogliera';

        const bookingBtn = beach.bookingLink
            ? `<a href="${beach.bookingLink}" target="_blank" class="beach-list-book-btn" onclick="event.stopPropagation()">Prenota</a>`
            : '';

        return `
            <div class="beach-list-item" data-beach-id="${beach.id}">
                <div class="beach-list-header">
                    <span class="beach-list-name">${typeIcon} ${beach.name}</span>
                    <span class="beach-list-type">${typeLabel}</span>
                </div>
                <div class="beach-list-info">
                    <span class="beach-list-distance">📍 ${beach.distance}</span>
                    ${bookingBtn}
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
        const beach = this.beaches.find(b => b.id === beachId);
        if (beach) {
            const markerData = this.markers.find(m => m.beach.id === beachId);
            if (markerData) {
                this.map.setView([beach.lat, beach.lng], 13);
                markerData.marker.openPopup();
            }
        }
    }
}

// Initialize
let leafletBeachMap;

function initLeafletBeachMap() {
    leafletBeachMap = new LeafletBeachMap();
    leafletBeachMap.init();
}

// Auto-initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initLeafletBeachMap, 500);
    });
} else {
    setTimeout(initLeafletBeachMap, 500);
}
