# SafeRoute — Judge Guide

## 30-second explanation
SafeRoute is a time-aware safety layer on top of normal navigation. Instead of assigning one permanent safety score to a street, it evaluates each route segment at the time the traveller is expected to reach it. It combines lighting, activity, community reports, freshness/confidence and distance to public help, then shows the evidence and lets the user choose.

## Demo flow
1. Start with the demo trip at 10 PM.
2. Compare Fastest, Balanced and Lowest Risk.
3. Move the departure slider from 6 PM to 11 PM. Explain that segment arrival times shift, so risk can change even though the geometry does not.
4. Click the high-risk segment. Show lighting, activity, reports, freshness and confidence.
5. Submit/simulate a high-confidence report. The live layer re-scores affected evidence and offers an alternative only when the improvement is meaningful.
6. Open the route explanation. Emphasize that the app never claims 100% safety.

## What is real in the prototype
- React + Leaflet interactive map UI.
- Route comparison and route-specific segment scoring.
- Journey-time calculation: each segment is scored using its estimated arrival hour, not only the departure hour.
- Explainability, confidence, freshness and unknown state.
- Community-report flow and live re-evaluation demo.
- Optional FastAPI risk service.

## What is intentionally bounded
This hackathon build uses a labelled pilot/demo dataset for reliable judging. Production deployment would connect the same interfaces to OSRM/GraphHopper, Firebase/Firestore, municipal/open GIS data, aggregated historical incident context and weather sources. The architecture does not pretend that a demo dataset is a live police/crime feed.

## Hard questions
### Does this guarantee safety?
No. It provides evidence-weighted route context and uncertainty. It never guarantees personal safety.

### What if there is no data?
Unknown stays unknown. Lack of evidence is not converted to safe.

### What if people submit fake reports?
A report is evidence, not ground truth. Production scoring should use freshness decay, corroboration, duplicate detection, rate limiting and anomaly checks.

### Why not just use Google Maps?
SafeRoute is not replacing navigation. It adds a safety intelligence layer that evaluates route segments at expected arrival time and explains why a segment is flagged.

### Why not reroute every time a report arrives?
That creates route churn. SafeRoute uses a minimum-improvement threshold and only proposes an alternative when it is meaningfully better under the current evidence.

### Why use rules before ML?
Rules are transparent, tunable and feasible with limited labelled data. ML is an extension once enough quality data exists; it should not be used to invent certainty.

### How do you prevent the LLM from hallucinating safety facts?
The LLM, if added, is explanation-only. Safety facts come from structured evidence and the risk engine.

### What about privacy?
Use anonymous reporting, minimal location retention and consent-based sharing. Never expose individual reporters in aggregated city views.

## Production hardening still required
- Connect OSRM/GraphHopper for real candidate routes.
- Persist reports and verification state in Firebase/Firestore.
- Attach every evidence item to source, timestamp and geographic segment.
- Add authentication/rate limiting for reporting.
- Add automated duplicate and burst/anomaly detection.
- Add offline route cache and Safe Haven routing.
- Calibrate thresholds using a controlled validation dataset before deployment.
