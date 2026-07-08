// Embedded Locations Data
// This file contains all locations data to avoid CORS issues with file:// protocol
const LOCATIONS_DATA = {
  "casaPaolina": {
    "name": "Casa Paolina",
    "lat": 40.102558,
    "lng": 18.446024,
    "address": "Via Dante De Blasi, 15, Uggiano la Chiesa (LE)",
    "type": "accommodation"
  },
  "beaches": [
    {
      "id": "torre-orso",
      "name": "Torre dell'Orso",
      "lat": 40.272169,
      "lng": 18.430545,
      "type": "beach",
      "sandType": "fine_sand",
      "protectedFrom": [
        "W",
        "NW",
        "SW"
      ],
      "exposed": [
        "E",
        "NE",
        "SE"
      ],
      "description": "Beautiful sandy beach with crystal clear water and two famous rock formations",
      "translationKey": "beach_torre_orso",
      "bookingLink": null,
      "distance": "19 km",
      "sea": "adriatico",
      "distanceNum": 19,
      "activities": ["swim", "family"],
      "description_it": "Spiaggia sabbiosa con le celebri due sorelle. Ideale per famiglie con servizi completi.",
      "facilities": [
        "parking",
        "restaurants",
        "umbrellas",
        "sunbeds"
      ],
      "images": [
        "torre-orso-1.jpg"
      ]
    },
    {
      "id": "faraglioni-santandrea",
      "name": "Faraglioni di Sant'Andrea",
      "lat": 40.256684,
      "lng": 18.444069,
      "type": "beach",
      "sandType": "rocks",
      "protectedFrom": [
        "W",
        "NW",
        "SW"
      ],
      "exposed": [
        "E",
        "NE",
        "SE"
      ],
      "description": "Spectacular rocky coastline with dramatic cliff formations",
      "translationKey": "beach_faraglioni",
      "bookingLink": null,
      "distance": "18 km",
      "sea": "adriatico",
      "distanceNum": 18,
      "activities": ["snorkel", "nature"],
      "description_it": "Formazioni rocciose spettacolari con acque limpide, perfette per lo snorkeling tra scogli.",
      "facilities": [
        "parking"
      ],
      "images": [
        "faraglioni-santandrea.jpg"
      ]
    },
    {
      "id": "baia-turchi",
      "name": "Baia dei Turchi",
      "lat": 40.19355,
      "lng": 18.463585,
      "type": "beach",
      "sandType": "white_sand",
      "protectedFrom": [
        "W",
        "NW",
        "N"
      ],
      "exposed": [
        "E",
        "SE",
        "S"
      ],
      "description": "Pristine white sand beach surrounded by pine forest",
      "translationKey": "beach_baia_turchi",
      "bookingLink": null,
      "distance": "10 km",
      "sea": "adriatico",
      "distanceNum": 10,
      "activities": ["swim", "family", "nature"],
      "description_it": "Spiaggia di sabbia bianca circondata da pineta. Protetta come riserva naturale.",
      "facilities": [
        "parking",
        "beach_bar",
        "umbrellas"
      ],
      "images": [
        "baia-dei-turchi.jpg"
      ]
    },
    {
      "id": "alimini",
      "name": "Laghi Alimini",
      "lat": 40.200025,
      "lng": 18.459818,
      "type": "beach",
      "sandType": "golden_sand",
      "protectedFrom": [
        "W",
        "NW",
        "N"
      ],
      "exposed": [
        "E",
        "SE",
        "S"
      ],
      "description": "Long stretch of golden sand backed by natural lagoons",
      "translationKey": "beach_alimini",
      "bookingLink": "https://www.spiagge.it/stabilimenti-balneari/?se=1&page=1&sid=d972edd0-f3c7-4b63-8933-25bfc79f0835&&query=alimini",
      "distance": "11 km",
      "sea": "adriatico",
      "distanceNum": 11,
      "activities": ["swim", "family", "sup"],
      "description_it": "Lunga distesa di sabbia dorata con laghi naturali alle spalle. Ideale per lo sport acquatico.",
      "facilities": [
        "parking",
        "restaurants",
        "beach_clubs",
        "water_sports"
      ],
      "images": [
        "alimini.jpg"
      ]
    },
    {
      "id": "porto-badisco",
      "name": "Porto Badisco",
      "lat": 40.085,
      "lng": 18.4883,
      "type": "beach",
      "sandType": "pebbles",
      "protectedFrom": [
        "N",
        "NW",
        "W"
      ],
      "exposed": [
        "E",
        "SE",
        "S"
      ],
      "description": "Small, sheltered bay with clear water and ancient history",
      "translationKey": "beach_porto_badisco",
      "bookingLink": null,
      "distance": "3 km",
      "sea": "adriatico",
      "distanceNum": 3,
      "activities": ["snorkel", "hidden", "swim"],
      "description_it": "La cala più vicina a Casa Paolina. Acque cristalline ideali per lo snorkeling tra rocce e storia millenaria.",
      "facilities": [
        "parking",
        "restaurant"
      ],
      "images": [
        "spiaggia-porto-badisco.jpg"
      ]
    },
    {
      "id": "castro-marina",
      "name": "Castro Marina",
      "lat": 40.0106,
      "lng": 18.4294,
      "type": "beach",
      "sandType": "rocks",
      "protectedFrom": [
        "N",
        "NW",
        "W"
      ],
      "exposed": [
        "E",
        "SE",
        "S"
      ],
      "description": "Charming coastal town with sea caves and crystal waters",
      "translationKey": "beach_castro",
      "bookingLink": null,
      "distance": "12 km",
      "sea": "adriatico",
      "distanceNum": 12,
      "activities": ["snorkel", "dive"],
      "description_it": "Porto pittoresco con grotte marine e acque cristalline, ideale per immersioni e snorkeling.",
      "facilities": [
        "parking",
        "restaurants",
        "boat_tours",
        "diving"
      ],
      "images": [
        "castro-marina.jpg"
      ]
    },
    {
      "id": "porto-miggiano",
      "name": "Porto Miggiano",
      "lat": 40.032276,
      "lng": 18.446058,
      "type": "beach",
      "sandType": "rocks",
      "protectedFrom": [
        "N",
        "NW",
        "NE"
      ],
      "exposed": [
        "E",
        "SE",
        "S"
      ],
      "description": "Natural inlet with turquoise water perfect for snorkeling",
      "translationKey": "beach_porto_miggiano",
      "bookingLink": null,
      "distance": "9 km",
      "sea": "adriatico",
      "distanceNum": 9,
      "activities": ["snorkel", "hidden", "swim"],
      "description_it": "Insenatura naturale con acque color turchese, perfetta per lo snorkeling.",
      "facilities": [
        "parking"
      ],
      "images": [
        "Porto_Miggiano.jpg"
      ]
    },
    {
      "id": "marina-serra",
      "name": "Marina Serra",
      "lat": 39.911808,
      "lng": 18.393354,
      "type": "beach",
      "sandType": "rocks",
      "protectedFrom": [
        "N",
        "NE",
        "NW"
      ],
      "exposed": [
        "E",
        "SE",
        "S"
      ],
      "description": "Natural rocky pool with crystal clear water",
      "translationKey": "beach_marina_serra",
      "bookingLink": null,
      "distance": "22 km",
      "sea": "adriatico",
      "distanceNum": 22,
      "activities": ["snorkel", "hidden", "nature"],
      "description_it": "Piscina naturale tra le rocce con acque trasparenti. Un angolo di paradiso selvaggio.",
      "facilities": [
        "parking",
        "bar"
      ],
      "images": [
        "marina-serra.jpg"
      ]
    },
    {
      "id": "cala-acquaviva",
      "name": "Cala dell'Acquaviva",
      "lat": 39.991484,
      "lng": 18.413863,
      "type": "beach",
      "sandType": "rocks",
      "protectedFrom": [
        "N",
        "NW",
        "W"
      ],
      "exposed": [
        "E",
        "SE",
        "S"
      ],
      "description": "Hidden natural inlet with emerald waters",
      "translationKey": "beach_acquaviva",
      "bookingLink": null,
      "distance": "14 km",
      "sea": "adriatico",
      "distanceNum": 14,
      "activities": ["snorkel", "hidden", "nature"],
      "description_it": "Insenatura nascosta con acque verde smeraldo. Un gioiello selvaggio raggiungibile a piedi.",
      "facilities": [],
      "images": [
        "cala-acquaviva.jpg"
      ]
    },
    {
      "id": "grotta-poesia",
      "name": "Grotta della Poesia",
      "lat": 40.285822,
      "lng": 18.429564,
      "type": "attraction",
      "sandType": "rocks",
      "protectedFrom": [
        "W",
        "SW",
        "NW"
      ],
      "exposed": [
        "E",
        "NE",
        "SE"
      ],
      "description": "Famous natural cave pool with crystal clear water",
      "translationKey": "beach_grotta_poesia",
      "bookingLink": null,
      "distance": "20 km",
      "sea": "adriatico",
      "distanceNum": 20,
      "activities": ["nature", "hidden"],
      "description_it": "Grotta preistorica con piscina naturale. Uno dei siti archeologici marini più importanti del Salento.",
      "facilities": [
        "parking"
      ],
      "images": [
        "grotta-poesia.jpg"
      ]
    },
    {
      "id": "grotta-verde",
      "name": "Grotta Verde",
      "lat": 39.963653,
      "lng": 18.4041,
      "type": "attraction",
      "sandType": "rocks",
      "protectedFrom": [
        "N",
        "NW",
        "W"
      ],
      "exposed": [
        "E",
        "SE",
        "S"
      ],
      "description": "Natural sea cave with green luminescence phenomenon",
      "translationKey": "beach_grotta_verde",
      "bookingLink": null,
      "distance": "17 km",
      "sea": "adriatico",
      "distanceNum": 17,
      "activities": ["nature", "hidden"],
      "description_it": "Grotta marina con fenomeno di luminescenza verde. Accessibile solo via mare.",
      "facilities": [
        "boat_access"
      ],
      "images": [
        "grotta-verde.jpg"
      ]
    },
    {
      "id": "santa-cesarea",
      "name": "Santa Cesarea Terme",
      "lat": 40.0333,
      "lng": 18.45,
      "type": "beach",
      "sandType": "rocks",
      "protectedFrom": [
        "N",
        "NW",
        "W"
      ],
      "exposed": [
        "E",
        "SE",
        "S"
      ],
      "description": "Thermal spa town with therapeutic waters",
      "translationKey": "beach_santa_cesarea",
      "bookingLink": null,
      "distance": "11 km",
      "sea": "adriatico",
      "distanceNum": 11,
      "activities": ["thermal", "snorkel"],
      "description_it": "Cittadina termale con acque curative e panorami mozzafiato sulla costa adriatica.",
      "facilities": [
        "parking",
        "restaurants",
        "thermal_spa"
      ],
      "images": [
        "santa-cesarea.jpg"
      ]
    },
    {
      "id": "gradoni",
      "name": "Spiaggia dei Gradoni",
      "lat": 40.149091,
      "lng": 18.486969,
      "type": "beach",
      "sandType": "pebbles",
      "protectedFrom": [
        "W",
        "NW",
        "N"
      ],
      "exposed": [
        "E",
        "SE",
        "S"
      ],
      "description": "City beach with easy access and amenities",
      "translationKey": "beach_gradoni",
      "bookingLink": null,
      "distance": "5 km",
      "sea": "adriatico",
      "distanceNum": 5,
      "activities": ["swim", "family"],
      "description_it": "Spiaggia cittadina di Otranto con accesso comodo, ideale per le famiglie con bambini.",
      "facilities": [
        "parking",
        "restaurants",
        "umbrellas",
        "showers"
      ],
      "images": [
        "spiaggia_gradoni.jpg"
      ]
    },
    {
      "id": "porto-selvaggio",
      "name": "Porto Selvaggio",
      "lat": 40.147889,
      "lng": 17.975022,
      "type": "beach",
      "sandType": "rocks",
      "protectedFrom": [
        "N",
        "NE",
        "E",
        "SE"
      ],
      "exposed": [
        "S",
        "SW",
        "W",
        "NW"
      ],
      "description": "Wild natural reserve with pristine rocky coastline",
      "translationKey": "beach_porto_selvaggio",
      "bookingLink": null,
      "distance": "45 km",
      "sea": "ionico",
      "distanceNum": 45,
      "activities": ["nature", "hidden", "snorkel"],
      "description_it": "Riserva naturale incontaminata raggiungibile solo a piedi. Costa selvaggia di rara bellezza.",
      "facilities": [
        "hiking",
        "nature_reserve"
      ],
      "images": [
        "porto_selvaggio.jpg"
      ]
    },
    {
      "id": "baia-verde",
      "name": "Gallipoli - Baia Verde",
      "lat": 40.05,
      "lng": 17.9833,
      "type": "beach",
      "sandType": "fine_sand",
      "protectedFrom": [
        "N",
        "NE",
        "E",
        "SE"
      ],
      "exposed": [
        "S",
        "SW",
        "W",
        "NW"
      ],
      "description": "Lively beach with nightlife and beach clubs",
      "translationKey": "beach_baia_verde",
      "bookingLink": "https://www.spiagge.it/stabilimenti-balneari/?se=1&page=1&sid=4aef3697-5276-4e89-beec-6fb808c7f494&&query=gallipoli",
      "distance": "55 km",
      "sea": "ionico",
      "distanceNum": 55,
      "activities": ["swim", "family", "nightlife"],
      "description_it": "La spiaggia più animata del Salento. Lidi attrezzati, vita notturna e acque ioniche.",
      "facilities": [
        "parking",
        "beach_clubs",
        "restaurants",
        "nightlife"
      ],
      "images": [
        "baia-verde.jpg"
      ]
    },
    {
      "id": "punta-suina",
      "name": "Gallipoli - Punta della Suina",
      "lat": 40.0167,
      "lng": 17.95,
      "type": "beach",
      "sandType": "golden_sand",
      "protectedFrom": [
        "N",
        "NE",
        "E",
        "SE"
      ],
      "exposed": [
        "S",
        "SW",
        "W",
        "NW"
      ],
      "description": "Beautiful golden sand beach on Ionian coast",
      "translationKey": "beach_punta_suina",
      "bookingLink": null,
      "distance": "58 km",
      "sea": "ionico",
      "distanceNum": 58,
      "activities": ["swim", "family"],
      "description_it": "Sabbia dorata finissima sulla costa ionica di Gallipoli. Ideale per lunghe giornate al mare.",
      "facilities": [
        "parking",
        "beach_bar",
        "umbrellas"
      ],
      "images": [
        "punta-della-suina.jpg"
      ]
    },
    {
      "id": "porto-cesareo",
      "name": "Porto Cesareo",
      "lat": 40.2667,
      "lng": 17.9,
      "type": "beach",
      "sandType": "fine_sand",
      "protectedFrom": [
        "N",
        "NE",
        "E",
        "SE"
      ],
      "exposed": [
        "S",
        "SW",
        "W",
        "NW"
      ],
      "description": "Marine protected area with crystal clear water",
      "translationKey": "beach_porto_cesareo",
      "bookingLink": "https://www.spiagge.it/stabilimenti-balneari/?se=1&page=1&sid=84db2e7a-23cb-4046-94d9-74580ab98ec3&&query=porto+cesareo",
      "distance": "40 km",
      "sea": "ionico",
      "distanceNum": 40,
      "activities": ["swim", "snorkel", "dive", "nature"],
      "description_it": "Area marina protetta con fondale cristallino. Paradiso del diving e dello snorkeling ionico.",
      "facilities": [
        "parking",
        "restaurants",
        "boat_tours",
        "diving"
      ],
      "images": [
        "porto-cesareo.jpg"
      ]
    },
    {
      "id": "santa-maria-bagno",
      "name": "Santa Maria al Bagno",
      "lat": 40.1833,
      "lng": 17.9667,
      "type": "beach",
      "sandType": "rocks",
      "protectedFrom": [
        "N",
        "NE",
        "E",
        "SE"
      ],
      "exposed": [
        "S",
        "SW",
        "W",
        "NW"
      ],
      "description": "Rocky cliffs with natural pools",
      "translationKey": "beach_santa_maria_bagno",
      "bookingLink": "https://www.bagnomaria.com/",
      "distance": "48 km",
      "sea": "ionico",
      "distanceNum": 48,
      "activities": ["snorkel", "nature"],
      "description_it": "Scogliere naturali con piscine di roccia e acque calme, perfette per il relax.",
      "facilities": [
        "parking",
        "restaurants"
      ],
      "images": [
        "santa-maria-bagno.jpg"
      ]
    },
    {
      "id": "santa-caterina",
      "name": "Santa Caterina",
      "lat": 40.0667,
      "lng": 18.0333,
      "type": "beach",
      "sandType": "rocks",
      "protectedFrom": [
        "N",
        "NE",
        "E",
        "SE"
      ],
      "exposed": [
        "S",
        "SW",
        "W",
        "NW"
      ],
      "description": "Spectacular caves and rocky cliffs",
      "translationKey": "beach_santa_caterina",
      "bookingLink": null,
      "distance": "52 km",
      "sea": "ionico",
      "distanceNum": 52,
      "activities": ["snorkel", "dive", "nature"],
      "description_it": "Grotte e scogliere spettacolari sulla costa ionica. Meta ideale per i subacquei.",
      "facilities": [
        "parking",
        "diving"
      ],
      "images": [
        "santa-caterina.jpg"
      ]
    },
    {
      "id": "torre-san-giovanni",
      "name": "Torre San Giovanni",
      "lat": 39.9333,
      "lng": 18.0833,
      "type": "beach",
      "sandType": "fine_sand",
      "protectedFrom": [
        "N",
        "NE",
        "E",
        "SE"
      ],
      "exposed": [
        "S",
        "SW",
        "W",
        "NW"
      ],
      "description": "Family-friendly sandy beach with shallow water",
      "translationKey": "beach_torre_san_giovanni",
      "bookingLink": "https://www.spiagge.it/stabilimenti-balneari/?se=1&page=1&sid=09fe02aa-8356-48d8-95f7-c8d7073416bc&&query=torre+san+giovanni",
      "distance": "65 km",
      "sea": "ionico",
      "distanceNum": 65,
      "activities": ["swim", "family"],
      "description_it": "Spiaggia sabbiosa a bassa profondità, perfetta per famiglie con bambini piccoli.",
      "facilities": [
        "parking",
        "restaurants",
        "umbrellas",
        "playgrounds"
      ],
      "images": [
        "torre-san-giovanni.jpg"
      ]
    }
  ],
  "attractions": [
    {
      "id": "lecce",
      "name": "Lecce",
      "lat": 40.3515,
      "lng": 18.175,
      "type": "attraction",
      "category": "city",
      "description": "Baroque capital of Puglia with stunning architecture",
      "translationKey": "attraction_lecce",
      "address": "Lecce, LE",
      "distance": "30 km",
      "visitDuration": "half_day",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Lecce/@40.3515,18.175,17z"
    },
    {
      "id": "gallipoli",
      "name": "Gallipoli",
      "lat": 40.0556,
      "lng": 17.9922,
      "type": "attraction",
      "category": "city",
      "description": "Beautiful coastal city with historic old town on island",
      "translationKey": "attraction_gallipoli",
      "address": "Gallipoli, LE",
      "distance": "55 km",
      "visitDuration": "full_day",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Gallipoli/@40.0556,17.9922,17z"
    },
    {
      "id": "otranto",
      "name": "Otranto",
      "lat": 40.1436,
      "lng": 18.4908,
      "type": "attraction",
      "category": "city",
      "description": "Historic coastal town with stunning cathedral and castle",
      "translationKey": "attraction_otranto",
      "address": "Otranto, LE",
      "distance": "6 km",
      "visitDuration": "half_day",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Otranto/@40.1436,18.4908,17z"
    },
    {
      "id": "santa-maria-leuca",
      "name": "Santa Maria di Leuca",
      "lat": 39.7972,
      "lng": 18.3611,
      "type": "attraction",
      "category": "landmark",
      "description": "Southernmost point of Puglia where Adriatic and Ionian seas meet",
      "translationKey": "attraction_leuca",
      "address": "Santa Maria di Leuca, LE",
      "distance": "35 km",
      "visitDuration": "half_day",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Santa%20Maria%20di%20Leuca/@39.7972,18.3611,17z"
    },
    {
      "id": "cava-bauxite",
      "name": "Cava di Bauxite",
      "lat": 40.131925,
      "lng": 18.500634,
      "type": "attraction",
      "category": "natural",
      "description": "Former bauxite quarry with emerald lake and red earth",
      "translationKey": "attraction_bauxite",
      "address": "Otranto, LE",
      "distance": "4 km",
      "visitDuration": "1_hour",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Cava%20di%20Bauxite/@40.131925,18.500634,17z"
    },
    {
      "id": "grotta-zinzulusa",
      "name": "Grotta Zinzulusa",
      "lat": 40.0083,
      "lng": 18.425,
      "type": "attraction",
      "category": "cave",
      "description": "Spectacular marine cave with stalactites and stalagmites",
      "translationKey": "attraction_zinzulusa",
      "address": "Castro, LE",
      "distance": "12 km",
      "visitDuration": "2_hours",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Grotta%20Zinzulusa/@40.0083,18.425,17z"
    },
    {
      "id": "punta-palascia",
      "name": "Punta Palascia",
      "lat": 40.1083,
      "lng": 18.5194,
      "type": "attraction",
      "category": "landmark",
      "description": "Easternmost point of Italy with lighthouse and stunning views",
      "translationKey": "attraction_palascia",
      "address": "Otranto, LE",
      "distance": "7 km",
      "visitDuration": "1_hour",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Punta%20Palascia/@40.1083,18.5194,17z"
    },
    {
      "id": "cattedrale-otranto",
      "name": "Cattedrale di Otranto",
      "lat": 40.1436,
      "lng": 18.4916,
      "type": "attraction",
      "category": "religious",
      "description": "Medieval cathedral with stunning mosaic floor",
      "translationKey": "attraction_cattedrale",
      "address": "Piazza Basilica, Otranto",
      "distance": "6 km",
      "visitDuration": "1_hour",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Cattedrale%20di%20Otranto/@40.1436,18.4916,17z"
    }
  ],
  "nightlife": [
    {
      "id": "skafe",
      "name": "Skafe al Casotto",
      "lat": 40.1436,
      "lng": 18.4916,
      "type": "nightlife",
      "category": "bar",
      "description": "Trendy bar in front of the sea",
      "translationKey": "nightlife_skafe",
      "address": "Porto Badisco, LE",
      "distance": "6 km",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Skafe%20al%20Casotto/@40.1436,18.4916,17z"
    },
    {
      "id": "spinnaker",
      "name": "Spinnaker",
      "lat": 40.2667,
      "lng": 18.4167,
      "type": "nightlife",
      "category": "beach_club",
      "description": "Beach club with restaurant and evening entertainment",
      "translationKey": "nightlife_spinnaker",
      "address": "Otranto, LE",
      "distance": "19 km",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Spinnaker/@40.2667,18.4167,17z"
    },
    {
      "id": "la-casaccia",
      "name": "La Casaccia",
      "lat": 40.143,
      "lng": 18.49,
      "type": "nightlife",
      "category": "restaurant_bar",
      "description": "Restaurant and cocktail bar in Otranto",
      "translationKey": "nightlife_casaccia",
      "address": "Torre dell'Orso, LE",
      "distance": "6 km",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/La%20Casaccia/@40.143,18.49,17z"
    },
    {
      "id": "blu-bay",
      "name": "Blu Bay",
      "lat": 40.0167,
      "lng": 18.43,
      "type": "nightlife",
      "category": "beach_club",
      "description": "Beach club with restaurant and live music",
      "translationKey": "nightlife_blubay",
      "address": "Santa Cesarea Terme, LE",
      "distance": "11 km",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Blu%20Bay/@40.0167,18.43,17z"
    },
    {
      "id": "guendalina",
      "name": "Guendalina",
      "lat": 40.0333,
      "lng": 18.45,
      "type": "nightlife",
      "category": "beach_club",
      "description": "Exclusive beach club and restaurant",
      "translationKey": "nightlife_guendalina",
      "address": "Santa Cesarea Terme, LE",
      "distance": "11 km",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Guendalina/@40.0333,18.45,17z"
    },
    {
      "id": "male",
      "name": "Malé",
      "lat": 40.034,
      "lng": 18.451,
      "type": "nightlife",
      "category": "beach_club",
      "description": "Stylish beach club with DJ sets",
      "translationKey": "nightlife_male",
      "address": "Santa Cesarea Terme, LE",
      "distance": "11 km",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Mal%C3%A9/@40.034,18.451,17z"
    }
  ],
  "services": [
    {
      "id": "conad-uggiano",
      "name": "Supermercato Conad",
      "lat": 40.102983,
      "lng": 18.456386,
      "type": "service",
      "category": "supermarket",
      "description": "Main supermarket in Uggiano la Chiesa",
      "translationKey": "service_conad",
      "address": "Uggiano la Chiesa, LE",
      "distance": "800 m",
      "hours": "Mon-Sat 8:00-13:00, 17:00-20:30",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Supermercato%20Conad/@40.102983,18.456386,17z"
    },
    {
      "id": "Supermercato-3M",
      "name": "Supermercato 3M",
      "lat": 40.100415,
      "lng": 18.444608,
      "type": "service",
      "category": "supermarket",
      "description": "Discount supermarket",
      "translationKey": "service_3m",
      "address": "Uggiano la Chiesa, LE",
      "distance": "400 m",
      "hours": "Mon-Sat 8:30-20:00",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Supermercato%203M/@40.100415,18.444608,17z"
    },
    {
      "id": "farmacia-comunale",
      "name": "Farmacia Camboa",
      "lat": 40.100886,
      "lng": 18.446254,
      "type": "service",
      "category": "pharmacy",
      "description": "Local pharmacy",
      "translationKey": "service_farmacia",
      "address": "Uggiano la Chiesa, LE",
      "distance": "200 m",
      "hours": "Mon-Sat 9:00-13:00, 16:30-20:00",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Farmacia%20Camboa/@40.100886,18.446254,17z"
    },
    {
      "id": "lavanderia",
      "name": "Lavanderia Self-Service",
      "lat": 40.099987,
      "lng": 18.443185,
      "type": "service",
      "category": "laundry",
      "description": "Self-service laundromat",
      "translationKey": "service_lavanderia",
      "address": "Uggiano la Chiesa, LE",
      "distance": "600 m",
      "hours": "24/7",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Lavanderia%20Self-Service/@40.099987,18.443185,17z"
    },
    {
      "id": "macelleria",
      "name": "Macelleria",
      "lat": 40.101084,
      "lng": 18.443858,
      "type": "service",
      "category": "butcher",
      "description": "Local butcher shop",
      "translationKey": "service_macelleria",
      "address": "Uggiano la Chiesa, LE",
      "distance": "300 m",
      "hours": "24/7",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Macelleria/@40.101084,18.443858,17z"
    },
    {
      "id": "fruttivendolo",
      "name": "Fruttivendolo",
      "lat": 40.101401,
      "lng": 18.447798,
      "type": "service",
      "category": "fruit_vendor",
      "description": "Local fruit vendor",
      "translationKey": "service_fruttivendolo",
      "address": "Uggiano la Chiesa, LE",
      "distance": "250 m",
      "hours": "24/7",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Fruttivendolo/@40.101401,18.447798,17z"
    },
    {
      "id": "forno",
      "name": "Forno",
      "lat": 40.101336,
      "lng": 18.454711,
      "type": "service",
      "category": "bakery",
      "description": "Local bakery",
      "translationKey": "service_forno",
      "address": "Uggiano la Chiesa, LE",
      "distance": "850 m",
      "hours": "24/7",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Forno/@40.101336,18.454711,17z"
    },
    {
      "id": "poste-italiane",
      "name": "Poste Italiane",
      "lat": 40.100315,
      "lng": 18.451252,
      "type": "service",
      "category": "post_office",
      "description": "Local post office",
      "translationKey": "service_poste_italiane",
      "address": "Uggiano la Chiesa, LE",
      "distance": "650 m",
      "hours": "Mon-Fri 8:30-13:30",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Poste%20Italiane/@40.100315,18.451252,17z"
    },
    {
      "id": "Pescheria",
      "name": "Pescheria",
      "lat": 40.101214,
      "lng": 18.451527,
      "type": "service",
      "category": "fish_market",
      "description": "Local fish market",
      "translationKey": "service_pescheria",
      "address": "Uggiano la Chiesa, LE",
      "distance": "600 m",
      "hours": "Mon-Fri 8:30-13:30",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Pescheria/@40.101214,18.451527,17z"
    },
    {
      "id": "Tabacchi",
      "name": "Tabacchi",
      "lat": 40.101485,
      "lng": 18.448144,
      "type": "service",
      "category": "tabacchi",
      "description": "Local tobacco shop",
      "translationKey": "service_tabacchi",
      "address": "Uggiano la Chiesa, LE",
      "distance": "300 m",
      "hours": "Mon-Fri 8:30-13:30 16:30-20:00",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Tabacchi/@40.101485,18.448144,17z"
    }
  ],
  "restaurants": [
    {
      "id": "Matisse",
      "name": "Matisse",
      "lat": 40.099769,
      "lng": 18.444948,
      "type": "restaurant",
      "category": "fish",
      "description": "Ristorante di pesce e carne",
      "translationKey": "restaurant_matisse",
      "address": "Uggiano la Chiesa, LE",
      "distance": "500 m",
      "cuisine": "pugliese",
      "priceRange": "medium_high",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Matisse/@40.099769,18.444948,17z"
    },
    {
      "id": "Agrodolce",
      "name": "Agrodolce",
      "lat": 40.098111,
      "lng": 18.463771,
      "type": "restaurant",
      "category": "restaurant",
      "description": "Ristorante locale di carne e pesce",
      "translationKey": "restaurant_agrodolce",
      "address": "Uggiano la Chiesa, LE",
      "distance": "900 m",
      "cuisine": "pugliese",
      "priceRange": "medium",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Agrodolce/@40.098111,18.463771,17z"
    },
    {
      "id": "mozzica-e-fusci",
      "name": "Mozzica e Fusci",
      "lat": 40.101128,
      "lng": 18.451997,
      "type": "restaurant",
      "category": "pizzeria",
      "description": "Pizzeria tradizionale",
      "translationKey": "restaurant_mozzica_fusci",
      "address": "Uggiano la Chiesa, LE",
      "distance": "700 m",
      "cuisine": "pizza",
      "priceRange": "low",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Mozzica%20e%20Fusci/@40.101128,18.451997,17z"
    },
    {
      "id": "isola-del-sole",
      "name": "Isola del Sole",
      "lat": 40.002448,
      "lng": 18.42314,
      "type": "restaurant",
      "category": "ristorante di pesce",
      "description": "Frigitoria e ristorante di pesce",
      "translationKey": "restaurant_isola_del_sole",
      "address": "Castro, LE",
      "distance": "15 km",
      "cuisine": "contemporary",
      "priceRange": "low_medium",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Isola%20del%20Sole/@40.002448,18.42314,17z"
    },
    {
      "id": "la-gramola",
      "name": "La Gramola",
      "lat": 40.124919,
      "lng": 18.450382,
      "type": "restaurant",
      "category": "ristorante di pesce",
      "description": "ristorante tipico di pesce e carne",
      "translationKey": "restaurant_la_gramola",
      "address": "Uggiano la Chiesa, LE",
      "distance": "3 km",
      "cuisine": "contemporary",
      "priceRange": "low_medium",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/La%20Gramola/@40.124919,18.450382,17z"
    },
    {
      "id": "le-tagliate",
      "name": "Le Tagliate",
      "lat": 40.098005,
      "lng": 18.464483,
      "type": "restaurant",
      "category": "agriturismo",
      "description": "Agriturismo con cucina tradizionale e prodotti locali",
      "translationKey": "restaurant_le_tagliate",
      "address": "Uggiano la Chiesa, LE",
      "distance": "2 km",
      "cuisine": "contemporary",
      "priceRange": "low_medium",
      "images": [],
      "mapsUrl": "https://www.google.com/maps/search/Le%20Tagliate/@40.098005,18.464483,17z"
    }
  ]
};
