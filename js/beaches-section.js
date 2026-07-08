(function() {
    const ACTIVITY_LABELS = {
        it: { swim:'🏊 Nuoto', snorkel:'🤿 Snorkeling', dive:'🧜 Immersioni', family:'👨‍👩‍👧 Famiglie', nature:'🌿 Natura', hidden:'💎 Cala', sup:'🏄 SUP', nightlife:'🎶 Movida', thermal:'🌡️ Terme' },
        en: { swim:'🏊 Swimming', snorkel:'🤿 Snorkeling', dive:'🧜 Diving', family:'👨‍👩‍👧 Families', nature:'🌿 Nature', hidden:'💎 Hidden Cove', sup:'🏄 SUP', nightlife:'🎶 Nightlife', thermal:'🌡️ Thermal' },
        es: { swim:'🏊 Natación', snorkel:'🤿 Snorkel', dive:'🧜 Buceo', family:'👨‍👩‍👧 Familias', nature:'🌿 Naturaleza', hidden:'💎 Cala', sup:'🏄 SUP', nightlife:'🎶 Vida nocturna', thermal:'🌡️ Termas' },
        de: { swim:'🏊 Schwimmen', snorkel:'🤿 Schnorcheln', dive:'🧜 Tauchen', family:'👨‍👩‍👧 Familien', nature:'🌿 Natur', hidden:'💎 Bucht', sup:'🏄 SUP', nightlife:'🎶 Nachtleben', thermal:'🌡️ Therme' },
        fr: { swim:'🏊 Nage', snorkel:'🤿 Snorkeling', dive:'🧜 Plongée', family:'👨‍👩‍👧 Familles', nature:'🌿 Nature', hidden:'💎 Crique', sup:'🏄 SUP', nightlife:'🎶 Vie nocturne', thermal:'🌡️ Thermes' }
    };

    const FACILITY_ICONS = {
        parking:'🅿️', restaurants:'🍽️', umbrellas:'⛱️', sunbeds:'🪑', boat_tours:'⛵', diving:'🤿', water_sports:'🏄', beach_clubs:'🎪', beach_bar:'🍹', bar:'🍹', restaurant:'🍽️', showers:'🚿', hiking:'🥾', nature_reserve:'🌿', boat_access:'⛵', thermal_spa:'💆', playgrounds:'🛝'
    };

    const SAND_LABELS = {
        it: { fine_sand:'🏖️ Sabbia fine', golden_sand:'🏖️ Sabbia dorata', white_sand:'🏖️ Sabbia bianca', pebbles:'🪨 Ghiaia', rocks:'🪨 Scogliera' },
        en: { fine_sand:'🏖️ Fine sand', golden_sand:'🏖️ Golden sand', white_sand:'🏖️ White sand', pebbles:'🪨 Pebbles', rocks:'🪨 Rocky' },
        es: { fine_sand:'🏖️ Arena fina', golden_sand:'🏖️ Arena dorada', white_sand:'🏖️ Arena blanca', pebbles:'🪨 Guijarros', rocks:'🪨 Rocoso' },
        de: { fine_sand:'🏖️ Feinsand', golden_sand:'🏖️ Goldsand', white_sand:'🏖️ Weißer Sand', pebbles:'🪨 Kiesel', rocks:'🪨 Felsen' },
        fr: { fine_sand:'🏖️ Sable fin', golden_sand:'🏖️ Sable doré', white_sand:'🏖️ Sable blanc', pebbles:'🪨 Galets', rocks:'🪨 Rocheux' }
    };

    const SEA_LABELS = { adriatico: 'Adriatico', ionico: 'Ionico' };

    let currentActivity = 'all';
    let currentSort = 'distance';
    let allBeaches = [];

    function getLang() {
        const active = document.querySelector('.lang-btn.active');
        return active ? (active.dataset.lang || 'it') : 'it';
    }

    function renderBeaches() {
        const lang = getLang();
        const grid = document.getElementById('beaches-grid');
        const noResults = document.getElementById('beaches-no-results');
        if (!grid) return;

        let beaches = allBeaches.filter(b => {
            if (currentActivity === 'all') return true;
            return Array.isArray(b.activities) && b.activities.includes(currentActivity);
        });

        if (currentSort === 'distance') {
            beaches.sort((a, b) => (a.distanceNum || 999) - (b.distanceNum || 999));
        } else {
            beaches.sort((a, b) => a.name.localeCompare(b.name));
        }

        if (!beaches.length) {
            grid.innerHTML = '';
            if (noResults) noResults.style.display = 'block';
            return;
        }
        if (noResults) noResults.style.display = 'none';

        const actLabels = ACTIVITY_LABELS[lang] || ACTIVITY_LABELS.it;
        const sandL = SAND_LABELS[lang] || SAND_LABELS.it;
        const casaLat = 40.102558, casaLng = 18.446024;

        grid.innerHTML = beaches.map(b => {
            const imgSrc = b.images && b.images[0] ? `images/${b.images[0]}` : '';
            const desc = (lang === 'it' && b.description_it) ? b.description_it : (b.description || '');
            const seaClass = b.sea === 'ionico' ? 'beach-card__badge-sea--ionico' : 'beach-card__badge-sea--adriatico';
            const seaLabel = SEA_LABELS[b.sea] || '';
            const isClosest = b.distanceNum <= 5;
            const sandLabel = sandL[b.sandType] || '';

            const activities = (b.activities || []).slice(0, 3).map(a =>
                `<span class="bc-activity">${actLabels[a] || a}</span>`
            ).join('');

            const facilities = (b.facilities || []).slice(0, 4).map(f =>
                `<span class="bc-facility">${FACILITY_ICONS[f] || ''} ${f.replace(/_/g,' ')}</span>`
            ).join('');

            const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${casaLat},${casaLng}&destination=${b.lat},${b.lng}`;
            const bookBtn = b.bookingLink
                ? `<a href="${b.bookingLink}" target="_blank" class="bc-btn bc-btn--secondary">🎫 Prenota</a>`
                : `<a href="${mapsUrl}" target="_blank" class="bc-btn bc-btn--secondary">📍 Mappa</a>`;

            return `
            <div class="beach-card">
                <div class="beach-card__photo-wrap">
                    ${imgSrc ? `<img src="${imgSrc}" alt="${b.name}" loading="lazy">` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#2c7873,#1a6b55);display:flex;align-items:center;justify-content:center;font-size:3rem">🌊</div>`}
                    <span class="beach-card__badge-sea ${seaClass}">${seaLabel}</span>
                    <span class="beach-card__badge-dist">${b.distance}</span>
                    ${isClosest ? `<span class="beach-card__closest">⭐ La più vicina</span>` : ''}
                </div>
                <div class="beach-card__body">
                    <div class="beach-card__name">${b.name}</div>
                    ${sandLabel ? `<div class="beach-card__type">${sandLabel}</div>` : ''}
                    <p class="beach-card__desc">${desc}</p>
                    ${activities ? `<div class="beach-card__activities">${activities}</div>` : ''}
                    ${facilities ? `<div class="beach-card__facilities">${facilities}</div>` : ''}
                    <div class="beach-card__actions">
                        <a href="${mapsUrl}" target="_blank" class="bc-btn bc-btn--primary">🧭 Portami qui</a>
                        ${bookBtn}
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function initFilters() {
        document.querySelectorAll('.bf-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.bf-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentActivity = btn.dataset.activity;
                renderBeaches();
            });
        });

        const sortEl = document.getElementById('beach-sort');
        if (sortEl) {
            sortEl.addEventListener('change', () => {
                currentSort = sortEl.value;
                renderBeaches();
            });
        }
    }

    async function init() {
        if (!document.getElementById('beaches-grid')) return;

        if (typeof locationsData !== 'undefined') {
            if (!locationsData.loaded) await locationsData.load();
            allBeaches = locationsData.getBeaches ? locationsData.getBeaches() : [];
        } else if (typeof LOCATIONS_DATA !== 'undefined') {
            allBeaches = LOCATIONS_DATA.beaches || [];
        }

        renderBeaches();
        initFilters();

        // Re-render on language change
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => setTimeout(renderBeaches, 50));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 300));
    } else {
        setTimeout(init, 300);
    }
})();
