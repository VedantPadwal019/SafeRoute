# SafeRoute — START HERE

## Fastest way to get a working demo

### Option A — no Node.js required
1. Open `SafeRoute_Standalone_Demo.html` in Chrome/Edge.
2. Keep internet ON because the demo loads Leaflet + OpenStreetMap tiles from CDN.
3. Use the time slider, route buttons, and Live Safety Layer buttons.
4. Record your demo video.

This is the safest option if you need a demo immediately.

### Option B — full React app
Requirements:
- Node.js 18+ (22 LTS is fine)
- npm

In Windows PowerShell:
```powershell
cd saferoute-webapp
npm install
npm run dev
```
Open the localhost URL shown by Vite, normally:
`http://localhost:5173`

### If PowerShell blocks npm scripts
Use Command Prompt instead, or run:
```powershell
npm.cmd install
npm.cmd run dev
```

## What the React app demonstrates
- Fastest / Balanced / Lowest Risk routes
- Segment × time risk calculation
- 6 PM–11 PM What-If slider
- Evidence: lighting, activity, reports, freshness, confidence
- Unknown state when evidence is insufficient
- Explainable “Why this route?” panel
- Community report flow
- Live high-confidence report simulation
- Reroute recommendation

## Optional backend
The frontend works without the backend. The backend is an optional demonstration of how the risk engine and reports can be separated into an API.

Windows:
```powershell
cd saferoute-webapp
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Health check:
`http://127.0.0.1:8000/api/health`

Risk endpoint:
`POST http://127.0.0.1:8000/api/risk`

## Important honesty for judges
This hackathon build uses a controlled pilot/demo dataset. It does NOT claim to have a live police/crime feed. Keep “DEMO DATA” visible during the presentation.

The prototype is a decision-support system, not a guarantee that a road is safe.
