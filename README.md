# Shopora Maps

A proximity-based addressing system for field agents and logistics management.

## Features

- 📍 Current location discovery using Geolocation API
- 🗺️ Add landmarks with voice notes and descriptions
- 📏 Find closest landmarks using Haversine formula (top 5)
- 🎤 Voice note recording (MediaRecorder API, Base64 storage)
- 📊 Real-time agent performance tracking (Admin Panel)
- 🔄 Offline support with automatic sync
- ⚡ Real-time updates via Supabase Realtime
- 📦 GeoJSON bounding box generation

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `database-schema.sql` in Supabase SQL Editor
3. Enable Realtime: Run `ALTER PUBLICATION supabase_realtime ADD TABLE landmarks;` in SQL Editor
4. Get your credentials from Settings → API

### 3. Configure Environment

Create a `.env` file:
```
VITE_APP_ID=shopora-maps-dev
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_INITIAL_AUTH_TOKEN=
```

### 4. Run the App
```bash
npm run dev
```

## Project Structure

```
coffee/
├── App.jsx              # Main application (single file)
├── main.jsx             # React entry point
├── index.html           # HTML template
├── sw.js                # Service Worker (offline support)
├── database-schema.sql  # Supabase database schema
└── env.example          # Environment variables template
```

## Tech Stack

- React 18
- Vite
- Supabase
- Tailwind CSS
- Service Worker API
- Geolocation API
- MediaRecorder API

## Requirements

- Node.js 16+
- Supabase account
- Modern browser with Geolocation support

# shopora-maps
