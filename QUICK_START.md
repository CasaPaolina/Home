# Casa Paolina Website - Quick Start Guide

## 🚀 Opening the Website

### Option 1: Direct Open (Recommended)
Simply **double-click** on `index.html` to open the website in your default browser.

### Option 2: Right-Click Open
1. Right-click on `index.html`
2. Select "Open With"
3. Choose your preferred browser (Chrome, Firefox, Safari, etc.)

## ✅ What's Included

Your professional tourism website includes:

### 📄 Pages & Sections
- **Home/Hero** - Beautiful welcome section with your property
- **About** - Casa Paolina introduction
- **Rooms** - 3 apartments with photo galleries:
  - Appartamento Celeste (40m², 1-4 guests)
  - Appartamento Verde (38m², 1-4 guests)
  - Suite 17 (36m², 1-2 guests)
- **Services** - All amenities listed
- **Area Map** - Interactive map with nearby places
- **Beach Map** - Smart beach recommendations based on wind
- **Contact** - All contact information with map

### 🌍 Languages
- **Italian** (Default)
- **English**
- Switch anytime using IT/EN buttons in navigation

### 🗺️ Interactive Maps

#### Area Map Features:
- **Restaurants & Aperitivo spots**
- **Supermarkets**
- **Pharmacies**
- **Tourist Attractions**
- Filter by category with buttons

#### Beach Map Features:
- **8 beaches** around Salento
- **Real-time wind data** from weather API
- **Smart recommendations** based on wind protection
- **Direct booking links** for beach clubs
- Beaches included:
  - Torre dell'Orso (with booking)
  - Torre Sant'Andrea
  - Baia dei Turchi (with booking)
  - Laghi Alimini (with booking)
  - Porto Badisco
  - Castro Marina (with booking)
  - Santa Cesarea Terme
  - Otranto (with booking)

### 📱 Features
- **Mobile responsive** - Works perfectly on phones and tablets
- **WhatsApp booking** - Direct booking buttons
- **Photo galleries** - Auto-playing slideshows for each room
- **Social media links** - Facebook, Instagram, WhatsApp
- **Google Maps integration** - Find directions easily

## 🌐 Publishing Online

### Free Hosting Options:

#### GitHub Pages (Easiest)
1. Create a GitHub account at https://github.com
2. Create a new repository named "casapaolina"
3. Upload all files
4. Go to Settings > Pages
5. Enable GitHub Pages
6. Your site will be live at: `https://yourusername.github.io/casapaolina`

#### Netlify
1. Go to https://netlify.com
2. Sign up for free
3. Drag and drop the entire `casapaolina` folder
4. Get a free subdomain like: `casapaolina.netlify.app`
5. Optional: Connect your own domain

#### Vercel
1. Go to https://vercel.com
2. Sign up for free
3. Import the project
4. Deploy instantly

### Traditional Hosting
If you have web hosting (cPanel, etc.):
1. Upload all files via FTP
2. Maintain the folder structure
3. Set `index.html` as the default page

## 🔧 Customization Guide

### Update Contact Information
Edit `index.html` and search for:
- Phone number: `+39 320 808 6738`
- Address: `Via Dante De Blasi, 15`
- Social media links

### Add More Beaches
Edit `js/main.js`, find the `beaches` array and add:
```javascript
{
    name: "Beach Name",
    lat: 40.xxxx,  // Latitude
    lng: 18.xxxx,  // Longitude
    protectedFrom: ["W", "NW"],  // Wind directions it's protected from
    description: "Description here",
    bookingLink: "https://booking-site.com",  // or null if no booking
    translationKey: "beach_key"
}
```

### Add Nearby Places
Edit `js/main.js`, find the `nearbyPlaces` array and add:
```javascript
{
    name: "Place Name",
    lat: 40.xxxx,
    lng: 18.xxxx,
    category: "restaurants",  // or supermarkets, pharmacy, attractions
    description: "Description",
    link: "https://website.com"  // or null
}
```

### Update Translations
Edit `js/translations.js` and add translations in both `it` and `en` sections.

### Change Colors
Edit `css/style.css` and modify the color variables at the top:
```css
:root {
    --primary-color: #2c7873;    /* Main color */
    --secondary-color: #f4a261;  /* Accent color */
    --accent-color: #e76f51;     /* Button color */
}
```

## 📊 How the Wind System Works

The beach recommendation system:
1. Fetches real-time wind data from Open-Meteo API
2. Shows current wind direction and speed
3. Recommends beaches protected from the current wind
4. Updates automatically when you reload the page

Wind directions used: N, NE, E, SE, S, SW, W, NW

## 📞 Booking Integration

All "Book Now" buttons link to WhatsApp with pre-filled messages for each room:
- Appartamento Celeste
- Appartamento Verde
- Suite 17

Beach booking links go directly to the beach club websites where available.

## 🐛 Troubleshooting

### Maps not showing?
- Check your internet connection
- The site needs internet to load map tiles

### Weather not loading?
- Check internet connection
- Weather API is free and doesn't require setup
- May have rate limits (60 requests per minute)

### Images not loading?
- Make sure all files are in the correct folders
- Don't move or rename the `images` folder

### Language switch not working?
- Clear your browser cache
- Check browser console for errors (F12)

## 📁 File Structure
```
casapaolina/
├── index.html           ← Main page (open this!)
├── README.md           ← Detailed documentation
├── QUICK_START.md      ← This file
├── css/
│   └── style.css       ← All styling
├── js/
│   ├── main.js         ← Interactive features
│   └── translations.js ← Language support
└── images/
    ├── celeste1-4.jpg  ← Room photos
    ├── verde1-4.jpg    ← Room photos
    ├── suite1-4.jpg    ← Room photos
    └── img_8835.jpeg   ← Logo
```

## ✨ Pro Tips

1. **Test on mobile** - Open on your phone to see responsive design
2. **Share the link** - Once online, share with guests
3. **Update regularly** - Add seasonal content or new photos
4. **Check wind daily** - The beach recommendations update in real-time
5. **Add to Google** - Submit your site to Google Search Console

## 📧 Need Help?

- Check the full README.md for detailed documentation
- Test all features before publishing
- Make backups before making changes

## 🎉 You're Ready!

Just open `index.html` and explore your new professional tourism website!

**Contact Details on Site:**
- Phone: +39 320 808 6738
- WhatsApp: Direct booking links
- Facebook: @casapaolina
- Instagram: @paolinashome
- CIN: IT075091C200081350
