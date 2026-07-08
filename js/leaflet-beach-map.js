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

        this.map = L.map('beaches-map', {
            zoomControl: false,
            attributionControl: true
        }).setView([40.12, 18.28], 10);

        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // ESRI World Imagery — satellite tiles (same provider as marecalmo)
        L.tileLayer(
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                attribution: 'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community',
                maxZoom: 19
            }
        ).addTo(this.map);

        // ESRI World Boundaries and Places — labels/names overlay on satellite
        L.tileLayer(
            'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            { maxZoom: 19, pane: 'overlayPane' }
        ).addTo(this.map);

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

        this.addHomeMarker();
        this.addBeachMarkers();

        // Force Leaflet to recalculate container size after CSS paint
        setTimeout(() => this.map && this.map.invalidateSize(), 300);
    }

    addHomeMarker() {
        L.circleMarker([this.casaPaolina.lat, this.casaPaolina.lng], {
            radius: 10,
            fillColor: '#f4a261',
            color: '#fff',
            weight: 3,
            opacity: 1,
            fillOpacity: 1,
            zIndexOffset: 1000
        })
        .addTo(this.map)
        .bindTooltip('🏠 Casa Paolina', {
            permanent: true,
            direction: 'top',
            offset: [0, -14],
            className: 'mc-tooltip mc-tooltip--home'
        })
        .bindPopup(
            `<div style="font-weight:700;font-size:0.9rem">🏠 Casa Paolina</div>
             <div style="font-size:0.8rem;color:#64748b;margin-top:3px">${this.casaPaolina.address}</div>`,
            { maxWidth: 220, className: 'mc-leaflet-popup' }
        );
    }

    addBeachMarkers(filter = 'all') {
        this.markers.forEach(({ marker }) => this.map.removeLayer(marker));
        this.markers = [];

        const filteredBeaches = this.filterBeaches(filter);

        filteredBeaches.forEach(beach => {
            const isIonic   = beach.sea === 'ionico';
            const isClosest = (beach.distanceNum || 999) <= 5;
            const color     = isClosest ? '#e76f51'
                            : isIonic   ? '#0d6e8e'
                            :             '#2c7873';

            const marker = L.circleMarker([beach.lat, beach.lng], {
                radius: isClosest ? 9 : 7,
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
            })
            .bindPopup(this.createPopupContent(beach), {
                maxWidth: 280,
                className: 'mc-leaflet-popup'
            });

            marker._mcColor = color;
            marker.on('click', () => this.selectBeach(beach.id));
            this.markers.push({ marker, beach });
        });
    }

    createPopupContent(beach) {
        const ACTIVITY_LABELS = { swim:'🏊 Nuoto', snorkel:'🤿 Snorkeling', dive:'🧜 Immersioni', family:'👨‍👩‍👧 Famiglie', nature:'🌿 Natura', hidden:'💎 Cala', sup:'🏄 SUP', nightlife:'🎶 Movida', thermal:'🌡️ Terme' };
        const SAND_LABELS = { fine_sand:'🏖️ Sabbia fine', golden_sand:'🏖️ Sabbia dorata', white_sand:'🏖️ Sabbia bianca', pebbles:'🪨 Ghiaia', rocks:'🪨 Scogliera' };
        const FACILITY_ICONS = { parking:'🅿️', restaurants:'🍽️', umbrellas:'⛱️', sunbeds:'🪑', boat_tours:'⛵', diving:'🤿', water_sports:'🏄', beach_clubs:'🎪', beach_bar:'🍹', bar:'🍹', restaurant:'🍽️', showers:'🚿', hiking:'🥾', nature_reserve:'🌿', boat_access:'⛵', thermal_spa:'💆', playgrounds:'🛝' };

        const imageSrc = (beach.images && beach.images[0]) || beach.image || '';
        const desc = beach.description_it || beach.description || '';
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${this.casaPaolina.lat},${this.casaPaolina.lng}&destination=${beach.lat},${beach.lng}`;
        const seaLabel = beach.sea === 'ionico' ? 'Ionico' : 'Adriatico';
        const seaColor = beach.sea === 'ionico' ? '#0d6e8e' : '#1a94c4';
        const sandLabel = SAND_LABELS[beach.sandType] || '';

        const activities = (beach.activities || []).map(a =>
            `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:999px;font-size:0.7rem;font-weight:600;background:#e8f5f3;color:#1a6b55;border:1px solid #c2dedd">${ACTIVITY_LABELS[a] || a}</span>`
        ).join('');

        const facilities = (beach.facilities || []).slice(0, 5).map(f =>
            `<span>${FACILITY_ICONS[f] || ''}</span>`
        ).join(' ');

        const bookBtn = (beach.bookingLink || beach.booking)
            ? `<a href="${beach.bookingLink || beach.booking}" target="_blank" style="flex:1;padding:7px;border-radius:8px;font-size:0.75rem;font-weight:600;text-align:center;background:#f4f7f6;color:#1e293b;border:1px solid #e2e8f0;text-decoration:none">🎫 Prenota</a>`
            : '';

        return `<div style="width:260px;font-family:system-ui,sans-serif;padding:0;overflow:hidden">
            ${imageSrc ? `<div style="height:130px;overflow:hidden;position:relative;border-radius:4px 4px 0 0">
                <img src="images/${imageSrc}" alt="${beach.name}" style="width:100%;height:100%;object-fit:cover" loading="lazy">
                <span style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:999px">${beach.distance || ''}</span>
                <span style="position:absolute;top:8px;left:8px;background:${seaColor};color:#fff;font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.04em">${seaLabel}</span>
            </div>` : ''}
            <div style="padding:12px 14px">
                <div style="font-weight:700;font-size:0.95rem;color:#1e293b;margin-bottom:2px">${beach.name}</div>
                ${sandLabel ? `<div style="font-size:0.75rem;color:#64748b;margin-bottom:6px">${sandLabel}</div>` : ''}
                ${desc ? `<p style="font-size:0.78rem;color:#64748b;margin:0 0 8px;line-height:1.45">${desc}</p>` : ''}
                ${activities ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${activities}</div>` : ''}
                ${facilities ? `<div style="font-size:1rem;margin-bottom:10px;letter-spacing:2px">${facilities}</div>` : ''}
                <div style="display:flex;gap:6px">
                    <a href="${mapsUrl}" target="_blank" style="flex:1;padding:7px;border-radius:8px;font-size:0.75rem;font-weight:600;text-align:center;background:#2c7873;color:#fff;text-decoration:none">🧭 Portami qui</a>
                    ${bookBtn}
                </div>
            </div>
        </div>`;
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
        document.querySelectorAll('.beach-list-item').forEach(c => c.classList.remove('selected'));

        const item = document.querySelector(`[data-beach-id="${beachId}"]`);
        if (item) {
            item.classList.add('selected');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Reset all circle markers to original color/size
        this.markers.forEach(({ marker }) => {
            marker.setStyle({ color: '#fff', weight: 2.5, radius: marker._mcColor ? 7 : 7 });
        });

        const selectedBeachId = String(beachId);
        const beach = this.beaches.find(b => String(b.id) === selectedBeachId);
        if (beach) {
            const markerData = this.markers.find(m => String(m.beach.id) === selectedBeachId);
            if (markerData) {
                // Highlight selected: larger radius + gold ring
                markerData.marker.setStyle({ color: '#f4a261', weight: 3.5, radius: 11 });
                this.map.setView([beach.lat, beach.lng], 13, { animate: true });
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
