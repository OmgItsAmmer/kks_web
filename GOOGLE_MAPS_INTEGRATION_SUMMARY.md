# OpenStreetMap + LocationIQ Integration

## Overview

**Map Display:** OpenStreetMap (free, no API key)  
**Geocoding:** LocationIQ (free tier: 5,000 requests/day)  
**Efficient:** Geocode once per order, store coordinates permanently

## Database Changes

**File:** `GOOGLE_MAPS_MIGRATION.sql`

Added to `addresses` and `order_addresses` tables:
- `latitude`, `longitude` - GPS coordinates
- `place_id` - Location identifier
- `formatted_address` - Full address string

**Purpose:** Store delivery location for tracking, route calculation, admin/rider dashboards.

## Components

**Map Picker:** `GoogleMapLocationPicker.tsx`
- Leaflet.js + OpenStreetMap tiles (free)
- LocationIQ for geocoding (API key required)
- Click map to select location
- Search addresses in Pakistan
- Current location button

**Checkout:** Simplified to name, phone, map selection.

## Backend

Updated to accept and store location data. Address routes and repository handle Google Maps/LocationIQ fields.

## Dependencies

- `leaflet` - Map display
- `react-leaflet` - React wrapper
- LocationIQ API key (free tier)

## Setup

1. **Run migration:** Execute `GOOGLE_MAPS_MIGRATION.sql`
2. **Sync Prisma:** `cd kksonline-backend-express && npx prisma generate`
3. **Get API key:** Sign up at https://locationiq.com/
4. **Add to .env:** `VITE_LOCATIONIQ_API_KEY=your_key`
5. **Start server:** `npm run dev`

## Usage

**Customer Flow:**
1. Open checkout
2. Click map or search location
3. Enter name and phone
4. Complete order

**Geocoding happens once, coordinates stored forever.**

## Benefits

- **Map Display:** Free (OpenStreetMap)
- **Geocoding:** 5,000 free requests/day (LocationIQ)
- **Efficient:** Only geocode when selecting location
- **Accurate:** GPS coordinates for precise delivery
- **Future-ready:** Foundation for delivery tracking

## Notes

- LocationIQ free tier: 5,000 requests/day
- No credit card required
- All fields nullable (backward compatible)
- Fair usage: Respect rate limits
