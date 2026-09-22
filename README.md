# SafeRoute — Team Trishul / CX1002

A hackathon-ready web prototype implementing the SafeRoute solution from the Team Trishul deck: **time-aware, evidence-weighted safety navigation**.

## What is already implemented

- Interactive OpenStreetMap/Leaflet map
- 3 candidate route modes: Fastest, Balanced, Lowest Risk
- Segment × time risk model with 6 PM–11 PM slider
- Weak-point detection
- Explainable route recommendation
- Lighting, activity, reports, confidence and safe-point evidence cards
- Crowd-report submission UI
- Evidence confidence + "unknown stays unknown" guardrail
- Live high-confidence report simulation
- Reroute recommendation without constant route churn
- Optional FastAPI risk engine
- Responsive desktop/mobile layout

## Run frontend

```bash
npm install
npm run dev
```

Open the URL printed by Vite.

## Optional backend

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

The current frontend is deliberately self-contained for a reliable hackathon demo. The backend is the next integration point for real report persistence, risk scoring, Firebase and ML.

## Demo script

1. Open the app at 10 PM.
2. Compare Fastest vs Balanced vs Lowest Risk.
3. Move the departure slider from 6 PM to 11 PM and watch route risk change.
4. Click a red segment to show the evidence behind the flag.
5. Click **Simulate high-confidence report**.
6. Show that the live layer re-evaluates the route and offers an alternative.
7. Submit a community report and explain that reports are weighted evidence, not ground truth.

## Important product guardrails

- Never label a route "100% safe".
- Missing evidence remains Unknown.
- One report is never treated as ground truth.
- Observed evidence should remain distinct from model inference.
- Keep persistent location data minimal and use consent-based sharing.

## Next production integrations

1. OSRM/GraphHopper candidate route API with actual route geometry.
2. Firebase/Firestore for reports and verification state.
3. Municipal streetlight/open GIS datasets.
4. Aggregated historical incident context.
5. Weather/visibility context.
6. Python ML model for 30–60 minute forecasting when enough data exists.
7. Offline route cache and safe-point routing.
