// Casa Paolina Guest Information Page JavaScript

// Casa Paolina location - Uggiano la Chiesa
const CASA_PAOLINA = {
    lat: 40.09726,
    lng: 18.39167,
    name: "Casa Paolina"
};

// Beach data with coordinates and wind protection
const beaches = [
    // Adriatic Coast (East)
    {
        name: "Torre dell'Orso",
        lat: 40.2667,
        lng: 18.4167,
        type: "Sabbia fine",
        sheltered: ['W', 'SW', 'NW'],
        exposed: ['E', 'NE', 'SE'],
        description: "Spiaggia sabbiosa con acque cristalline",
        distance: "15 km",
        booking: "https://www.lido-torredell'orso.it"
    },
    {
        name: "Torre Sant'Andrea",
        lat: 40.2833,
        lng: 18.4333,
        type: "Scogliera",
        sheltered: ['W', 'SW', 'S'],
        exposed: ['E', 'NE', 'N'],
        description: "Faraglioni spettacolari e acque turchesi",
        distance: "18 km",
        booking: null
    },
    {
        name: "Baia dei Turchi",
        lat: 40.1500,
        lng: 18.4833,
        type: "Sabbia bianca",
        sheltered: ['W', 'NW', 'SW'],
        exposed: ['E', 'SE', 'NE'],
        description: "Baia incontaminata circondata da pineta",
        distance: "12 km",
        booking: null
    },
    {
        name: "Laghi Alimini",
        lat: 40.1833,
        lng: 18.4667,
        type: "Sabbia dorata",
        sheltered: ['W', 'SW'],
        exposed: ['E', 'NE', 'SE'],
        description: "Lunga spiaggia tra mare e laghi",
        distance: "13 km",
        booking: "https://www.lidobaiaalimini.it"
    },
    {
        name: "Porto Badisco",
        lat: 40.0833,
        lng: 18.4500,
        type: "Ciottoli",
        sheltered: ['W', 'NW', 'N'],
        exposed: ['E', 'SE', 'S'],
        description: "Baia storica protetta",
        distance: "8 km",
        booking: null
    },
    {
        name: "Castro Marina",
        lat: 40.0167,
        lng: 18.4333,
        type: "Scogliera",
        sheltered: ['W', 'NW'],
        exposed: ['E', 'SE', 'S'],
        description: "Grotte marine e scogliere",
        distance: "10 km",
        booking: "https://www.lidocastro.it"
    },
    {
        name: "Santa Cesarea Terme",
        lat: 40.0333,
        lng: 18.4500,
        type: "Scogliera",
        sheltered: ['W', 'NW', 'N'],
        exposed: ['E', 'SE'],
        description: "Terme naturali e mare cristallino",
        distance: "12 km",
        booking: null
    },
    {
        name: "Otranto",
        lat: 40.1436,
        lng: 18.4908,
        type: "Sabbia e scogliera",
        sheltered: ['W', 'SW', 'NW'],
        exposed: ['E', 'NE', 'SE'],
        description: "Spiagge cittadine e calette",
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
        booking: "https://www.lidobaiaverde.it"
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
        booking: "https://www.lidoportocesareo.it"
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

// Fetch weather forecast for 3 time slots
async function fetchWeatherForecast() {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${CASA_PAOLINA.lat}&longitude=${CASA_PAOLINA.lng}&hourly=windspeed_10m,winddirection_10m&timezone=Europe/Rome&forecast_days=1`
        );
        const data = await response.json();

        const now = new Date();
        const hourlyData = data.hourly;

        // Find indices for morning (9-12), noon (12-15), afternoon (15-18)
        const timeSlots = {
            morning: findTimeSlotAverage(hourlyData, 9, 12),
            noon: findTimeSlotAverage(hourlyData, 12, 15),
            afternoon: findTimeSlotAverage(hourlyData, 15, 18)
        };

        updateWindDisplay('morning', timeSlots.morning);
        updateWindDisplay('noon', timeSlots.noon);
        updateWindDisplay('afternoon', timeSlots.afternoon);

        // Use average wind for beach recommendations
        const avgWindDirection = getWindDirection((timeSlots.morning.direction + timeSlots.noon.direction + timeSlots.afternoon.direction) / 3);
        const avgWindSpeed = (timeSlots.morning.speed + timeSlots.noon.speed + timeSlots.afternoon.speed) / 3;

        recommendTop3Beaches(avgWindDirection, avgWindSpeed);

    } catch (error) {
        console.error('Error fetching weather:', error);
        displayWeatherError();
    }
}

// Find average wind speed and direction for a time slot
function findTimeSlotAverage(hourlyData, startHour, endHour) {
    const times = hourlyData.time;
    let totalSpeed = 0;
    let totalDirection = 0;
    let count = 0;

    times.forEach((time, index) => {
        const hour = new Date(time).getHours();
        if (hour >= startHour && hour < endHour) {
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
        speedElement.textContent = speed;
    }
}

// Convert degrees to cardinal direction
function getWindDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

// Recommend top 3 beaches based on wind conditions
function recommendTop3Beaches(windDirection, windSpeed) {
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

    displayTop3Beaches(top3, windDirection);
}

// Display top 3 beach recommendations
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
                <h4>${index + 1}. ${beach.name}</h4>
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

// Initialize everything on page load
document.addEventListener('DOMContentLoaded', () => {
    // Fetch weather and beach recommendations
    fetchWeatherForecast();

    // Initialize POI map
    initPOIMap();

    // Refresh weather every 30 minutes
    setInterval(fetchWeatherForecast, 30 * 60 * 1000);
});
