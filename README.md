# GeoGuardian

GeoGuardian is a safety-first location-sharing mobile app designed to protect users in unfamiliar environments. It offers real-time tracking, emergency voice-activated SOS features, and intelligent safe zone awareness — built for students, families, and travelers who prioritize safety.

[View on Devpost](https://devpost.com/software/geoguardian-51zj29)

---

## Features

- Firebase Authentication – Secure sign-up and login
- Live Location Sharing – Track and share your real-time location with your circle
- AI Emergency System – Say “help” to instantly trigger an emergency response
- Dynamic Safe Zones – Automatically surfaces nearby hospitals, police, fire stations, and more
- Voice-Activated Alerts – No clicks needed in emergencies
- Reward System – Drive safely to earn monthly tokens (Web3-ready concept)

---

## Tech Stack

- Frontend: React Native + Expo
- Backend: Firebase (Auth, Firestore, Storage)
- Location Services: Mapbox
- Places Search: Google Places API
- Voice and AI: Deepgram API

---

## How to Run Locally

Make sure you have Node.js, Expo CLI, and npm installed.

1. Clone the repo:
   ```bash
   git clone https://github.com/chadvitiya/Geo-Guardian-Final.git
   cd Geo-Guardian-Final
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:

   A `.env` file is already provided with placeholder keys.  
   **Edit the `.env` file and replace the placeholder values with your actual API keys:**

   ```env
   VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
   VITE_GOOGLE_PLACES_API_KEY=your-google-api-key
   VITE_DEEPGRAM_API_KEY=your-deepgram-api-key
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

4. Start the project:
   ```bash
   npm run dev
   ```

---

## Team

Built with care for safety and accessibility.  
By: Advitiya Gaikwad and Shravani Koli

---

## License

MIT License — free to use and modify with attribution.

---

## Inspiration

GeoGuardian was inspired by the everyday challenges faced by international students and travelers navigating unfamiliar cities. Emergencies can happen anytime — and we wanted to make safety accessible, fast, and intuitive. Just say “Help, GeoGuardian” and the app knows what to do, saving critical seconds when it matters most.
