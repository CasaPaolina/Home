// Casa Paolina location - Uggiano la Chiesa
const CASA_PAOLINA = {
    lat: 40.09726,
    lng: 18.39167,
    name: "Casa Paolina"
};

// Nearby places with categories - centered around Uggiano la Chiesa
const nearbyPlaces = [
    // Restaurants & Aperitivo
    { name: "Ristorante La Vecchia Osteria", lat: 40.0960, lng: 18.3900, category: "restaurants", description: "Traditional Salento cuisine", link: null },
    { name: "Bar Centrale", lat: 40.0975, lng: 18.3920, category: "restaurants", description: "Coffee and aperitivo", link: null },
    { name: "Pizzeria Da Mimmo", lat: 40.0965, lng: 18.3910, category: "restaurants", description: "Wood-fired pizza", link: null },
    { name: "La Locanda del Gusto", lat: 40.1434, lng: 18.4909, category: "restaurants", description: "Fine dining in Otranto", link: "https://www.lalocandadelgusto.it/" },

    // Supermarkets
    { name: "Conad Supermarket", lat: 40.0970, lng: 18.3915, category: "supermarkets", description: "Full-service grocery", link: null },
    { name: "Eurospin", lat: 40.0980, lng: 18.3925, category: "supermarkets", description: "Discount supermarket", link: null },

    // Pharmacies
    { name: "Farmacia Comunale", lat: 40.0973, lng: 18.3917, category: "pharmacy", description: "Local pharmacy", link: null },

    // Attractions
    { name: "Otranto", lat: 40.1434, lng: 18.4909, category: "attractions", description: "Historic coastal town", link: "https://www.comune.otranto.le.it/" },
    { name: "Lecce", lat: 40.3515, lng: 18.1750, category: "attractions", description: "Baroque city center", link: "https://www.comune.lecce.it/" },
    { name: "Grotta della Poesia", lat: 40.2853, lng: 18.4461, category: "attractions", description: "Natural swimming pool", link: null },
    { name: "Torre dell'Orso Beach", lat: 40.2917, lng: 18.4372, category: "attractions", description: "Beautiful sandy beach", link: null },
    { name: "Cattedrale di Otranto", lat: 40.1437, lng: 18.4914, category: "attractions", description: "Historic cathedral", link: null },
    { name: "Castro Marina", lat: 40.0106, lng: 18.4294, category: "attractions", description: "Charming coastal village", link: null }
];

// Beaches with wind protection and booking links
const beaches = [
    {
        name: "Torre dell'Orso",
        lat: 40.2917,
        lng: 18.4372,
        protectedFrom: ["W", "NW", "SW"],
        description: "Beautiful sandy beach with two iconic rock stacks",
        bookingLink: "https://www.lido-torredell-orso.com/",
        translationKey: "beach_torre_dellorso"
    },
    {
        name: "Torre Sant'Andrea",
        lat: 40.2761,
        lng: 18.4667,
        protectedFrom: ["W", "NW", "N"],
        description: "Rocky coastline with natural arches",
        bookingLink: null,
        translationKey: "beach_torre_santandrea"
    },
    {
        name: "Baia dei Turchi",
        lat: 40.1900,
        lng: 18.4850,
        protectedFrom: ["W", "SW", "NW"],
        description: "Wild and pristine sandy beach",
        bookingLink: "https://www.baiadeiturchibeach.it/",
        translationKey: "beach_baia_dei_turchi"
    },
    {
        name: "Laghi Alimini",
        lat: 40.2089,
        lng: 18.4789,
        protectedFrom: ["E", "NE", "SE"],
        description: "Beach near beautiful lakes",
        bookingLink: "https://www.lagunabeachalimini.it/",
        translationKey: "beach_alimini"
    },
    {
        name: "Porto Badisco",
        lat: 40.0850,
        lng: 18.4883,
        protectedFrom: ["W", "NW", "N"],
        description: "Small bay with crystal clear water",
        bookingLink: null,
        translationKey: "beach_porto_badisco"
    },
    {
        name: "Castro Marina",
        lat: 40.0106,
        lng: 18.4294,
        protectedFrom: ["E", "NE"],
        description: "Charming beach with sea caves",
        bookingLink: "https://www.lidozinzulusa.it/",
        translationKey: "beach_castro"
    },
    {
        name: "Santa Cesarea Terme",
        lat: 40.0383,
        lng: 18.4594,
        protectedFrom: ["W", "NW"],
        description: "Coastal town with thermal waters",
        bookingLink: null,
        translationKey: "beach_santa_cesarea"
    },
    {
        name: "Otranto - Baia dei Turchi",
        lat: 40.1434,
        lng: 18.4909,
        protectedFrom: ["W", "SW"],
        description: "City beach near historic center",
        bookingLink: "https://www.lidopizzicobeach.com/",
        translationKey: "beach_otranto"
    }
];

// Points of Interest used on the main POI map (kept in sync with guest page)
const pointsOfInterest = [
    { name: "Avamposto", address: "Via Dante De Blasi, Uggiano La Chiesa", lat: 40.0975, lng: 18.3920, category: "nightlife" },
    { name: "Skafe al Casotto", address: "Via Bastione Pelasgi, 12, Otranto", lat: 40.1436, lng: 18.4916, category: "nightlife" },
    { name: "Spinnaker", address: "Via Filippo Turati, 3, Torre dell'Orso", lat: 40.2667, lng: 18.4167, category: "nightlife" },
    { name: "La Casaccia", address: "Otranto", lat: 40.1430, lng: 18.4900, category: "nightlife" },
    { name: "Blu Bay", address: "Via Sant'Antonio, Castro", lat: 40.0167, lng: 18.4300, category: "nightlife" },

    { name: "Lecce", address: "Città barocca", lat: 40.3515, lng: 18.1750, category: "attractions", description: "Città barocca con architettura storica" },
    { name: "Gallipoli", address: "Città costiera", lat: 40.0556, lng: 17.9922, category: "attractions", description: "Città costiera sul Mar Ionio" },
    { name: "Santa Maria di Leuca", address: "Punta estrema", lat: 39.7972, lng: 18.3611, category: "attractions", description: "Punta estrema del Salento" },
    { name: "Otranto", address: "Città storica", lat: 40.1436, lng: 18.4908, category: "attractions", description: "Città storica sul mare Adriatico" },
    { name: "Cava di Bauxite", address: "Otranto", lat: 40.1100, lng: 18.4700, category: "attractions", description: "Lago verde smeraldo - 15km" },
    { name: "Grotta Zinzulusa", address: "Castro", lat: 40.0083, lng: 18.4250, category: "attractions", description: "Grotta marina spettacolare" },
    { name: "Punta Palascia", address: "Otranto", lat: 40.1083, lng: 18.5194, category: "attractions", description: "Punto più a est d'Italia" },



    // Services
    { name: "Supermercato Conad", address: "Uggiano la Chiesa", lat: 40.0970, lng: 18.3915, category: "services" },
    { name: "Farmacia", address: "Uggiano la Chiesa", lat: 40.0968, lng: 18.3910, category: "services" },
    { name: "Lavanderia Self-Service", address: "Via Roma, Uggiano la Chiesa", lat: 40.0965, lng: 18.3905, category: "services" }
];

// Custom icons for map markers
const createCustomIcon = (color) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [25, 25],
        iconAnchor: [12, 12]
    });
};

// Category colors
const categoryColors = {
    restaurants: '#e74c3c',
    supermarkets: '#3498db',
    pharmacy: '#2ecc71',
    attractions: '#f39c12',
    home: '#9b59b6',
    beach: '#1abc9c'
};

// Initialize area map
let areaMap;
let areaMarkers = [];
let activeCategory = 'all';

function initAreaMap() {
    areaMap = L.map('area-map-container').setView([CASA_PAOLINA.lat, CASA_PAOLINA.lng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(areaMap);

    // Add Casa Paolina marker
    const homeIcon = createCustomIcon(categoryColors.home);
    L.marker([CASA_PAOLINA.lat, CASA_PAOLINA.lng], { icon: homeIcon })
        .addTo(areaMap)
        .bindPopup(`<b>${CASA_PAOLINA.name}</b><br>Your accommodation`)
        .openPopup();

    // Add nearby places markers
    nearbyPlaces.forEach(place => {
        const icon = createCustomIcon(categoryColors[place.category]);
        const marker = L.marker([place.lat, place.lng], { icon: icon })
            .bindPopup(`
                <b>${place.name}</b><br>
                ${place.description}<br>
                ${place.link ? `<a href="${place.link}" target="_blank">Visit website</a>` : ''}
            `);

        marker.category = place.category;
        marker.addTo(areaMap);
        areaMarkers.push(marker);
    });

    // Add filter button listeners
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');
            filterMarkers(category);

            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function filterMarkers(category) {
    activeCategory = category;
    areaMarkers.forEach(marker => {
        if (category === 'all' || marker.category === category) {
            marker.addTo(areaMap);
        } else {
            areaMap.removeLayer(marker);
        }
    });
}

// Beach map and wind recommendation
let beachMap;
let windData = null;

function initBeachMap() {
    beachMap = L.map('beach-map-container').setView([CASA_PAOLINA.lat, CASA_PAOLINA.lng], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(beachMap);

    // Add Casa Paolina marker
    const homeIcon = createCustomIcon(categoryColors.home);
    L.marker([CASA_PAOLINA.lat, CASA_PAOLINA.lng], { icon: homeIcon })
        .addTo(beachMap)
        .bindPopup(`<b>${CASA_PAOLINA.name}</b>`);

    // Add beach markers
    beaches.forEach(beach => {
        const icon = createCustomIcon(categoryColors.beach);
        const popup = `
            <b>${beach.name}</b><br>
            ${beach.description}<br>
            ${beach.bookingLink ? `<a href="${beach.bookingLink}" target="_blank" style="color: #1abc9c; font-weight: bold;">📅 Book umbrella/seat</a>` : 'No online booking available'}
        `;

        L.marker([beach.lat, beach.lng], { icon: icon })
            .addTo(beachMap)
            .bindPopup(popup);
    });

    // Fetch weather data
    fetchWeatherData();
}

async function fetchWeatherData() {
    try {
        // Using Open-Meteo API (free, no API key required)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${CASA_PAOLINA.lat}&longitude=${CASA_PAOLINA.lng}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh`;

        const response = await fetch(url);
        const data = await response.json();

        windData = {
            speed: data.current.wind_speed_10m,
            direction: data.current.wind_direction_10m
        };

        updateWindDisplay();
        recommendBestBeach();
    } catch (error) {
        console.error('Error fetching weather data:', error);
        document.getElementById('wind-direction-text').textContent = 'N/A';
        document.getElementById('wind-speed-text').textContent = 'N/A';
        document.getElementById('recommended-beach').textContent = 'Weather data unavailable';
        document.getElementById('recommendation-reason').textContent = '';
    }
}

function getWindDirectionText(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

function getWindDirectionTranslated(direction) {
    const key = `wind_${direction.toLowerCase()}`;
    return translations[currentLang] && translations[currentLang][key]
        ? translations[currentLang][key]
        : direction;
}

function updateWindDisplay() {
    if (!windData) return;

    const directionText = getWindDirectionText(windData.direction);
    const translatedDirection = getWindDirectionTranslated(directionText);

    document.getElementById('wind-direction-text').textContent = `${translatedDirection} (${Math.round(windData.direction)}°)`;
    document.getElementById('wind-speed-text').textContent = `${Math.round(windData.speed)} km/h`;

    // Rotate wind arrow
    const arrow = document.getElementById('wind-arrow');
    arrow.style.transform = `rotate(${windData.direction}deg)`;
}

function recommendBestBeach() {
    if (!windData) return;

    const windDirection = getWindDirectionText(windData.direction);

    // Find beaches protected from current wind
    const protectedBeaches = beaches.filter(beach =>
        beach.protectedFrom.includes(windDirection)
    );

    let recommendedBeach;
    let reason;

    if (protectedBeaches.length > 0) {
        // Recommend closest protected beach
        recommendedBeach = protectedBeaches.reduce((closest, beach) => {
            const distCurrent = getDistance(CASA_PAOLINA.lat, CASA_PAOLINA.lng, beach.lat, beach.lng);
            const distClosest = getDistance(CASA_PAOLINA.lat, CASA_PAOLINA.lng, closest.lat, closest.lng);
            return distCurrent < distClosest ? beach : closest;
        });

        const reasonKey = windData.speed > 15 ? 'beach_reason_protected' : 'beach_reason_calm';
        reason = translations[currentLang][reasonKey];
    } else {
        // Recommend closest beach
        recommendedBeach = beaches.reduce((closest, beach) => {
            const distCurrent = getDistance(CASA_PAOLINA.lat, CASA_PAOLINA.lng, beach.lat, beach.lng);
            const distClosest = getDistance(CASA_PAOLINA.lat, CASA_PAOLINA.lng, closest.lat, closest.lng);
            return distCurrent < distClosest ? beach : closest;
        });
        reason = translations[currentLang]['beach_reason_conditions'];
    }

    const beachName = translations[currentLang][recommendedBeach.translationKey] || recommendedBeach.name;
    document.getElementById('recommended-beach').textContent = beachName;
    document.getElementById('recommendation-reason').textContent = reason;

    if (recommendedBeach.bookingLink) {
        const bookButton = `<br><a href="${recommendedBeach.bookingLink}" target="_blank" class="btn btn-primary" style="margin-top: 10px; display: inline-block;">📅 ${currentLang === 'it' ? 'Prenota posto' : 'Book a spot'}</a>`;
        document.getElementById('recommendation-reason').innerHTML += bookButton;
    }

    // Highlight recommended beach on map
    beachMap.eachLayer(layer => {
        if (layer instanceof L.Marker &&
            layer.getLatLng().lat === recommendedBeach.lat &&
            layer.getLatLng().lng === recommendedBeach.lng) {
            layer.openPopup();
        }
    });
}

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

// Room gallery functionality
function initRoomGalleries() {
    document.querySelectorAll('.room-card').forEach(card => {
        const images = card.querySelectorAll('.room-img');
        const dots = card.querySelectorAll('.dot');
        const prevBtn = card.querySelector('.gallery-btn.prev');
        const nextBtn = card.querySelector('.gallery-btn.next');
        let currentIndex = 0;

        function showImage(index) {
            images.forEach(img => img.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));

            images[index].classList.add('active');
            dots[index].classList.add('active');
            currentIndex = index;
        }

        prevBtn.addEventListener('click', () => {
            const newIndex = (currentIndex - 1 + images.length) % images.length;
            showImage(newIndex);
        });

        nextBtn.addEventListener('click', () => {
            const newIndex = (currentIndex + 1) % images.length;
            showImage(newIndex);
        });

        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.getAttribute('data-index'));
                showImage(index);
            });
        });

        // Auto-advance every 5 seconds
        setInterval(() => {
            const newIndex = (currentIndex + 1) % images.length;
            showImage(newIndex);
        }, 5000);
    });
}

// Mobile menu toggle
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu when clicking on a link
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// Smooth scrolling for anchor links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 80; // Account for fixed navbar
                const targetPosition = target.offsetTop - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Navbar scroll effect
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initRoomGalleries();
    initMobileMenu();
    initSmoothScroll();
    initNavbarScroll();

    // Initialize maps with a slight delay to ensure containers are ready
    setTimeout(() => {
        initAreaMap();
        initBeachMap();
    }, 100);
});

// Re-translate wind and beach info when language changes
const originalTranslatePage = translatePage;
translatePage = function(lang) {
    originalTranslatePage(lang);
    if (windData) {
        updateWindDisplay();
        recommendBestBeach();
    }
};

// Image Lightbox functionality
function initImageLightbox() {
    document.querySelectorAll('.room-gallery').forEach(gallery => {
        gallery.style.cursor = 'pointer';
        const images = gallery.querySelectorAll('.room-img');

        gallery.addEventListener('click', (e) => {
            // Don't trigger if clicking navigation buttons
            if (e.target.classList.contains('gallery-btn') || e.target.classList.contains('dot')) {
                return;
            }

            const currentImg = gallery.querySelector('.room-img.active');
            const currentIndex = Array.from(images).indexOf(currentImg);

            openLightbox(images, currentIndex);
        });
    });
}

function openLightbox(images, startIndex) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <button class="lightbox-close">&times;</button>
            <button class="lightbox-prev">&lt;</button>
            <button class="lightbox-next">&gt;</button>
            <img src="${images[startIndex].src}" alt="Room photo" class="lightbox-image">
            <div class="lightbox-counter">${startIndex + 1} / ${images.length}</div>
        </div>
    `;

    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden';

    let currentIndex = startIndex;
    const lightboxImg = lightbox.querySelector('.lightbox-image');
    const counter = lightbox.querySelector('.lightbox-counter');

    function updateImage() {
        lightboxImg.src = images[currentIndex].src;
        counter.textContent = `${currentIndex + 1} / ${images.length}`;
    }

    lightbox.querySelector('.lightbox-close').addEventListener('click', () => {
        document.body.removeChild(lightbox);
        document.body.style.overflow = '';
    });

    lightbox.querySelector('.lightbox-prev').addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        updateImage();
    });

    lightbox.querySelector('.lightbox-next').addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % images.length;
        updateImage();
    });

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            document.body.removeChild(lightbox);
            document.body.style.overflow = '';
        }
    });

    // Keyboard navigation
    const handleKeyboard = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(lightbox);
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleKeyboard);
        } else if (e.key === 'ArrowLeft') {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            updateImage();
        } else if (e.key === 'ArrowRight') {
            currentIndex = (currentIndex + 1) % images.length;
            updateImage();
        }
    };
    document.addEventListener('keydown', handleKeyboard);
}

// Guest area functionality
function initGuestArea() {
    const guestBtn = document.getElementById('guest-area-btn');
    const guestLoginBtn = document.getElementById('guest-login-btn');
    // If neither button exists, nothing to do
    if (!guestBtn && !guestLoginBtn) return;

    if (guestBtn) {
        guestBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Require password: show login modal if not authenticated
            if (localStorage.getItem('guestLoggedIn') === 'true') {
                window.location.href = 'guest-info.html';
            } else {
                showGuestLogin();
            }
        });
    }

    // Extra visible login trigger (explicit Accedi button)
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showGuestLogin();
        });
    }

}  

function showGuestLogin() {
    const modal = document.createElement('div');
    modal.className = 'guest-modal';
    modal.innerHTML = `
        <div class="guest-modal-content">
            <button class="guest-modal-close">&times;</button>
            <h2 data-translate="guest_login_title">Area Riservata Ospiti</h2>
            <p data-translate="guest_login_subtitle">Inserisci la password fornita al check-in</p>
            <form id="guest-login-form">
                <input type="password" id="guest-password" placeholder="${currentLang === 'it' ? 'Password' : 'Password'}" required>
                <button type="submit" class="btn btn-primary" data-translate="guest_login_btn">Accedi</button>
            </form>
            <p class="guest-login-help" data-translate="guest_login_help">Non hai ricevuto la password? Contattaci su WhatsApp</p>
        </div>
    `;

    document.body.appendChild(modal);
    // translate newly injected elements
    translatePage(currentLang);
    document.body.style.overflow = 'hidden';

    const form = modal.querySelector('#guest-login-form');
    const passwordInput = modal.querySelector('#guest-password');
    // ensure placeholder matches current language
    if (translations[currentLang] && translations[currentLang].guest_password_placeholder) {
        passwordInput.placeholder = translations[currentLang].guest_password_placeholder;
    }
    const errorEl = document.createElement('div');
    errorEl.id = 'guest-login-error';
    errorEl.style.color = 'red';
    errorEl.style.minHeight = '1.2em';
    errorEl.style.marginTop = '6px';
    modal.querySelector('.guest-modal-content').appendChild(errorEl);

    // Focus on password input for accessibility
    passwordInput.focus();

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = passwordInput.value;

        // Simple password check (in production, this should be server-side)
        if (password === 'chiara' || password === 'ale') {
            localStorage.setItem('guestLoggedIn', 'true');
            document.body.removeChild(modal);
            document.body.style.overflow = '';
            window.location.href = 'guest-info.html';
        } else {
            passwordInput.style.borderColor = 'red';
            passwordInput.value = '';
            const wrongMsg = (translations[currentLang] && translations[currentLang].guest_login_wrong) || (currentLang === 'it' ? 'Password errata, riprova' : 'Wrong password, try again');
            passwordInput.placeholder = wrongMsg;
            errorEl.textContent = wrongMsg;
        }
    });

    modal.querySelector('.guest-modal-close').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
        }
    });
}

function showGuestInfo() {
    const modal = document.createElement('div');
    modal.className = 'guest-modal';
    modal.innerHTML = `
        <div class="guest-modal-content guest-info-content">
            <button class="guest-modal-close">&times;</button>
            <h2 data-translate="guest_info_title">Informazioni per gli Ospiti</h2>

            <div class="guest-info-sections">
                <div class="guest-info-section">
                    <h3><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                        <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                        <line x1="12" y1="20" x2="12.01" y2="20"/>
                    </svg> Wi-Fi</h3>
                    <p><strong>Nome rete:</strong> CasaPaolina_WiFi</p>
                    <p><strong>Password:</strong> Salento2024!</p>
                </div>

                <div class="guest-info-section">
                    <h3><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg> Orari</h3>
                    <p><strong>Check-in:</strong> 15:00 - 20:00</p>
                    <p><strong>Check-out:</strong> entro le 10:00</p>
                    <p><strong>Silenzio:</strong> 23:00 - 07:00</p>
                </div>

                <div class="guest-info-section">
                    <h3><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg> Biancheria</h3>
                    <p>Lenzuola e asciugamani sono inclusi.</p>
                    <p>Cambio biancheria disponibile ogni 3 giorni.</p>
                    <p>Per richieste extra, contattaci.</p>
                </div>

                <div class="guest-info-section">
                    <h3><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg> Regole della Casa</h3>
                    <ul>
                        <li>È vietato fumare all'interno</li>
                        <li>Rispettare gli orari di silenzio</li>
                        <li>Differenziare i rifiuti</li>
                        <li>Spegnere luci e aria condizionata quando esci</li>
                        <li>Chiudere sempre la porta a chiave</li>
                    </ul>
                </div>

                <div class="guest-info-section">
                    <h3><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3h18v18H3z"/>
                        <path d="M3 9h18M9 21V9"/>
                    </svg> Raccolta Differenziata</h3>
                    <p><strong>Plastica:</strong> Martedì e Venerdì</p>
                    <p><strong>Carta:</strong> Giovedì</p>
                    <p><strong>Indifferenziato:</strong> Lunedì, Mercoledì, Sabato</p>
                    <p><strong>Vetro:</strong> Mercoledì</p>
                </div>

                <div class="guest-info-section emergency">
                    <h3><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg> Contatti di Emergenza</h3>
                    <p><strong>Proprietario:</strong> <a href="tel:+393208086738">+39 320 808 6738</a></p>
                    <p><strong>Emergenze:</strong> 112</p>
                    <p><strong>Guardia Medica:</strong> 118</p>
                </div>
            </div>

            <button class="btn btn-secondary" id="guest-logout" data-translate="guest_logout">Esci</button>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    modal.querySelector('.guest-modal-close').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
    });

    modal.querySelector('#guest-logout').addEventListener('click', () => {
        localStorage.removeItem('guestLoggedIn');
        document.body.removeChild(modal);
        document.body.style.overflow = '';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
        }
    });
}

// Availability request form
function initAvailabilityForms() {
    document.querySelectorAll('.availability-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const roomName = btn.getAttribute('data-room');
            showAvailabilityForm(roomName);
        });
    });
}

function showAvailabilityForm(roomName) {
    const modal = document.createElement('div');
    modal.className = 'guest-modal';
    modal.innerHTML = `
        <div class="guest-modal-content">
            <button class="guest-modal-close">&times;</button>
            <h2 data-translate="availability_title">Richiedi Disponibilità</h2>
            <p>${roomName}</p>
            <form id="availability-form" class="availability-form">
                <div class="form-row">
                    <div class="form-group">
                        <label data-translate="availability_checkin">Check-in</label>
                        <input type="date" id="checkin-date" required>
                    </div>
                    <div class="form-group">
                        <label data-translate="availability_checkout">Check-out</label>
                        <input type="date" id="checkout-date" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label data-translate="availability_adults">Adulti</label>
                        <select id="num-adults" required>
                            <option value="1">1</option>
                            <option value="2" selected>2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label data-translate="availability_children">Bambini</label>
                        <select id="num-children">
                            <option value="0" selected>0</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label data-translate="availability_name">Nome e Cognome</label>
                    <input type="text" id="guest-name" required>
                </div>
                <div class="form-group">
                    <label data-translate="availability_email">Email</label>
                    <input type="email" id="guest-email" required>
                </div>
                <div class="form-group">
                    <label data-translate="availability_phone">Telefono</label>
                    <input type="tel" id="guest-phone">
                </div>
                <div class="form-group">
                    <label data-translate="availability_message">Note (opzionale)</label>
                    <textarea id="guest-message" rows="3"></textarea>
                </div>
                <button type="submit" class="btn btn-primary" data-translate="availability_submit">Invia Richiesta</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    modal.querySelector('#checkin-date').min = today;
    modal.querySelector('#checkout-date').min = today;

    // Update checkout min date when checkin changes
    modal.querySelector('#checkin-date').addEventListener('change', (e) => {
        const checkinDate = new Date(e.target.value);
        checkinDate.setDate(checkinDate.getDate() + 1);
        modal.querySelector('#checkout-date').min = checkinDate.toISOString().split('T')[0];
    });

    modal.querySelector('#availability-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = {
            room: roomName,
            checkin: modal.querySelector('#checkin-date').value,
            checkout: modal.querySelector('#checkout-date').value,
            adults: modal.querySelector('#num-adults').value,
            children: modal.querySelector('#num-children').value,
            name: modal.querySelector('#guest-name').value,
            email: modal.querySelector('#guest-email').value,
            phone: modal.querySelector('#guest-phone').value,
            message: modal.querySelector('#guest-message').value
        };

        // Send via WhatsApp
        const whatsappMessage = `Richiesta Disponibilità\n\nCamera: ${formData.room}\nCheck-in: ${formData.checkin}\nCheck-out: ${formData.checkout}\nOspiti: ${formData.adults} adulti, ${formData.children} bambini\n\nNome: ${formData.name}\nEmail: ${formData.email}\nTelefono: ${formData.phone}\nNote: ${formData.message}`;
        const whatsappUrl = `https://wa.me/393208086738?text=${encodeURIComponent(whatsappMessage)}`;

        window.open(whatsappUrl, '_blank');

        document.body.removeChild(modal);
        document.body.style.overflow = '';
    });

    modal.querySelector('.guest-modal-close').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
        }
    });
}

// Initialize POI Map for main page
function initMainPOIMap() {
    const mapElement = document.getElementById('main-poi-map');
    if (!mapElement) return;

    // Create map centered on Casa Paolina
    const map = L.map('main-poi-map').setView([CASA_PAOLINA.lat, CASA_PAOLINA.lng], 11);

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

    // Category icons (include those used on guest page)
    const categoryIcons = {
        nightlife: '🍹',
        attractions: '🏛️',
        beaches: '🏖️',
        excursions: '🥾',
        services: '🛒',
        restaurants: '🍴',
        supermarkets: '🛒',
        pharmacy: '💊'
    };

    // Add all POI markers to category layer groups
    const markers = {};
    pointsOfInterest.forEach(poi => {
        const icon = L.divIcon({
            html: categoryIcons[poi.category] || '📍',
            className: 'custom-marker',
            iconSize: [25, 25]
        });

        const popupContent = `
            <div style="min-width: 180px;">
                <h4 style="margin: 0 0 8px 0;">${poi.name}</h4>
                <p style="margin: 4px 0; font-size: 0.9rem;">${poi.address || poi.description || ''}</p>
            </div>
        `;

        const marker = L.marker([poi.lat, poi.lng], { icon })
            .bindPopup(popupContent);

        if (!markers[poi.category]) {
            markers[poi.category] = L.layerGroup().addTo(map);
        }
        marker.addTo(markers[poi.category]);
    });

    // Wire up the filter buttons to show/hide layer groups and toggle category lists
    const filterButtons = document.querySelectorAll('.poi-filter-btn');
    const categoryElements = document.querySelectorAll('.poi-category');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');

            // Update active button
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show/hide marker layers
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

            // Toggle POI category list visibility
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

// Update initialization
const originalInit = document.addEventListener;
document.addEventListener('DOMContentLoaded', () => {
    initRoomGalleries();
    initMobileMenu();
    initSmoothScroll();
    initNavbarScroll();
    initImageLightbox();
    initGuestArea();
    initAvailabilityForms();

    // Initialize POI map with a slight delay to ensure container is ready
    setTimeout(() => {
        initMainPOIMap();
    }, 100);
});
