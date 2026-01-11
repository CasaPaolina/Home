// Casa Paolina Guest Information Page JavaScript

// Casa Paolina location - Uggiano la Chiesa
const CASA_PAOLINA = {
    lat: 40.102558,
    lng: 18.446024,
    name: "Casa Paolina"
};

// Cached guest geolocation for faster directions
let guestLastPosition = null;

// Markers for beach map (used for filtering)
let beachMarkers = [];

// Calculate distance between two points (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Beach data with coordinates and wind protection
const beaches = [
    // Adriatic Coast (East)
    {
        name: "Torre dell'Orso",
        lat: 40.272169,
        lng: 18.430545,
        type: "Sabbia fine",
        sheltered: ['W', 'SW', 'NW'],
        exposed: ['E', 'NE', 'SE'],
        description: "Spiaggia sabbiosa con acque cristalline",
        translationKey: 'beach_torre_dellorso_desc',
        distance: "15 km",
        booking: "https://www.spiagge.it/puglia/lecce/torre-dell-orso"
    },

    {
        name: "Faraglioni di Sant'Andrea",
        lat: 40.256684,
        lng: 18.444069,
        type: "Scogliera",
        sheltered: ['W', 'SW', 'S'],
        exposed: ['E', 'NE', 'N'],
        description: "Faraglioni spettacolari e acque turchesi",
        translationKey: 'beach_torre_santandrea_desc',
        distance: "18 km",
        booking: null
    },
    {
        name: "Baia dei Turchi",
        lat: 40.193550,
        lng: 18.463585,
        type: "Sabbia bianca",
        sheltered: ['E', 'SE', 'NE'],
        exposed: ['W', 'NW', 'SW'],
        description: "Baia incontaminata circondata da pineta",
        translationKey: 'beach_baia_dei_turchi_desc',
        distance: "12 km",
        booking: null
    },
    {
        name: "Laghi Alimini",
        lat: 40.200025,
        lng: 18.459818,
        type: "Sabbia dorata",
        sheltered: ['W', 'SW'],
        exposed: ['E', 'NE', 'SE'],
        description: "Lunga spiaggia tra mare e laghi",
        translationKey: 'beach_alimini_desc',
        distance: "13 km",
        booking: "https://www.spiagge.it/puglia/lecce/alimini"
    },
    {
        name: "Porto Badisco",
        lat: 40.079442,
        lng: 18.482903,
        type: "Ciottoli",
        sheltered: ['W', 'NW', 'N'],
        exposed: ['E', 'SE', 'S'],
        description: "Baia storica protetta",
        translationKey: 'beach_porto_badisco_desc',
        distance: "8 km",
        booking: null
    },
    {
        name: "Castro Marina",
        lat: 40.001464,
        lng: 18.425111,
        type: "Scogliera",
        sheltered: ['W', 'NW'],
        exposed: ['E', 'SE', 'S'],
        description: "Grotte marine e scogliere",
        translationKey: 'beach_castro_desc',
        distance: "10 km",
        booking: "https://www.spiagge.it/puglia/lecce/castro"
    },
    {
        name: "Porto Miggiano",
        lat: 40.032276,
        lng: 18.446058,
        type: "Scogliera",
        sheltered: ['W', 'NW'],
        exposed: ['E', 'SE', 'S'],
        description: "Insenatura naturale con acque limpide",
        translationKey: 'beach_porto_miggiano_desc',
        distance: "10 km",
        booking: null
    },
    {
        name: "Porto Selvaggio",
        lat: 40.147889,
        lng: 17.975022,
        type: "Scogliera",
        sheltered: ['W', 'NW'],
        exposed: ['E', 'SE', 'S'],
        description: "insenatura naturale con acqua cristallina",
        translationKey: 'beach_porto_selvaggio_desc',
        distance: "--",
        booking: null
    },
    {
        name: "Baia dell'orte",
        lat: 40.133054,
        lng: 18.513057,
        type: "Scogliera",
        sheltered: ['W', 'NW'],
        exposed: ['E', 'SE', 'S'],
        description: "Insenatura naturale con acqua cristallina",
        translationKey: 'beach_baia_dell_orte_desc',
        distance: "5 km",
        booking: null
    },
    {
        name: "Marina Serra",
        lat: 39.911808,
        lng: 18.393354,
        type: "Scogliera",
        sheltered: ['W', 'NW'],
        exposed: ['E', 'SE', 'S'],
        description: "Piscina naturale con acqua cristallina",
        translationKey: 'beach_marina_serra_desc',
        distance: "15 km",
        booking: null
    },
    {
        name: "Cala dell'Acquaviva",
        lat: 39.991484,
        lng: 18.413863,
        type: "Scogliera",
        sheltered: ['W', 'NW'],
        exposed: ['E', 'SE', 'S'],
        description: "Insenatura naturale con acque limpide",
        translationKey: 'beach_cala_dell_acquaviva_desc',
        distance: "10 km",
        booking: null
    },
    {
        name: "Grotta della Poesia",
        lat: 40.285822,
        lng: 18.429564,
        type: "Scogliera",
        sheltered: ['W', 'NW'],
        exposed: ['E', 'SE', 'S'],
        description: "Cavità naturale con acque limpide",
        translationKey: 'beach_grotta_della_poesia_desc',
        distance: "10 km",
        booking: null
    },
    {
        name: "Grotta Verde",
        lat: 39.963653,
        lng: 18.404100,
        type: "Scogliera",
        sheltered: ['W', 'NW'],
        exposed: ['E', 'SE', 'S'],
        description: "Grotta naturale con luminescenze verdi",
        translationKey: 'beach_grotta_verde_desc',
        distance: "10 km",
        booking: null
    },
    
    {
        name: "Santa Cesarea Terme",
        lat: 40.0333,
        lng: 18.4500,
        type: "Scogliera",
        sheltered: ['W', 'NW', 'N'],
        exposed: ['E', 'SE'],
        description: "Terme naturali e mare cristallino",
        translationKey: 'beach_santa_cesarea_desc',
        distance: "12 km",
        booking: null
    },
    {
        name: "Spiaggia dei Gradoni",
        lat: 40.149091,
        lng: 18.486969,
        type: "Sabbia e scogliera",
        sheltered: ['W', 'SW', 'NW'],
        exposed: ['E', 'NE', 'SE'],
        description: "Spiagge cittadine e calette",
        translationKey: 'beach_otranto_desc',
        distance: "10 km",
        booking: null
    },
    // Ionian Coast (West)
    {
        name: "Gallipoli - Baia Verde",
        lat: 40.0500,
        lng: 17.9833,
        type: "Sabbia fine",
        sheltered: ['E', 'NE', 'SE'],
        exposed: ['W', 'SW', 'NW'],
        description: "Lunga spiaggia sabbiosa movida estiva",
        distance: "55 km",
        booking: "https://www.spiagge.it/puglia/lecce/gallipoli"
    },
    {
        name: "Gallipoli - Punta della Suina",
        lat: 40.0167,
        lng: 17.9500,
        type: "Sabbia dorata",
        sheltered: ['E', 'NE', 'N'],
        exposed: ['W', 'SW', 'S'],
        description: "Baia protetta con sabbia dorata",
        distance: "58 km",
        booking: null
    },
    {
        name: "Porto Cesareo",
        lat: 40.2667,
        lng: 17.9000,
        type: "Sabbia bianca",
        sheltered: ['E', 'NE', 'SE'],
        exposed: ['W', 'SW', 'NW'],
        description: "Riserva marina con acque trasparenti",
        distance: "62 km",
        booking: "https://www.spiagge.it/puglia/lecce/porto-cesareo"
    },
    {
        name: "Santa Maria al Bagno",
        lat: 40.1833,
        lng: 17.9667,
        type: "Scogliera bassa",
        sheltered: ['E', 'NE'],
        exposed: ['W', 'SW', 'S'],
        description: "Scogliere e calette romantiche",
        distance: "50 km",
        booking: null
    },
    {
        name: "Santa Caterina",
        lat: 40.0667,
        lng: 18.0333,
        type: "Scogliera",
        sheltered: ['E', 'NE', 'SE'],
        exposed: ['W', 'SW'],
        description: "Scogliere e grotte naturali",
        distance: "48 km",
        booking: null
    },
    {
        name: "Torre San Giovanni",
        lat: 39.9333,
        lng: 18.0833,
        type: "Sabbia fine",
        sheltered: ['E', 'NE'],
        exposed: ['W', 'SW', 'NW'],
        description: "Spiaggia sabbiosa per famiglie",
        distance: "45 km",
        booking: null
    }
];

// Points of Interest with categories
const pointsOfInterest = [
    // Movida Locale
    { name: "Avamposto", address: "Via Dante De Blasi, Uggiano La Chiesa", lat: 40.0975, lng: 18.3920, category: "nightlife" },
    { name: "Skafe al Casotto", address: "Via Bastione Pelasgi, 12, Otranto", lat: 40.1436, lng: 18.4916, category: "nightlife" },
    { name: "Spinnaker", address: "Via Filippo Turati, 3, Torre dell'Orso", lat: 40.2667, lng: 18.4167, category: "nightlife" },
    { name: "La Casaccia", address: "Otranto", lat: 40.1430, lng: 18.4900, category: "nightlife" },
    { name: "Blu Bay", address: "Via Sant'Antonio, Castro", lat: 40.0167, lng: 18.4300, category: "nightlife" },
    { name: "Guendalina", address: "SP259, Santa Cesarea Terme", lat: 40.0333, lng: 18.4500, category: "nightlife" },
    { name: "Malé", address: "Via Pola, 40, Santa Cesarea Terme", lat: 40.0340, lng: 18.4510, category: "nightlife" },

    // Luoghi da Visitare
    { name: "Lecce", address: "Città barocca", lat: 40.3515, lng: 18.1750, category: "attractions", description: "Città barocca con architettura storica" },
    { name: "Gallipoli", address: "Città costiera", lat: 40.0556, lng: 17.9922, category: "attractions", description: "Città costiera sul Mar Ionio" },
    { name: "Santa Maria di Leuca", address: "Punta estrema", lat: 39.7972, lng: 18.3611, category: "attractions", description: "Punta estrema del Salento" },
    { name: "Otranto", address: "Città storica", lat: 40.1436, lng: 18.4908, category: "attractions", description: "Città storica sul mare Adriatico" },
    { name: "Cava di Bauxite", address: "Otranto", lat: 40.1100, lng: 18.4700, category: "attractions", description: "Lago verde smeraldo - 15km" },
    { name: "Grotta Zinzulusa", address: "Castro", lat: 40.0083, lng: 18.4250, category: "attractions", description: "Grotta marina spettacolare" },
    { name: "Punta Palascia", address: "Otranto", lat: 40.1083, lng: 18.5194, category: "attractions", description: "Punto più a est d'Italia" },

    // Spiagge (Beach category from beaches array)
    ...beaches.map(beach => ({
        name: beach.name,
        address: beach.description,
        lat: beach.lat,
        lng: beach.lng,
        category: "beaches",
        description: beach.description
    })),

    // Servizi
    { name: "Supermercato Conad", address: "Uggiano la Chiesa", lat: 40.0970, lng: 18.3915, category: "services" },
    { name: "Farmacia", address: "Uggiano la Chiesa", lat: 40.0968, lng: 18.3910, category: "services" },
    { name: "Lavanderia Self-Service", address: "Via Roma, Uggiano la Chiesa", lat: 40.0965, lng: 18.3905, category: "services" }
];

// Fetch weather forecast for 2 days
async function fetchWeatherForecast() {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${CASA_PAOLINA.lat}&longitude=${CASA_PAOLINA.lng}&hourly=windspeed_10m,winddirection_10m&timezone=Europe/Rome&forecast_days=2`
        );
        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }
        const data = await response.json();

        // Update dates
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        document.getElementById('today-date').textContent = today.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        document.getElementById('tomorrow-date').textContent = tomorrow.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

        const hourlyData = data.hourly;

        // Today's forecast
        const todaySlots = {
            morning: findTimeSlotAverageForDay(hourlyData, 0, 9, 12),
            noon: findTimeSlotAverageForDay(hourlyData, 0, 12, 15),
            afternoon: findTimeSlotAverageForDay(hourlyData, 0, 15, 18)
        };

        updateWindDisplay('morning-today', todaySlots.morning);
        updateWindDisplay('noon-today', todaySlots.noon);
        updateWindDisplay('afternoon-today', todaySlots.afternoon);

        // Tomorrow's forecast
        const tomorrowSlots = {
            morning: findTimeSlotAverageForDay(hourlyData, 1, 9, 12),
            noon: findTimeSlotAverageForDay(hourlyData, 1, 12, 15),
            afternoon: findTimeSlotAverageForDay(hourlyData, 1, 15, 18)
        };

        updateWindDisplay('morning-tomorrow', tomorrowSlots.morning);
        updateWindDisplay('noon-tomorrow', tomorrowSlots.noon);
        updateWindDisplay('afternoon-tomorrow', tomorrowSlots.afternoon);

        // Beach recommendations for today
        const avgWindDirectionToday = getWindDirection((todaySlots.morning.direction + todaySlots.noon.direction + todaySlots.afternoon.direction) / 3);
        const avgWindSpeedToday = (todaySlots.morning.speed + todaySlots.noon.speed + todaySlots.afternoon.speed) / 3;
        recommendTop3Beaches(avgWindDirectionToday, avgWindSpeedToday, 'today');

        // Beach recommendations for tomorrow
        const avgWindDirectionTomorrow = getWindDirection((tomorrowSlots.morning.direction + tomorrowSlots.noon.direction + tomorrowSlots.afternoon.direction) / 3);
        const avgWindSpeedTomorrow = (tomorrowSlots.morning.speed + tomorrowSlots.noon.speed + tomorrowSlots.afternoon.speed) / 3;
        recommendTop3Beaches(avgWindDirectionTomorrow, avgWindSpeedTomorrow, 'tomorrow');

    } catch (error) {
        console.error('Error fetching weather:', error);
        displayWeatherError();
    }
}

// Find average wind speed and direction for a specific day and time slot
function findTimeSlotAverageForDay(hourlyData, dayOffset, startHour, endHour) {
    const times = hourlyData.time;
    let totalSpeed = 0;
    let totalDirection = 0;
    let count = 0;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const targetDay = targetDate.getDate();

    times.forEach((time, index) => {
        const datetime = new Date(time);
        const hour = datetime.getHours();
        const day = datetime.getDate();

        if (day === targetDay && hour >= startHour && hour < endHour) {
            totalSpeed += hourlyData.windspeed_10m[index];
            totalDirection += hourlyData.winddirection_10m[index];
            count++;
        }
    });

    return {
        speed: count > 0 ? Math.round(totalSpeed / count) : 0,
        direction: count > 0 ? totalDirection / count : 0
    };
}

// Update wind display for a time slot
function updateWindDisplay(slot, windData) {
    const direction = getWindDirection(windData.direction);
    const speed = windData.speed;

    // Update wind arrow rotation
    const arrow = document.getElementById(`wind-${slot}`);
    if (arrow) {
        arrow.style.transform = `rotate(${windData.direction}deg)`;
    }

    // Update wind direction text
    const dirElement = document.getElementById(`wind-dir-${slot}`);
    if (dirElement) {
        const dirKey = `wind_${direction.toLowerCase()}`;
        dirElement.textContent = guestTranslations[currentGuestLang][dirKey] || direction;
    }

    // Update wind speed
    const speedElement = document.getElementById(`wind-speed-${slot}`);
    if (speedElement) {
        speedElement.textContent = `${speed} km/h`;
    }
}

// Convert degrees to cardinal direction
function getWindDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

// Recommend top 3 beaches based on wind conditions
function recommendTop3Beaches(windDirection, windSpeed, day) {
    // Score each beach based on wind protection
    const scoredBeaches = beaches.map(beach => {
        let score = 50; // Base score

        // Higher score if sheltered from current wind
        if (beach.sheltered.includes(windDirection)) {
            score += 30;
        }

        // Lower score if exposed to current wind
        if (beach.exposed.includes(windDirection)) {
            score -= 20;
        }

        // Bonus for closer beaches
        const distance = parseFloat(beach.distance);
        if (distance < 15) score += 15;
        else if (distance < 30) score += 10;
        else if (distance < 50) score += 5;

        // Consider wind speed
        if (windSpeed > 20) {
            // Strong wind - prefer sheltered beaches
            if (beach.sheltered.includes(windDirection)) score += 20;
            // Penalize exposed beaches more
            if (beach.exposed.includes(windDirection)) score -= 30;
        }

        // Bonus for beaches with facilities
        if (beach.booking) score += 5;

        return { ...beach, score };
    });

    // Sort by score and get top 3
    const top3 = scoredBeaches.sort((a, b) => b.score - a.score).slice(0, 3);

    displayTop3BeachesCompact(top3, day);
}

// Candidates-based beach image helpers: prefer data images, then predictable files, then placeholder
window.getBeachImageCandidates = function getBeachImageCandidates(beach) {
    const candidates = [];
    // explicit images from data
    if (beach.images && beach.images.length) candidates.push(`images/${beach.images[0]}`);
    if (beach.image) candidates.unshift(beach.image);

    // predictable filenames based on id or name
    const raw = (beach.id || beach.name || '').toString().toLowerCase();
    const slug = raw.replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    const underscore = slug.replace(/-/g, '_');

    if (slug) {
        // prefer jpgs, include png and webp as fallbacks
        candidates.push(
            `images/${slug}.jpg`,
            `images/${slug}.png`,
            `images/${slug}.webp`,
            `images/${underscore}.jpg`,
            `images/${underscore}.png`,
            `images/${underscore}.webp`,
            `images/${slug.replace(/-/g, '_')}.jpg`,
            // common local naming patterns
            `images/spiaggia-${slug}.jpg`,
            `images/spiaggia_${slug}.jpg`,
            `images/spiaggia-${slug}.webp`
        );
    }

    // Heuristic: try last token of name (e.g., 'Baia dell'orte' -> 'orte.jpg')
    try {
        const tokens = raw.split(/\s+/).filter(Boolean);
        const last = tokens[tokens.length - 1];
        if (last) {
            candidates.push(`images/${last}.jpg`, `images/${last}.png`, `images/${last}.webp`);
        }
    } catch (e) {}

    // final fallback (use an existing JPG placeholder)
    candidates.push('images/celeste1.jpg');

    // unique and return
    return [...new Set(candidates)];
};

// Old waste collection functions removed - now using calendar view



// Error handler for img elements; tries next fallback candidate
window.handleBeachImgError = function handleBeachImgError(img) {
    try {
        const fallbacks = (img.dataset.fallbacks || '').split('|');
        let idx = parseInt(img.dataset.current || '0', 10);
        idx++;
        if (idx < fallbacks.length) {
            img.dataset.current = idx;
            img.src = fallbacks[idx];
        } else {
            img.src = 'images/celeste1.jpg';
        }
    } catch (e) {
        img.src = 'images/celeste1.jpg';
    }
};

// Backwards compatibility: first candidate
window.getBeachImageSrc = function getBeachImageSrc(beach) {
    const c = window.getBeachImageCandidates(beach);
    return c.length ? c[0] : '';
};

// Display compact beach recommendations for today/tomorrow (no numbering) — uses fallback-enabled <img>
function displayTop3BeachesCompact(beaches, day) {
    const container = document.getElementById(`recommended-beaches-${day}`);
    if (!container) return;

    container.innerHTML = beaches.map((beach) => {
        const escapedName = beach.name.replace(/'/g, "\\'");
        const candidates = window.getBeachImageCandidates(beach);
        const first = candidates[0];
        const dataFallbacks = candidates.join('|');
        const imageHTML = `<img src="${first}" data-fallbacks="${dataFallbacks}" data-current="0" onerror="handleBeachImgError(this)" alt="${beach.name}" class="beach-thumbnail">`;

        return `<div class="beach-compact-item">
            ${imageHTML}
            <div class="beach-info">
                <span class="beach-name-link" onclick="showBeachPopup('${escapedName}')">${beach.name}</span>
                <div class="beach-distance">${beach.distance}</div>
            </div>
        </div>`;
    }).join('');
} 

// Make function globally available
window.showBeachPopup = showBeachPopup;
window.closeBeachPopup = closeBeachPopup;

// Common renderer: returns HTML for a beach popup (used by both overlay and marker popups)
window.getBeachPopupHTML = function getBeachPopupHTML(beach, options = {}) {
    const bookingUrl = beach.bookingLink || beach.booking || '';
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${CASA_PAOLINA.lat},${CASA_PAOLINA.lng}&destination=${beach.lat},${beach.lng}`;
    const sandTypeRaw = (beach.sandType || beach.type || '').toString().toLowerCase();
    const isSand = sandTypeRaw.includes('sand') || sandTypeRaw.includes('sabbia') || sandTypeRaw === '';
    // Use same candidate fallback logic as compact list for the popup image
    const candidates = (typeof window.getBeachImageCandidates === 'function') ? window.getBeachImageCandidates(beach) : ((beach.images && beach.images.length) ? [beach.images[0]] : []);
    const firstImg = candidates[0] || '';
    const dataFallbacks = candidates.join('|');

    const bookingBtn = bookingUrl ? `<a href="${bookingUrl}" target="_blank" class="popup-btn popup-btn-primary">Prenota ora</a>` : '';

    // Image block: try first candidate and let onerror walk fallbacks
    const imageBlock = firstImg ? `
        <div class="popup-image"><img src="${firstImg}" data-fallbacks="${dataFallbacks}" data-current="0" onerror="handleBeachImgError(this)" alt="${beach.name}" loading="lazy"></div>
    ` : `
        <div class="popup-image placeholder">
            <svg width="80" height="56" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect width="24" height="16" rx="2" fill="#e6f6f5" />
                <path d="M3 11l3.5-4.5L9 11l3-4 4 6H3z" fill="#a7d6d3"/>
            </svg>
        </div>
    `;

    return `
        <div class="beach-popup ${options.inline ? 'inline' : ''}">
            ${imageBlock}
            <div class="popup-body">
                <h3>${beach.name}</h3>
                <p class="popup-type">${isSand ? '🏖️ Sabbia' : '🪨 Scogliera'}</p>
                <p class="popup-distance">📍 ${beach.distance} da Casa Paolina</p>
                <p class="popup-description">${beach.description}</p>
                ${beach.facilities && beach.facilities.length > 0 ? `<div class="popup-facilities"><strong>Servizi:</strong> ${beach.facilities.map(f => getFacilityLabel(f)).join(', ')}</div>` : ''}
                <div class="popup-actions">
                    <a href="${directionsUrl}" target="_blank" class="popup-btn popup-btn-secondary">Portami qui</a>
                    ${bookingBtn}
                </div>
            </div>
        </div>
    `;
};

// Show beach popup with details (overlay)
function showBeachPopup(beachName) {
    // Find beach data from locations; fallback to local beaches if necessary
    let beach = null;
    if (locationsData && locationsData.loaded) {
        const remoteBeaches = locationsData.getBeaches();
        beach = remoteBeaches.find(b => b.name === beachName);
    }

    if (!beach) {
        // try local beaches array
        beach = beaches.find(b => b.name === beachName || (b.name && b.name.includes(beachName)) || (beachName && beachName.includes(b.name)));
    }

    if (!beach) {
        console.error('Beach not found:', beachName);
        return;
    }

    const popupHTML = `
        <div class="beach-popup-overlay" onclick="closeBeachPopup()">
            <div class="beach-popup-content" onclick="event.stopPropagation()">
                <button class="popup-close" onclick="closeBeachPopup()">×</button>
                ${window.getBeachPopupHTML(beach)}
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', popupHTML);
}

function closeBeachPopup() {
    const popup = document.querySelector('.beach-popup-overlay');
    if (popup) {
        popup.remove();
    }
}

function getFacilityLabel(facility) {
    const labels = {
        'parking': 'Parcheggio',
        'restaurants': 'Ristoranti',
        'umbrellas': 'Ombrelloni',
        'sunbeds': 'Lettini',
        'beach_bar': 'Bar',
        'beach_clubs': 'Stabilimenti',
        'water_sports': 'Sport acquatici',
        'boat_tours': 'Tour in barca',
        'diving': 'Immersioni',
        'showers': 'Docce',
        'thermal_spa': 'Terme',
        'hiking': 'Escursioni',
        'nature_reserve': 'Riserva naturale'
    };
    return labels[facility] || facility;
}

// Display top 3 beach recommendations (for "All Beaches" section)
function displayTop3Beaches(beaches, windDirection) {
    const container = document.getElementById('recommended-beaches');
    if (!container) return;

    container.innerHTML = beaches.map((beach, index) => {
        const reason = beach.sheltered.includes(windDirection)
            ? guestTranslations[currentGuestLang].beach_reason_protected || "Protetta dal vento attuale"
            : guestTranslations[currentGuestLang].beach_reason_conditions || "Condizioni ideali oggi";

        const bookingLink = beach.booking
            ? `<div class="beach-booking">
                <a href="${beach.booking}" target="_blank">
                    ${guestTranslations[currentGuestLang].book_beach || "Prenota"}
                </a>
               </div>`
            : '';

        return `
            <div class="beach-card">
                <h4>${beach.name}</h4>
                <span class="beach-type">${beach.type}</span>
                <p><strong>📍</strong> ${beach.distance} ${guestTranslations[currentGuestLang].from_casa || "da Casa Paolina"}</p>
                <p>${beach.description}</p>
                <p><strong>✓</strong> ${reason}</p>
                ${bookingLink}
            </div>
        `;
    }).join('');
}

// Display weather error
function displayWeatherError() {
    ['morning', 'noon', 'afternoon'].forEach(slot => {
        const dirElement = document.getElementById(`wind-dir-${slot}`);
        const speedElement = document.getElementById(`wind-speed-${slot}`);
        if (dirElement) dirElement.textContent = '--';
        if (speedElement) speedElement.textContent = '--';
    });
}

// Initialize POI Map
function initPOIMap() {
    const mapElement = document.getElementById('poi-map');
    if (!mapElement) return;

    // Create map centered on Casa Paolina
    const map = L.map('poi-map').setView([CASA_PAOLINA.lat, CASA_PAOLINA.lng], 11);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add Casa Paolina marker
    const homeIcon = L.divIcon({
        html: '🏠',
        className: 'custom-marker',
        iconSize: [30, 30]
    });

    L.marker([CASA_PAOLINA.lat, CASA_PAOLINA.lng], { icon: homeIcon })
        .bindPopup('<b>Casa Paolina</b><br>Via Dante De Blasi, 15')
        .addTo(map);

    // Category icons
    const categoryIcons = {
        nightlife: '🍹',
        attractions: '🏛️',
        beaches: '🏖️',
        excursions: '🥾',
        services: '🛒'
    };

    // Add all POI markers
    const markers = {};
    pointsOfInterest.forEach(poi => {
        const icon = L.divIcon({
            html: categoryIcons[poi.category] || '📍',
            className: 'custom-marker',
            iconSize: [25, 25]
        });

        const marker = L.marker([poi.lat, poi.lng], { icon })
            .bindPopup(`<b>${poi.name}</b><br>${poi.address}`);

        if (!markers[poi.category]) {
            markers[poi.category] = L.layerGroup().addTo(map);
        }
        marker.addTo(markers[poi.category]);
    });

    // Filter functionality
    const filterButtons = document.querySelectorAll('.poi-filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');

            // Update active button
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show/hide markers
            if (category === 'all') {
                Object.values(markers).forEach(layer => map.addLayer(layer));
            } else {
                Object.keys(markers).forEach(cat => {
                    if (cat === category) {
                        map.addLayer(markers[cat]);
                    } else {
                        map.removeLayer(markers[cat]);
                    }
                });
            }
        });
    });

    // Category visibility based on filters
    const categoryElements = document.querySelectorAll('.poi-category');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');

            categoryElements.forEach(catEl => {
                const catId = catEl.id.replace('cat-', '');
                if (category === 'all' || category === catId) {
                    catEl.style.display = 'block';
                } else {
                    catEl.style.display = 'none';
                }
            });
        });
    });
}

// Display current date
function displayCurrentDate() {
    const dateDisplay = document.getElementById('current-date-display');
    if (!dateDisplay) return;

    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    // Get language from localStorage or default to Italian
    const lang = localStorage.getItem('guestLanguage') || 'it';
    const locale = {
        'it': 'it-IT',
        'en': 'en-US',
        'es': 'es-ES',
        'de': 'de-DE',
        'fr': 'fr-FR'
    }[lang] || 'it-IT';

    const dateString = now.toLocaleDateString(locale, options);

    // Add emoji based on day of week
    const dayEmojis = ['📅', '📆', '🗓️', '📋', '📊', '📈', '📉'];
    const emoji = dayEmojis[now.getDay()];

    dateDisplay.textContent = `${emoji} ${dateString}`;
}

// Removed - highlighting handled in calendar view

// Open Google Maps directions from current device location to destination
function navigateTo(destLat, destLng, destName) {
    // Open a blank window synchronously to avoid popup blocking in browsers like Safari
    const win = window.open('', '_blank');
    if (!win) {
        alert(guestTranslations[currentGuestLang] && guestTranslations[currentGuestLang].get_directions ? guestTranslations[currentGuestLang].get_directions + ' — consenti popup' : 'Consenti popup per aprire le indicazioni');
        return;
    }

    // If we already have the guest position, use it immediately
    if (guestLastPosition && guestLastPosition.lat && guestLastPosition.lng) {
        const url = `https://www.google.com/maps/dir/?api=1&origin=${guestLastPosition.lat},${guestLastPosition.lng}&destination=${destLat},${destLng}&travelmode=driving`;
        try { win.location.href = url; } catch (e) { window.location.href = url; }
        return;
    }

    const openWithOrigin = (originLat, originLng) => {
        const url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
        try { win.location.href = url; } catch (e) { window.location.href = url; }
    };

    const fallback = () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
        try { win.location.href = url; } catch (e) { window.location.href = url; }
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            openWithOrigin(pos.coords.latitude, pos.coords.longitude);
        }, (err) => {
            fallback();
        }, { timeout: 10000 });
    } else {
        fallback();
    }
}

// Delegated handler for 'Portami qui' buttons inside popups
document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.btn-get-directions');
    if (!btn) return;
    const lat = btn.getAttribute('data-lat');
    const lng = btn.getAttribute('data-lng');
    const name = btn.getAttribute('data-name') || '';
    if (lat && lng) {
        navigateTo(lat, lng, name);
    }
});

// Initialize beaches map
function initBeachesMap() {
    const mapElement = document.getElementById('beaches-map');
    if (!mapElement) return;

    // Create map centered on Salento
    const map = L.map('beaches-map').setView([40.15, 18.25], 10);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add Casa Paolina marker
    const homeIcon = L.divIcon({
        html: '🏠',
        className: 'custom-marker',
        iconSize: [30, 30]
    });

    L.marker([CASA_PAOLINA.lat, CASA_PAOLINA.lng], { icon: homeIcon })
        .bindPopup('<b>Casa Paolina</b><br>Via Dante De Blasi, 15')
        .addTo(map);

    // Add beach markers
    const beachIcon = L.divIcon({
        html: '🏖️',
        className: 'custom-marker',
        iconSize: [25, 25]
    });

    beaches.forEach(beach => {
        const popupContent = `
            <div style="min-width: 200px;">
                ${beach.name === 'Porto Badisco' ? `<img src="images/spiaggia-porto-badisco.jpg" alt="${beach.name}" style="width:100%; height:auto; border-radius:8px; margin-bottom:8px;">` : ''}
                ${beach.name === "Baia dell'orte" ? `<img src="images/orte.jpg" alt="${beach.name}" style="width:100%; height:auto; border-radius:8px; margin-bottom:8px;">` : ''}
                ${beach.name === "Porto Miggiano" ? `<img src="images/porto_miggiano.jpg" alt="${beach.name}" style="width:100%; height:auto; border-radius:8px; margin-bottom:8px;">` : ''}
                ${beach.name === "Marina Serra" ? `<img src="images/marina-serra.jpg" alt="${beach.name}" style="width:100%; height:auto; border-radius:8px; margin-bottom:8px;">` : ''}
                ${beach.name === "Santa Cesarea Terme" ? `<img src="images/santa-cesarea.jpg" alt="${beach.name}" style="width:100%; height:auto; border-radius:8px; margin-bottom:8px;">` : ''}
                ${beach.name === "Spiaggia dei Gradoni" ? `<img src="images/spiaggia_gradoni.jpg" alt="${beach.name}" style="width:100%; height:auto; border-radius:8px; margin-bottom:8px;">` : ''}
                ${beach.name === "Porto Selvaggio" ? `<img src="images/porto_selvaggio.jpg" alt="${beach.name}" style="width:100%; height:auto; border-radius:8px; margin-bottom:8px;">` : ''}
                <h4 style="margin: 0 0 10px 0; color: var(--primary-color);">${beach.name}</h4>
                <p style="margin: 5px 0;"><strong>Tipo:</strong> ${beach.type}</p>
                <p style="margin: 5px 0;"><strong>Distanza:</strong> ${(() => {
                    try {
                        if (guestLastPosition && guestLastPosition.lat && guestLastPosition.lng) {
                            const d = getDistance(guestLastPosition.lat, guestLastPosition.lng, beach.lat, beach.lng);
                            const suffix = (guestTranslations[currentGuestLang] && guestTranslations[currentGuestLang].from_you) || 'da te';
                            return `${Math.round(d)} km ${suffix}`;
                        } else {
                            const d = getDistance(CASA_PAOLINA.lat, CASA_PAOLINA.lng, beach.lat, beach.lng);
                            const suffix = (guestTranslations[currentGuestLang] && guestTranslations[currentGuestLang].from_casa_paolina) || 'da Casa Paolina';
                            return `${Math.round(d)} km ${suffix}`;
                        }
                    } catch (e) { return beach.distance; }
                })()}</p>
                <p style="margin: 5px 0;">${beach.description}</p>
                    ${beach.booking ? `<a href="${beach.booking}" target="_blank" style="display: inline-block; margin-top: 10px; padding: 5px 15px; background: var(--primary-color); color: white; border-radius: 5px; text-decoration: none;">Prenota</a>` : ''}
                    <div style="margin-top:8px;">
                        <button class="btn btn-secondary btn-get-directions" data-lat="${beach.lat}" data-lng="${beach.lng}" data-name="${beach.name.replace(/"/g, '&quot;')}">${guestTranslations[currentGuestLang] && guestTranslations[currentGuestLang].get_directions ? guestTranslations[currentGuestLang].get_directions : 'Portami qui'}</button>
                    </div>
            </div>
        `;

        const marker = L.marker([beach.lat, beach.lng], { icon: beachIcon })
            .bindPopup(popupContent)
            .addTo(map);

        // store marker with its type for filtering (normalize lowercase)
        beachMarkers.push({ marker, type: (beach.type || '').toLowerCase(), beach });
    });

    // Function to check if a beach matches the filter
    function beachMatchesFilter(beach, filter) {
        if (!filter || filter === 'all') return true;

        const typeStr = ((beach.sandType || beach.type) || '').toString().toLowerCase();
        const isCliff = typeStr.includes('rock') || typeStr.includes('scogl') || typeStr.includes('ciott') || typeStr.includes('pebbl');
        // Per your note: everything not classified as rock is considered sand
        const isSand = !isCliff;

        const isAdriatic = typeof beach.lng === 'number' ? beach.lng > 18.2 : false;
        const isIonian = typeof beach.lng === 'number' ? beach.lng <= 18.2 : false;

        if (filter === 'sand' && isSand) return true;
        if (filter === 'rocks' && isCliff) return true;
        if (filter === 'adriatic' && isAdriatic) return true;
        if (filter === 'ionian' && isIonian) return true;

        return false;
    }

    // Apply filter to map markers
    function applyBeachFilter(filter) {
        beachMarkers.forEach(({ marker, beach }) => {
            const show = beachMatchesFilter(beach, filter);
            if (show) {
                if (!map.hasLayer(marker)) map.addLayer(marker);
            } else {
                if (map.hasLayer(marker)) map.removeLayer(marker);
            }
        });

        // Update beach list
        updateBeachList(filter);
    }

    // Populate beach list below map
    function updateBeachList(filter) {
        const listContainer = document.getElementById('beaches-list');
        if (!listContainer) return;

        // Get all beaches that match the current filter
        const filteredBeaches = beaches.filter(beach => beachMatchesFilter(beach, filter));

        if (filteredBeaches.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">Nessuna spiaggia corrisponde al filtro selezionato.</p>';
            return;
        }

        listContainer.innerHTML = filteredBeaches.map(beach => {
            const escapedName = beach.name.replace(/'/g, "\\'");
            const candidates = window.getBeachImageCandidates(beach);
            const first = candidates[0];
            const dataFallbacks = candidates.join('|');

            const bookingBtn = beach.booking
                ? `<a href="${beach.booking}" target="_blank" class="beach-list-book-btn" onclick="event.stopPropagation();">Prenota</a>`
                : '';

            return `
                <div class="beach-list-item" onclick="showBeachPopup('${escapedName}')">
                    <img src="${first}" data-fallbacks="${dataFallbacks}" data-current="0" onerror="handleBeachImgError(this)" alt="${beach.name}" class="beach-list-img">
                    <div class="beach-list-content">
                        <div class="beach-list-name">${beach.name}</div>
                        <div class="beach-list-info">
                            <span class="beach-list-type">${beach.type}</span>
                            <span class="beach-list-distance">${beach.distance}</span>
                        </div>
                    </div>
                    ${bookingBtn}
                </div>
            `;
        }).join('');
    }

    // Wire up filter buttons (use the .beach-filter-btn class to match markup)
    document.querySelectorAll('.beach-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.beach-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.getAttribute('data-filter');
            applyBeachFilter(f);
        });
    });

    // Initial population of beach list
    updateBeachList('all');
}

// Note: Translation function moved to guest-translations.js for better organization

// Call functions on page load
document.addEventListener('DOMContentLoaded', () => {
    // Display current date
    displayCurrentDate();

    // Fetch weather and beach recommendations
    fetchWeatherForecast();

    // Initialize POI map
    initPOIMap();

    // Initialize beaches map
    initBeachesMap();

    // Refresh weather every 30 minutes
    setInterval(fetchWeatherForecast, 30 * 60 * 1000);

    // Try to read cached guest position from sessionStorage
    try {
        const cached = sessionStorage.getItem('guestPosition');
        if (cached) {
            const obj = JSON.parse(cached);
            if (obj && obj.lat && obj.lng) guestLastPosition = obj;
        }
    } catch (e) {}

    // Prompt user for geolocation on entering guest area to avoid later popup blocking
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            guestLastPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            try { sessionStorage.setItem('guestPosition', JSON.stringify(guestLastPosition)); } catch (e) {}
        }, (err) => {
            // user denied or error - ignore silently
        }, { timeout: 10000 });
    }

    // SVG Icons for waste materials
    const wasteSVGs = {
        plastic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
        paper: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
        glass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2h8l1 18H7L8 2z"/><line x1="7" y1="10" x2="17" y2="10"/></svg>`,
        indiff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
        organic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M8 12a4 4 0 0 0 8 0"/><path d="M12 2v20"/></svg>`
    };

    // Populate waste calendar dynamically with correct schedule
    function populateWasteCalendar() {
        const wasteData = [
            { day: 1, dayName: 'Lunedì', dayShort: 'LUN', materials: [{ name: 'Indifferenziato', type: 'indiff', desc: 'Tutto ciò che non è riciclabile' }] },
            { day: 2, dayName: 'Martedì', dayShort: 'MAR', materials: [{ name: 'Plastica e Metalli', type: 'plastic', desc: 'Bottiglie, flaconi, vaschette, lattine' }] },
            { day: 3, dayName: 'Mercoledì', dayShort: 'MER', materials: [{ name: 'Indifferenziato', type: 'indiff', desc: 'Rifiuti non riciclabili' }, { name: 'Vetro', type: 'glass', desc: 'Bottiglie e vasetti (senza tappi)' }] },
            { day: 4, dayName: 'Giovedì', dayShort: 'GIO', materials: [{ name: 'Carta e Cartone', type: 'paper', desc: 'Giornali, riviste, scatole appiattite' }] },
            { day: 5, dayName: 'Venerdì', dayShort: 'VEN', materials: [{ name: 'Plastica e Metalli', type: 'plastic', desc: 'Bottiglie, flaconi, vaschette, lattine' }] },
            { day: 6, dayName: 'Sabato', dayShort: 'SAB', materials: [{ name: 'Indifferenziato', type: 'indiff', desc: 'Rifiuti non riciclabili' }]
            }
        ];

        const calendarGrid = document.getElementById('waste-calendar-grid');
        if (!calendarGrid) return;

        const today = new Date().getDay();

        const calendarHTML = wasteData.map(({ day, dayName, dayShort, materials }) => {
            const isToday = day === today;
            const isEmpty = materials.length === 0;

            if (isEmpty) {
                return `<div class="waste-day-cell empty ${isToday ? 'today' : ''}" data-day="${day}">
                    <div class="day-header">
                        <span class="day-name">${dayShort}</span>
                        ${isToday ? '<span class="today-badge">Oggi</span>' : ''}
                    </div>
                    <div class="day-content">
                        <p class="no-collection">Nessuna raccolta</p>
                    </div>
                </div>`;
            }

            const materialsHTML = materials.map(m => `
                <div class="waste-material ${m.type}">
                    <div class="material-icon">${wasteSVGs[m.type]}</div>
                    <div class="material-info">
                        <h4>${m.name}</h4>
                        <p>${m.desc}</p>
                    </div>
                </div>
            `).join('');

            return `<div class="waste-day-cell ${isToday ? 'today' : ''}" data-day="${day}">
                <div class="day-header">
                    <span class="day-name">${dayShort}</span>
                    ${isToday ? '<span class="today-badge">Oggi</span>' : ''}
                </div>
                <div class="day-content">
                    ${materialsHTML}
                </div>
            </div>`;
        }).join('');

        calendarGrid.innerHTML = calendarHTML;

        // Add organic waste note
        if (!document.querySelector('.organic-note')) {
            const organicNote = document.createElement('div');
            organicNote.className = 'organic-note';
            organicNote.innerHTML = `
                <div class="organic-icon">${wasteSVGs.organic}</div>
                <div class="organic-text">
                    <strong>Organico:</strong> Raccolta quotidiana - Utilizzare sacchetti compostabili<br>
                    <strong>⏰ Nota:</strong> Mettere la spazzatura fuori la sera prima del giorno di raccolta
                </div>
            `;
            calendarGrid.parentElement.appendChild(organicNote);
        }
    }

    populateWasteCalendar();
});
