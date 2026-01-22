# Dribble-Ground Academy 🏀

A modern basketball court booking and training platform built for static deployment on Vercel.

![Academy Logo](https://i.postimg.cc/LXLkhhs6/b9e00f4504772a134f8444faab4d7b16.jpg)

## Features

- **User Authentication** - Register and login with email/password
- **Court Booking** - Book weekly or monthly training passes
- **Dashboard** - View bookings, manage profile, access documents
- **Admin Panel** - Manage users, approve bookings, view CRM analytics
- **UPI Payments** - Integrated QR code payment with WhatsApp confirmation

## Tech Stack

- **Frontend**: HTML5, Tailwind CSS (CDN), Vanilla JavaScript
- **Icons**: Lucide Icons
- **Fonts**: Google Fonts (Inter, Oswald)
- **Storage**: LocalStorage for data persistence
- **Hosting**: Vercel (Static)

## Project Structure

```
BASKETBALL/
├── index.html          # Landing page
├── signin.html         # Sign in page
├── signup.html         # Sign up page
├── dashboard.html      # Main dashboard
├── vercel.json         # Vercel configuration
├── package.json        # Project metadata
├── README.md           # Documentation
├── .gitignore          # Git ignore rules
├── css/
│   └── dashboard.css   # Dashboard styles
└── js/
    ├── app.js          # Core application logic
    └── dashboard.js    # Dashboard UI logic
```

## Quick Start

### Local Development

```bash
# Install serve globally (if not installed)
npm install -g serve

# Run local server
npx serve . -l 3000
```

Then open [http://localhost:3000](http://localhost:3000)

### Default Credentials

| Role  | Email                    | Password   |
|-------|--------------------------|------------|
| Admin | admin@dribbleground.com  | admin123   |

## Deployment to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Deploy (no build configuration needed)

Or use Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Configuration

All configuration is centralized in `js/app.js`:

```javascript
const CONFIG = {
    APP_NAME: 'Dribble-Ground Academy',
    PRICING: {
        WEEKLY: 200,    // ₹200 per week
        MONTHLY: 500    // ₹500 per month
    },
    UPI_ID: '8084970887@ybl',
    MAX_PLAYERS_PER_MONTH: 10,
    TRAINING: {
        DAYS: 'Monday to Saturday',
        TIME: '9:00 AM - 6:00 PM'
    }
};
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Data Persistence

This is a static app using **localStorage** for data persistence. This means:

- ✅ Data persists in the same browser
- ✅ Works offline after first load
- ⚠️ Data is not shared between browsers/devices
- ⚠️ Clearing browser data will erase all data

For multi-user production use, integrate with a backend service like Supabase or Firebase.

## License

MIT License

---

Built with ❤️ by Dribble-Ground Academy