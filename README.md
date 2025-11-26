# Fire Tablet Dashboard

A Next.js dashboard with an iOS-inspired dark mode design, optimized for Fire Tablet display. Shows weather information from OpenWeatherMap and calendar events from Google Calendar or iCal feeds.

## Features

- **Modern Dark Mode Design**
  - iOS-inspired glassmorphism with dark charcoal background
  - Smooth gradients and backdrop blur effects
  - Clean, modern card-based layout

- **Clock & Date Display**
  - Large, easy-to-read clock
  - Current date with day of week

- **Weather Display**
  - Current temperature and conditions split into two cards
  - High/low temperatures for today
  - 6-hour forecast with probability of precipitation
  - 7-day forecast with POP% and total precipitation
  - Comprehensive weather details:
    - Feels like temperature
    - Humidity percentage
    - Wind speed and direction
    - Total precipitation expected today
    - UV Index
    - Air Quality Index (AQI)
    - Next sunrise/sunset time
    - Current moon phase with 28-phase icon accuracy
  - All measurements in metric units (°C, km/h, cm)

- **Calendar Display**
  - Today's Schedule with auto-scrolling
  - Toggle to view Tomorrow's Schedule
  - Color-coded events
  - Customizable calendar colors per source

- **Auto-Refresh**
  - Weather refreshes every 5 minutes
  - Calendar refreshes every minute

## Prerequisites

1. **OpenWeatherMap API Key**
   - Sign up at [https://openweathermap.org/api](https://openweathermap.org/api)
   - Get your API key from your account dashboard
   - **Important:** This dashboard uses the **One Call API** for hourly weather data
     - The deprecated One Call API 2.5 is still available for some users (free)
     - New users may need to subscribe to One Call API 3.0 ($0.0015 per call, ~1,000 free calls/day)
     - Without One Call API access, hourly forecasts will not work

2. **Calendar Setup** (Choose one or both):

   **Option A: Google Calendar API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (or select existing)
   - Enable Google Calendar API
   - Create a Service Account:
     - Go to "IAM & Admin" → "Service Accounts"
     - Click "Create Service Account"
     - Give it a name and create
     - Click on the service account → "Keys" tab
     - Add Key → Create New Key → JSON
     - Download the JSON file
   - Share your Google Calendar with the service account email
     - Open Google Calendar
     - Settings → Your calendar → Share with specific people
     - Add the service account email (found in the JSON file)
     - Give it "Make changes to events" permission

   **Option B: iCal URLs**
   - Get iCal URL from your calendar provider (Google Calendar, Outlook, etc.)
   - For Google Calendar: Settings → Calendar → Integrate calendar → Secret address in iCal format

## Installation

1. Clone the repository:
```bash
git clone https://github.com/matthewvarlow/E-Ink-Weather-Calendar-Dashboard.git
cd E-Ink-Weather-Calendar-Dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` with your API credentials:

```env
# OpenWeatherMap API
OPENWEATHERMAP_API_KEY=your_api_key_here
OPENWEATHERMAP_CITY=your_city_name
OPENWEATHERMAP_LAT=your_latitude
OPENWEATHERMAP_LON=your_longitude

# Google Calendar API (Optional - if using Google Calendar)
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_IDS=calendar1@gmail.com,calendar2@gmail.com

# iCal URLs (Optional - if using iCal feeds)
ICAL_URLS=https://calendar.google.com/calendar/ical/...
```

**Note for Google Private Key:**
- Open the downloaded JSON file from Google Cloud Console
- Copy the entire `private_key` value (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
- Make sure to keep the `\n` characters in the key - they represent newlines

**Getting Your Coordinates:**
- Go to [https://www.latlong.net/](https://www.latlong.net/)
- Search for your city
- Copy the latitude and longitude values

## Running the Dashboard

### Development Mode
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Mode
```bash
npm run build
npm start
```

## Deploying to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables in Vercel project settings
5. Deploy

## Deploying to Fire Tablet

1. Deploy to Vercel (see above)
2. Install **Fully Kiosk Browser** on your Fire Tablet
3. Configure Fully Kiosk:
   - Set your Vercel URL as the start URL
   - Enable kiosk mode
   - Adjust zoom/scaling settings to fit your screen
   - Enable auto-reload if desired

## Project Structure

```
fire_tablet_dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── weather/route.ts    # Weather API endpoint
│   │   │   └── calendar/route.ts   # Calendar API endpoint
│   │   ├── page.tsx                # Main dashboard page
│   │   ├── layout.tsx              # Root layout
│   │   └── globals.css             # Dark mode styles
│   └── components/
│       ├── Weather.tsx             # Weather component
│       ├── WeatherIcon.tsx         # Weather icon component
│       └── Calendar.tsx            # Calendar component
├── .env.local                      # Your API credentials (not in git)
├── .env.example                    # Example environment variables
└── package.json
```

## Customization

### Change Weather Refresh Interval

Edit `src/app/page.tsx` - weather refreshes every 5 minutes by default.

### Change Calendar Refresh Interval

Edit `src/app/page.tsx` - calendar refreshes every minute by default.

### Customize Calendar Colors

Edit `src/components/Calendar.tsx` to modify the color scheme for different calendars.

## Troubleshooting

### Weather not loading
- Verify your OpenWeatherMap API key is active
- Check that latitude and longitude are correct
- Ensure you haven't exceeded the free tier API limits

### Calendar not loading
- **For Google Calendar:**
  - Verify the service account email has access to your calendar
  - Check that the private key is properly formatted in `.env.local`
  - Make sure the calendar IDs are correct
- **For iCal:**
  - Verify the iCal URLs are accessible
  - Check that the URLs are the "Secret address in iCal format"

### Display issues
- Adjust zoom settings in Fully Kiosk Browser to fit your screen
- Check browser console for error messages
- Verify environment variables are set correctly in Vercel

## Technologies Used

- [Next.js 16](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS 4](https://tailwindcss.com/) - Styling
- [date-fns](https://date-fns.org/) - Date manipulation
- [Google APIs](https://github.com/googleapis/google-api-nodejs-client) - Calendar integration
- [OpenWeatherMap API](https://openweathermap.org/api) - Weather data

## License

MIT
