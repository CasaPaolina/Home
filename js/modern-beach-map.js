// Modern Beach Map with Google Maps API and Interactive List
class ModernBeachMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.beaches = [];
        this.currentFilter = 'all';
        this.selectedBeach = null;
        this.infoWindow = null;
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

        // Center on Salento region
        const center = { lat: 40.15, lng: 18.35 };

        this.map = new google.maps.Map(mapElement, {
            zoom: 10,
            center: center,
            styles: this.getModernMapStyles(),
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true
        });

        this.infoWindow = new google.maps.InfoWindow();

        // Add Casa Paolina marker
        this.addHomeMarker();

        // Add beach markers
        this.addBeachMarkers();
    }

    getModernMapStyles() {
        return [
            {
                "featureType": "water",
                "elementType": "geometry",
                "stylers": [{"color": "#a2daf2"}, {"lightness": 17}]
            },
            {
                "featureType": "landscape",
                "elementType": "geometry",
                "stylers": [{"color": "#f5f5f2"}, {"lightness": 20}]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#ffffff"}, {"lightness": 17}]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry.stroke",
                "stylers": [{"color": "#ffffff"}, {"lightness": 29}, {"weight": 0.2}]
            },
            {
                "featureType": "road.arterial",
                "elementType": "geometry",
                "stylers": [{"color": "#ffffff"}, {"lightness": 18}]
            },
            {
                "featureType": "road.local",
                "elementType": "geometry",
                "stylers": [{"color": "#ffffff"}, {"lightness": 16}]
            },
            {
                "featureType": "poi",
                "elementType": "geometry",
                "stylers": [{"color": "#f5f5f5"}, {"lightness": 21}]
            },
            {
                "featureType": "poi.park",
                "elementType": "geometry",
                "stylers": [{"color": "#dedede"}, {"lightness": 21}]
            },
            {
                "elementType": "labels.text.stroke",
                "stylers": [{"visibility": "on"}, {"color": "#ffffff"}, {"lightness": 16}]
            },
            {
                "elementType": "labels.text.fill",
                "stylers": [{"saturation": 36}, {"color": "#333333"}, {"lightness": 40}]
            },
            {
                "elementType": "labels.icon",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "transit",
                "elementType": "geometry",
                "stylers": [{"color": "#f2f2f2"}, {"lightness": 19}]
            },
            {
                "featureType": "administrative",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#fefefe"}, {"lightness": 20}]
            },
            {
                "featureType": "administrative",
                "elementType": "geometry.stroke",
                "stylers": [{"color": "#fefefe"}, {"lightness": 17}, {"weight": 1.2}]
            }
        ];
    }

    addHomeMarker() {
        const marker = new google.maps.Marker({
            position: { lat: this.casaPaolina.lat, lng: this.casaPaolina.lng },
            map: this.map,
            title: 'Casa Paolina',
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#2c7873',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
            },
            zIndex: 1000
        });

        marker.addListener('click', () => {
            this.infoWindow.setContent(`
                <div style="padding: 10px;">
                    <h3 style="margin: 0 0 8px 0; color: #2c7873; font-size: 1.1rem;">🏠 Casa Paolina</h3>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;">${this.casaPaolina.address}</p>
                </div>
            `);
            this.infoWindow.open(this.map, marker);
        });
    }

    addBeachMarkers(filter = 'all') {
        // Clear existing markers
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];

        const filteredBeaches = this.filterBeaches(filter);

        filteredBeaches.forEach(beach => {
            const isSand = beach.sandType.includes('sand');

            const marker = new google.maps.Marker({
                position: { lat: beach.lat, lng: beach.lng },
                map: this.map,
                title: beach.name,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: isSand ? '#fbbf24' : '#3b82f6',
                    fillOpacity: 0.9,
                    strokeColor: '#ffffff',
                    strokeWeight: 2
                }
            });

            marker.addListener('click', () => {
                this.selectBeach(beach.id);
                this.showBeachInfo(beach, marker);
            });

            this.markers.push({ marker, beach });
        });
    }

    showBeachInfo(beach, marker) {
        const sandTypeLabel = beach.sandType.includes('sand') ? '🏖️ Sabbia' : '🪨 Scogliera';
        const bookingButton = beach.bookingLink
            ? `<a href="${beach.bookingLink}" target="_blank" style="display: inline-block; background: #2c7873; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 0.85rem; margin-top: 8px;">Prenota</a>`
            : '';

        if (typeof window.getBeachPopupHTML === 'function') {
            // Use shared popup renderer for consistent layout (inline variant)
            this.infoWindow.setContent(window.getBeachPopupHTML(beach, { inline: true }));
        } else {
            this.infoWindow.setContent(`
                <div style="padding: 12px; max-width: 250px;">
                    <h3 style="margin: 0 0 8px 0; color: #2c7873; font-size: 1.1rem;">${beach.name}</h3>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;">${sandTypeLabel}</p>
                    <p style="margin: 0 0 6px 0; color: #666; font-size: 0.85rem;">📍 ${beach.distance}</p>
                    <p style="margin: 0; color: #666; font-size: 0.85rem;">${beach.description}</p>
                    ${bookingButton}
                </div>
            `);
        }
        this.infoWindow.open(this.map, marker);
    }

    filterBeaches(filter) {
        if (filter === 'all') return this.beaches;

        return this.beaches.filter(beach => {
            switch (filter) {
                case 'sand':
                    return beach.sandType.includes('sand');
                case 'rocks':
                    return beach.sandType === 'rocks' || beach.sandType === 'pebbles';
                case 'adriatic':
                    return beach.lng > 18.3;
                case 'ionian':
                    return beach.lng <= 18.0;
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

        listContainer.innerHTML = filteredBeaches.map(beach => this.createBeachCard(beach)).join('');

        // Add click handlers
        listContainer.querySelectorAll('.beach-card-item').forEach(card => {
            card.addEventListener('click', () => {
                const beachId = card.dataset.beachId;
                this.selectBeach(beachId);
            });
        });
    }

    createBeachCard(beach) {
        const isSand = beach.sandType.includes('sand');
        const typeColor = isSand ? '#fbbf24' : '#3b82f6';
        const typeLabel = isSand ? 'Sabbia' : 'Scogliera';
        const typeIcon = isSand ? '🏖️' : '🪨';

        const facilities = beach.facilities && beach.facilities.length > 0
            ? `<div class="beach-facilities-tags">
                ${beach.facilities.slice(0, 4).map(f => `<span class="facility-tag">${this.getFacilityIcon(f)}</span>`).join('')}
               </div>`
            : '';

        const bookingBtn = beach.bookingLink
            ? `<a href="${beach.bookingLink}" target="_blank" class="beach-book-btn" onclick="event.stopPropagation()">Prenota</a>`
            : '';

        return `
            <div class="beach-card-item" data-beach-id="${beach.id}">
                <div class="beach-card-header">
                    <h5>${beach.name}</h5>
                    <span class="beach-type-tag" style="background: ${typeColor}">${typeIcon} ${typeLabel}</span>
                </div>
                <p class="beach-card-distance">📍 ${beach.distance}</p>
                <p class="beach-card-description">${beach.description}</p>
                ${facilities}
                <div class="beach-card-actions">
                    <button class="beach-view-btn">Vedi sulla Mappa</button>
                    ${bookingBtn}
                </div>
            </div>
        `;
    }

    getFacilityIcon(facility) {
        const icons = {
            'parking': '🅿️',
            'restaurants': '🍽️',
            'umbrellas': '⛱️',
            'sunbeds': '🏖️',
            'beach_bar': '🍹',
            'beach_clubs': '🏖️',
            'water_sports': '🏄',
            'boat_tours': '⛵',
            'diving': '🤿',
            'showers': '🚿',
            'thermal_spa': '♨️',
            'hiking': '🥾',
            'nature_reserve': '🌲'
        };
        return icons[facility] || '✓';
    }

    selectBeach(beachId) {
        // Remove previous selection
        document.querySelectorAll('.beach-card-item').forEach(c => c.classList.remove('selected'));

        // Add selection
        const card = document.querySelector(`[data-beach-id="${beachId}"]`);
        if (card) {
            card.classList.add('selected');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Find beach and marker
        const beach = this.beaches.find(b => b.id === beachId);
        if (beach) {
            this.selectedBeach = beach;
            const markerData = this.markers.find(m => m.beach.id === beachId);

            if (markerData) {
                this.map.panTo({ lat: beach.lat, lng: beach.lng });
                this.map.setZoom(13);
                this.showBeachInfo(beach, markerData.marker);
            }
        }
    }
}

// Initialize
let modernBeachMap;

function initModernBeachMap() {
    if (typeof google === 'undefined') {
        console.error('Google Maps not loaded');
        return;
    }
    modernBeachMap = new ModernBeachMap();
    modernBeachMap.init();
}

// Auto-initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initModernBeachMap, 500);
    });
} else {
    setTimeout(initModernBeachMap, 500);
}
