# Casa Paolina - Professional Tourism Website

A modern, multilingual website for Casa Paolina accommodation in Uggiano la Chiesa, Salento, Puglia.

## Features

### 🌍 Multilingual Support
- Full Italian and English translations
- Easy language switching with persistent selection
- All content automatically translated

### 🏠 Room Showcases
- Three beautiful apartments: Celeste, Verde, and Suite 17
- Interactive photo galleries with auto-advance
- Detailed amenities and booking links
- WhatsApp direct booking integration

### 🗺️ Interactive Area Map
- Pinpointed nearby services and attractions
- Filterable by category:
  - Restaurants & Aperitivo spots
  - Supermarkets
  - Pharmacies
  - Tourist attractions
- Direct links to establishments when available

### 🏖️ Smart Beach Recommendations
- Real-time weather API integration
- Wind direction and speed display
- Intelligent beach recommendations based on wind protection
- 8 beaches included with detailed information
- Direct booking links for beach clubs (umbrellas/seats)
- Beaches included:
  - Torre dell'Orso
  - Torre Sant'Andrea
  - Baia dei Turchi
  - Laghi Alimini
  - Porto Badisco
  - Castro Marina
  - Santa Cesarea Terme
  - Otranto

### 📱 Responsive Design
- Mobile-friendly navigation
- Optimized for all screen sizes
- Touch-friendly controls

### 🎨 Professional Design
- Modern, clean interface
- Smooth animations and transitions
- Professional color scheme
- Tourist-focused user experience

## Files Structure

```
casapaolina/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # All styles and responsive design
├── js/
│   ├── translations.js    # Multilingual support
│   └── main.js           # Interactive features and maps
├── images/
│   ├── img_8835.jpeg     # Casa Paolina logo
│   ├── celeste1-4.jpg    # Appartamento Celeste photos
│   ├── verde1-4.jpg      # Appartamento Verde photos
│   └── suite1-4.jpg      # Suite 17 photos
└── README.md             # This file
```

## How to Use

### Local Development
1. Open `index.html` in a web browser
2. All features work without a server (static HTML)

### Deploy to Web Hosting
1. Upload all files to your web hosting service
2. Maintain the folder structure
3. Set `index.html` as the default page

### Recommended Hosting Options
- **GitHub Pages** (Free)
- **Netlify** (Free tier available)
- **Vercel** (Free tier available)
- Traditional web hosting (cPanel, etc.)

## API Used

### Weather Data
- **Open-Meteo API** (https://open-meteo.com/)
- No API key required
- Provides real-time wind direction and speed
- Updates beach recommendations accordingly

### Maps
- **Leaflet.js** with OpenStreetMap tiles
- Free and open-source
- Interactive markers and popups

## Customization

### Adding More Beaches
Edit `js/main.js` and add to the `beaches` array:

```javascript
{
    name: "Beach Name",
    lat: 40.xxxx,
    lng: 18.xxxx,
    protectedFrom: ["W", "NW", "SW"],
    description: "Beach description",
    bookingLink: "https://booking-link.com",
    translationKey: "beach_key"
}
```

### Adding Nearby Places
Edit `js/main.js` and add to the `nearbyPlaces` array:

```javascript
{
    name: "Place Name",
    lat: 40.xxxx,
    lng: 18.xxxx,
    category: "restaurants", // or supermarkets, pharmacy, attractions
    description: "Description",
    link: "https://website.com"
}
```

### Updating Translations
Edit `js/translations.js` and add/modify keys in both `it` and `en` objects.

## Contact Information

- **Address**: Via Dante De Blasi, 15, 73020 Uggiano la Chiesa (LE), Puglia, Italy
- **Phone**: +39 320 808 6738
- **WhatsApp**: https://wa.me/393208086738
- **Facebook**: https://www.facebook.com/profile.php?id=61558595285924
- **Instagram**: https://www.instagram.com/paolinashome/
- **CIN**: IT075091C200081350

## Technologies Used

- HTML5
- CSS3 (with CSS Variables)
- Vanilla JavaScript
- Leaflet.js (Maps)
- Open-Meteo API (Weather)
- OpenStreetMap (Map tiles)

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

© 2024 Casa Paolina. All rights reserved.

## Future Enhancements

Consider adding:
- Online booking system integration
- Guest reviews section
- Photo gallery lightbox
- Blog/Local tips section
- Newsletter subscription
- Virtual tour (360° photos)
- Seasonal pricing table
- Availability calendar
