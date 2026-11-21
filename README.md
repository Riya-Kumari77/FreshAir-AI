# FreshAir-AI

### Your AI Companion for Cleaner Air and Healthier Living

FreshAir-AI is a Generative AI-powered Urban Air Quality Assistant built for **PromptWars Virtual – Challenge 6: Urban Air Quality Assistant**, hosted by Hack2Skill.

It combines environmental data with Gemini-powered assistance to help urban residents understand air quality, make informed daily decisions, improve indoor environments and explore sustainable alternatives.

**Repository:** https://github.com/Riya-Kumari77/FreshAir-AI

## The Problem

Urban air pollution and winter smog affect everyday activities, but environmental information is often difficult to interpret. Families need practical guidance on outdoor activities, indoor air quality and lower-emission lifestyle choices.

FreshAir-AI brings these resources together in one location-aware application.

## Features

- **Air Quality Dashboard:** View available AQI readings, pollutant measurements, weather conditions and hourly trends.
- **AI Air Quality Assistant:** Ask Gemini for practical recommendations based on environmental context and user preferences.
- **Daily Routine Planner:** Get AI-generated suggestions for morning, afternoon and evening.
- **Indoor Air Guide:** Generate room-specific suggestions based on room details and household preferences.
- **Sustainability Tracker:** Compare commuting alternatives, estimate CO₂e savings and record sustainable actions.
- **Location Selection:** Search for locations and retrieve environmental information for selected coordinates.
- **Personalization:** Configure household and lifestyle preferences.
- **Language Support:** English and Hindi interfaces and AI responses.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| Generative AI | Google Gemini API (`@google/genai`) |
| Environmental Data | Open-Meteo Air Quality, Weather and Geocoding APIs |
| Charts | Recharts |
| Icons | Lucide React |
| Local Preferences | Browser local storage |
| Version Control | Git and GitHub |

## How It Works

1. The user selects a location.
2. The backend retrieves available air-quality and weather information from Open-Meteo.
3. The application provides the environmental context and relevant user preferences to Gemini.
4. Gemini generates contextual recommendations for the requested feature.
5. The user can explore air-quality insights, daily routines, indoor guidance and sustainability estimates.

**Data integrity:** Environmental readings are retrieved from the data provider, not invented by the AI. Unavailable readings are treated as unavailable rather than assumed values.

## Getting Started

### Prerequisites

- Node.js 20.6 or later
- npm
- A Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/Riya-Kumari77/FreshAir-AI.git
cd FreshAir-AI
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file by copying the example:

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

Open `.env` and add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
```

Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

Keep your actual `.env` file private. Never commit API keys to GitHub.

### 4. Start the application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create the production frontend build |
| `npm run lint` | Run TypeScript type checking |

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check server health |
| GET | `/api/locations/search` | Search for locations |
| GET | `/api/environment` | Retrieve environmental data |
| POST | `/api/ai/chat` | Generate assistant responses |
| POST | `/api/ai/recommendations` | Generate dashboard recommendations |
| POST | `/api/ai/daily-plan` | Generate a daily routine |
| POST | `/api/ai/indoor-advice` | Generate indoor air guidance |

## Data Sources and Limitations

- Air-quality information is provided by the [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api).
- Weather information is provided by the [Open-Meteo Weather API](https://open-meteo.com/en/docs).
- Location search uses the [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api).
- The application exposes US AQI and European AQI as separate indices. They use different scales and should not be treated as interchangeable.
- Environmental API values are model-based estimates or forecasts, not necessarily measurements from a nearby regulatory monitoring station.
- Sustainability figures are estimates based on configured emission factors and recorded user actions.

## Responsible Use

FreshAir-AI is an environmental awareness and informational tool. Its recommendations are not medical diagnoses or a replacement for official pollution advisories or professional medical guidance.

Data availability and AI responses depend on external service availability, API limits and network connectivity.

## Project Status

The application has a working local development setup, environmental data integration and Gemini-powered features. Further testing, deployment and improvements are ongoing.

## Built For

**PromptWars Virtual – Hack2Skill**  
**Challenge 6: Urban Air Quality Assistant**

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
