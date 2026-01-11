// Locations Data Loader
// This file loads and provides access to the centralized locations.json data

class LocationsData {
    constructor() {
        this.data = null;
        this.loaded = false;
    }

    async load() {
        if (this.loaded) return this.data;

        try {
            const response = await fetch('data/locations.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            this.loaded = true;
            console.log('Locations data loaded successfully');
            return this.data;
        } catch (error) {
            console.error('Error loading locations data:', error);
            throw error;
        }
    }

    // Helper methods to access specific data
    getCasaPaolina() {
        return this.data?.casaPaolina || null;
    }

    getBeaches() {
        return this.data?.beaches || [];
    }

    getBeachById(id) {
        return this.data?.beaches?.find(b => b.id === id) || null;
    }

    getAttractions() {
        return this.data?.attractions || [];
    }

    getNightlife() {
        return this.data?.nightlife || [];
    }

    getServices() {
        return this.data?.services || [];
    }

    getRestaurants() {
        return this.data?.restaurants || [];
    }

    // Get all POIs for map display
    getAllPOIs() {
        if (!this.data) return [];

        return [
            ...this.getAttractions(),
            ...this.getNightlife(),
            ...this.getServices(),
            ...this.getRestaurants()
        ];
    }

    // Filter beaches by wind protection
    getBeachesByWindProtection(windDirection) {
        return this.getBeaches().filter(beach =>
            beach.protectedFrom && beach.protectedFrom.includes(windDirection)
        );
    }

    // Get recommended beach based on wind
    getRecommendedBeach(windDirection, windSpeed = 0) {
        const protectedBeaches = this.getBeachesByWindProtection(windDirection);

        if (protectedBeaches.length === 0) {
            // If no specifically protected beaches, return closest beach
            return this.getBeaches()[0];
        }

        // Return first protected beach (could be enhanced with more logic)
        return protectedBeaches[0];
    }

    // Calculate distance from Casa Paolina using Haversine formula
    calculateDistance(lat, lng) {
        const casaPaolina = this.getCasaPaolina();
        if (!casaPaolina) return 0;

        const R = 6371; // Earth's radius in km
        const dLat = this.deg2rad(lat - casaPaolina.lat);
        const dLon = this.deg2rad(lng - casaPaolina.lng);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(casaPaolina.lat)) *
            Math.cos(this.deg2rad(lat)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return Math.round(distance * 10) / 10; // Round to 1 decimal
    }

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    // Get nearby places (within specified km radius)
    getNearbyPlaces(maxDistance = 10) {
        const all = this.getAllPOIs();
        return all.filter(poi => {
            const distance = this.calculateDistance(poi.lat, poi.lng);
            return distance <= maxDistance;
        });
    }
}

// Create global instance
const locationsData = new LocationsData();

// Auto-load on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        locationsData.load().catch(err => {
            console.error('Failed to load locations data:', err);
        });
    });
} else {
    locationsData.load().catch(err => {
        console.error('Failed to load locations data:', err);
    });
}
