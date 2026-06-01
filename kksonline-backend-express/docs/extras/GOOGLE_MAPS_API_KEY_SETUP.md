# LocationIQ API Key Setup Guide

## Overview

This project uses **OpenStreetMap** for map display (free) and **LocationIQ** for geocoding (free tier: 5,000 requests/day).

## Quick Setup

### 1. Get LocationIQ API Key

Visit: **https://locationiq.com/**

- Click **Sign Up** (top right)
- Create account (email + password)
- Verify email
- Login to dashboard
- Copy your API key (shown on dashboard)

### 2. Add to Project

Create or edit `react-frontend/.env`:

```env
VITE_LOCATIONIQ_API_KEY=pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Restart Dev Server

```bash
npm run dev
```

Done! Map and geocoding now work.

## Free Tier Limits

- **5,000 requests/day** (resets daily)
- **2 requests/second**
- No credit card required
- Perfect for development and small production apps

## Usage Tips

**Efficient Use:**
- Geocode once per order (already implemented)
- Store coordinates in database
- No repeated geocoding needed

**Our Usage:**
- Customer selects location: 1 request
- Search address: 1 request per search
- Average: ~2 requests per order

**Example:** 100 orders/day = ~200 requests (well under 5,000 limit)

## API Key Security

**DO:**
- Add to `.env` file
- Add `.env` to `.gitignore`
- Use different keys for dev/production

**DON'T:**
- Commit API key to repository
- Share publicly
- Use in public code

## Troubleshooting

**"LocationIQ API key not configured":**
- Check `.env` file exists in `react-frontend/` folder
- Verify key starts with `pk.`
- Restart dev server after adding key

**"Quota exceeded":**
- Free tier: 5,000/day limit reached
- Wait for daily reset (midnight UTC)
- Or upgrade plan at locationiq.com

**Map not loading:**
- Map display uses OpenStreetMap (no key needed)
- Only geocoding needs LocationIQ key
- Check browser console for specific errors

## Links

- **Dashboard**: https://my.locationiq.com/
- **Docs**: https://locationiq.com/docs
- **Pricing**: https://locationiq.com/pricing
