import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import { Shield, Clock3, Route, AlertTriangle, Radio, Info, Navigation, Send, RefreshCw, ChevronRight, MapPin, Lightbulb, Users, Activity, Lock, CheckCircle2, Database, Eye, Cloud, Target, HelpCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const DEMO_CENTER = [19.076,72.8777];
const SAFE_POINTS = [
  {id:'p1', name:'Verified public point', coords:[19.094,72.906]},
  {id:'p2', name:'Transit/public facility', coords:[19.107,72.926]},
  {id:'p3', name:'Verified public point', coords:[19.118,72.936]}
];

const SEGMENTS = [
  {id:'s1', at:19.083, lng:72.889, base:20, visibility:88, activity:74, reports:1, confidence:89, freshness:'2h', reason:'Good lighting + active frontage', source:'Open infrastructure + community', safePointDistance:420, unknown:false},
  {id:'s2', at:19.087, lng:72.899, base:43, visibility:61, activity:49, reports:3, confidence:77, freshness:'47m', reason:'Lower activity after 10 PM', source:'Community + historical context', safePointDistance:780, unknown:false},
  {id:'s3', at:19.095, lng:72.908, base:68, visibility:42, activity:31, reports:5, confidence:84, freshness:'18m', reason:'Recent reports + weak lighting', source:'Community + lighting', safePointDistance:1180, unknown:false},
  {id:'s4', at:19.103, lng:72.918, base:31, visibility:76, activity:63, reports:1, confidence:82, freshness:'3h', reason:'Near active public frontage', source:'Infrastructure + community', safePointDistance:540, unknown:false},
  {id:'s5', at:19.112, lng:72.927, base:55, visibility:53, activity:40, reports:2, confidence:74, freshness:'1h', reason:'Sparse activity late night', source:'Community', safePointDistance:920, unknown:false},
  {id:'s6', at:19.119, lng:72.937, base:18, visibility:91, activity:82, reports:0, confidence:93, freshness:'6h', reason:'Strong lighting + safe points nearby', source:'Infrastructure', safePointDistance:260, unknown:false},
  {id:'s7', at:19.071, lng:72.889, base:null, visibility:null, activity:null, reports:0, confidence:0, freshness:'—', reason:'Insufficient evidence', source:'No reliable source', safePointDistance:1500, unknown:true}
];

const ROUTES = [
 {id:'balanced', name:'Balanced', eta:34, distance:11.8, color:'#7c5cff', note:'Adds 3 min to avoid the strongest late-night weak point.', segmentIds:['s1','s2','s4','s5','s6']},
 {id:'fastest', name:'Fastest', eta:31, distance:10.9, color:'#f6b73c', note:'Fastest, but crosses S3 when late-night risk is elevated.', segmentIds:['s1','s2','s3','s4','s6']},
 {id:'lowrisk', name:'Lowest Risk', eta:39, distance:12.7, color:'#35d07f', note:'More travel time, but fewer high-risk observations and better escapeability.', segmentIds:['s1','s4','s6','s2']}
];

const ROUTE_COORDS = {
 balanced:[[19.076,72.8777],[19.082,72.889],[19.087,72.899],[19.095,72.908],[19.103,72.918],[19.112,72.927],[19.119,72.937]],
 fastest:[[19.076,72.8777],[19.082,72.886],[19.088,72.894],[19.098,72.901],[19.106,72.910],[19.115,72.922],[19.119,72.937]],
 lowrisk:[[19.076,72.8777],[19.068,72.888],[19.072,72.901],[19.083,72.912],[19.096,72.922],[19.108,72.931],[19.119,72.937]]
};

function hourFactor(h){ return h<20?0.82:h<22?0.94:h<23?1.13:1.25; }
function segmentRisk(s,h,live){
 if(s.unknown) return {risk:null,label:'Unknown'};
 const late = hourFactor(h);
 const visibilityPenalty=(100-s.visibility)*0.25;
 const activityPenalty=(100-s.activity)*0.18;
 const reportSignal=Math.min(30,s.reports*5);
 const helpPenalty=Math.min(15,s.safePointDistance/1000*10);
 const freshnessBoost=s.freshness.endsWith('m')?1.08:1;
 const liveBoost=live&&s.id==='s3'?18:0;
 const risk=Math.min(95,Math.round((s.base*0.35+visibilityPenalty+activityPenalty+reportSignal+helpPenalty)*late*freshnessBoost+liveBoost));
 return {risk,label:risk>=60?'High':risk>=35?'Moderate':'Low'};
}
function riskClass(r){ if(r===null) return 'unknown'; return r>=60?'danger':r>=35?'warning':'safe'; }
function confidenceFor(s){ return s.unknown?0:Math.max(0,Math.min(100,Math.round(s.confidence-(s.freshness.endsWith('h')?4:0)))); }

function FitBounds({routes}){ const map=useMap(); React.useEffect(()=>{const all=routes.flatMap(r=>r.coords); if(all.length) map.fitBounds(all,{padding:[30,30]});},[routes,map]); return null; }

function App(){
 const [hour,setHour]=useState(22), [selectedRoute,setSelectedRoute]=useState('balanced'), [selectedSegment,setSelectedSegment]=useState(null);
 const [liveAlert,setLiveAlert]=useState(false), [reportOpen,setReportOpen]=useState(false), [reportText,setReportText]=useState('');
 const [reportType,setReportType]=useState('streetlight'), [reports,setReports]=useState(7), [lastRecalc,setLastRecalc]=useState('just now');
 const [showWhy,setShowWhy]=useState(false);
 const [safeHavenOpen,setSafeHavenOpen]=useState(false);
 const [selectedSafePoint,setSelectedSafePoint]=useState(SAFE_POINTS[0]);

 const routeScores=useMemo(()=>ROUTES.map(r=>{
   const routeSegments=r.segmentIds.map((id,i)=>{
     const raw=SEGMENTS.find(s=>s.id===id);
     if(!raw) return null;
     const arrivalMinutes=hour*60 + ((i+1)/r.segmentIds.length)*r.eta;
     const arrivalHour=Math.min(23,Math.floor(arrivalMinutes/60));
     const scored=segmentRisk(raw,arrivalHour,liveAlert);
     return {...raw,...scored,arrivalHour,confidenceNow:confidenceFor(raw)};
   }).filter(Boolean);
   const known=routeSegments.filter(s=>s.risk!==null);
   const weighted=known.length?known.reduce((a,s)=>a+s.risk,0)/known.length:null;
   const worst=known.length?Math.max(...known.map(s=>s.risk)):null;
   const unknowns=routeSegments.filter(s=>s.risk===null).length;
   const dynamicRisk=weighted===null?null:Math.round(weighted*0.7+(worst??0)*0.3);
   const confidence=known.length?Math.round(known.reduce((a,s)=>a+s.confidenceNow,0)/known.length):0;
   return {...r,risk:dynamicRisk,confidence,unknowns,segments:routeSegments};
 }),[hour,liveAlert]);
 const activeRoute=routeScores.find(r=>r.id===selectedRoute) || routeScores[0];
 const segments=activeRoute.segments;
 const weakest=[...segments].filter(s=>s.risk!==null).sort((a,b)=>b.risk-a.risk)[0];
 const routeIsRecommended=routeScores.slice().sort((a,b)=>(a.risk??99)-(b.risk??99))[0]?.id===activeRoute.id;
 const liveAlternative=routeScores.find(r=>r.id!=='fastest' && r.risk!==null && r.risk <= (routeScores.find(x=>x.id==='fastest')?.risk??999)-10 && r.eta<=41);

 const submitReport=()=>{if(!reportText.trim())return; setReports(v=>v+1); setReportText(''); setReportOpen(false); setLiveAlert(true); setLastRecalc('after new report');};
 const recalc=()=>setLastRecalc('just now');

 return <div className="app-shell">
  <header className="topbar"><div className="brand"><div className="brand-mark"><Shield size={22}/></div><div><div className="brand-name">SafeRoute</div><div className="brand-sub">Team Trishul · CX1002</div></div></div><div className="top-actions"><div className="live-pill"><span className="live-dot"/> LIVE SAFETY LAYER</div><div className="data-status"><Database size={14}/> DEMO LIVE FEED · UPDATED NOW</div><button className="icon-btn" title="Privacy"><Lock size={17}/></button></div></header>

  <main className="workspace">
   <aside className="sidebar">
    <section className="trip-card glass"><div className="eyebrow">JOURNEY PLANNER</div><div className="field"><MapPin size={16}/><div><span>From</span><strong>Current location</strong></div></div><div className="connector"/><div className="field"><Navigation size={16}/><div><span>To</span><strong>Home / Destination</strong></div></div><div className="time-row"><div className="field compact"><Clock3 size={16}/><div><span>Depart</span><strong>{String(hour).padStart(2,'0')}:00</strong></div></div><button className="change-time" onClick={()=>setHour(h=>h>=23?18:h+1)}>Change</button></div><button className="primary-btn" onClick={recalc}><Route size={17}/> Analyze safer routes</button></section>
    <section className="mode-card glass"><div className="section-title">Route preference</div><div className="mode-grid">{routeScores.map(r=><button key={r.id} className={`mode ${selectedRoute===r.id?'active':''}`} onClick={()=>setSelectedRoute(r.id)}><b>{r.name}</b><span>{r.eta} min</span></button>)}</div></section>
    <section className="insight-card glass"><div className="section-title"><Activity size={15}/> Time-aware insight</div><div className="big-insight">{hour>=22?'Risk rises after 10 PM':'Conditions are relatively stable'}</div><p>Every known segment is evaluated at its expected arrival time. Unknown evidence stays unknown.</p><div className="mini-stat"><span>Weakest observed segment</span><b>{weakest?.id.toUpperCase()} · {weakest?.risk}/100</b></div></section>
    <section className="report-card glass"><div className="section-title"><Radio size={15}/> Community layer</div><div className="report-stats"><div><b>{reports}</b><span>active reports</span></div><div><b>{activeRoute.confidence}%</b><span>route confidence</span></div></div><button className="secondary-btn" onClick={()=>setReportOpen(true)}><AlertTriangle size={16}/> Report a condition</button><button className="safe-haven-btn" onClick={()=>setSafeHavenOpen(true)}><Shield size={16}/> I Feel Unsafe · Safe Haven</button></section>
    <div className="guardrail"><CheckCircle2 size={15}/><span>No route is labelled 100% safe. Evidence is weighted, dated and source-labelled.</span></div>
   </aside>

   <section className="map-area"><MapContainer center={DEMO_CENTER} zoom={13} className="map" zoomControl={false}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><FitBounds routes={ROUTES.map(r=>({coords:ROUTE_COORDS[r.id]}))}/>{routeScores.map(r=><Polyline key={r.id} positions={ROUTE_COORDS[r.id]} pathOptions={{color:r.color,weight:r.id===selectedRoute?8:4,opacity:r.id===selectedRoute?0.95:0.42,dashArray:r.id===selectedRoute?undefined:'8 10'}} eventHandlers={{click:()=>setSelectedRoute(r.id)}}/>)}<Marker position={DEMO_CENTER}><Popup><b>Trip start</b><br/>Time-aware analysis begins here.</Popup></Marker>{SAFE_POINTS.map(p=><CircleMarker key={p.id} center={p.coords} radius={5} pathOptions={{color:'#35d07f',fillColor:'#35d07f',fillOpacity:.75,weight:2}}><Popup><b>{p.name}</b><br/>Public intervention point.</Popup></CircleMarker>)}{segments.filter(s=>s.risk!==null).map(s=><CircleMarker key={s.id} center={[s.at,s.lng]} radius={s.id===selectedSegment?10:7} pathOptions={{color:s.risk>=60?'#ff4d67':s.risk>=35?'#f6b73c':'#35d07f',fillColor:s.risk>=60?'#ff4d67':s.risk>=35?'#f6b73c':'#35d07f',fillOpacity:.82,weight:3}} eventHandlers={{click:()=>setSelectedSegment(s.id)}}><Popup><div className="popup"><b>{s.id.toUpperCase()} · {s.label} risk</b><span>{s.risk}/100 at {String(s.arrivalHour).padStart(2,'0')}:00</span><span>Lighting {s.visibility}% · Activity {s.activity}%</span><span>{s.reports} reports · {s.confidenceNow}% confidence · {s.freshness} old</span><small>{s.reason}</small></div></Popup></CircleMarker>)}</MapContainer>
    <div className="map-top-controls"><div className="search-chip"><MapPin size={16}/> Pilot journey · Mumbai demo area</div><button className="map-control" onClick={recalc}><RefreshCw size={16}/> Recalculate</button></div>
    <div className="risk-legend glass"><span><i className="dot safe"/>Low</span><span><i className="dot warning"/>Moderate</span><span><i className="dot danger"/>High</span><span><i className="dot unknown"/>Unknown</span></div>
    <div className="route-panel glass"><div className="route-header"><div><div className="eyebrow">ROUTES · {String(hour).padStart(2,'0')}:00 · UPDATED {lastRecalc}</div><h2>Choose with context, not a blind score.</h2></div><button className="info-button" onClick={()=>setShowWhy(v=>!v)}><Info size={17}/></button></div><div className="route-list">{routeScores.map(r=><button key={r.id} className={`route-item ${selectedRoute===r.id?'selected':''}`} onClick={()=>setSelectedRoute(r.id)}><div className="route-color" style={{background:r.color}}/><div className="route-main"><div className="route-name"><b>{r.name}</b>{routeIsRecommended&&r.id===selectedRoute&&<span className="recommended">CURRENT CHOICE</span>}</div><div className="route-note">{r.note}</div></div><div className="route-metrics"><b>{r.eta} min</b><span className={riskClass(r.risk)}>{r.risk===null?'Unknown':`${r.label??(r.risk>=60?'High':r.risk>=35?'Moderate':'Low')} · ${r.risk}`}</span></div><ChevronRight size={18}/></button>)}</div>{showWhy&&<div className="route-explainer"><HelpCircle size={15}/><span>Route risk is an aggregate of the route's own segments. We show the evidence and confidence instead of claiming certainty.</span></div>}</div>
   </section>

   <aside className="evidence-panel">
    <section className="evidence-card glass"><div className="evidence-title"><div><div className="eyebrow">WHY THIS ROUTE?</div><h2>{activeRoute.name}</h2></div><span className={`confidence ${activeRoute.confidence>=85?'high':'medium'}`}>{activeRoute.confidence}% confidence</span></div><div className="evidence-summary">{activeRoute.note}</div><div className="reason-grid"><div><Lightbulb size={16}/><span><b>Lighting</b>Evidence shown per segment</span></div><div><Users size={16}/><span><b>Activity</b>Time-sensitive observation</span></div><div><AlertTriangle size={16}/><span><b>Reports</b>Freshness + corroboration</span></div><div><Navigation size={16}/><span><b>Escapeability</b>Nearest public points considered</span></div></div>{activeRoute.unknowns>0&&<div className="unknown-note"><Eye size={14}/> {activeRoute.unknowns} segment has insufficient evidence — not treated as safe.</div>}<div className="why-not"><b>Why not the other route?</b><span>{routeScores.filter(r=>r.id!==activeRoute.id).sort((a,b)=>(b.risk??0)-(a.risk??0))[0]?.name} has a higher observed contextual score or a stronger weak-point penalty at this departure time.</span></div></section>
    <section className="segment-card glass"><div className="section-title"><Target size={15}/> Weak points</div>{[...segments].filter(s=>s.risk!==null).sort((a,b)=>b.risk-a.risk).slice(0,3).map(s=><button key={s.id} className={`segment-row ${selectedSegment===s.id?'active':''}`} onClick={()=>setSelectedSegment(s.id)}><div className={`risk-bar ${riskClass(s.risk)}`}><span style={{width:`${s.risk}%`}}/></div><div><b>{s.id.toUpperCase()} · {s.label}</b><span>{s.reason}</span></div><strong>{s.risk}</strong></button>)}</section>
    <section className="whatif-card glass"><div className="section-title"><Clock3 size={15}/> What-if: departure time</div><input type="range" min="18" max="23" value={hour} onChange={e=>setHour(Number(e.target.value))}/><div className="slider-labels"><span>6 PM</span><b>{String(hour).padStart(2,'0')}:00</b><span>11 PM</span></div><p>Changing departure time shifts every segment's expected arrival clock time, so the same road can receive a different risk assessment.</p><div className="forecast"><Cloud size={14}/><div><b>Risk forecast</b><div className="forecast-timeline"><span><i className="dot safe"/>Now</span><span><i className={hour>=22?'dot warning':'dot safe'}/>+20m</span><span><i className={hour>=23?'dot danger':'dot warning'}/>+40m</span></div></div></div></section>
    <section className="live-card glass"><div className="live-head"><div><div className="eyebrow">LIVE SAFETY LAYER</div><h3>{liveAlert?'Condition changed':'Monitoring journey context'}</h3></div><span className="pulse"><span/></span></div><div className="live-feed-grid"><span>Traffic <b>Live demo</b></span><span>Weather <b>Live demo</b></span><span>Reports <b>Realtime</b></span><span>Location <b>Current</b></span></div>{!liveAlert?<><p>No meaningful new condition detected.</p><button className="secondary-btn" onClick={()=>{setLiveAlert(true);setLastRecalc('after live evidence')}}><Radio size={16}/> Simulate high-confidence report</button></>:<div className="alert-box"><b>⚠ New report changed S3</b><span>Confidence 91% · Freshness 4 min</span><span>Re-evaluation completed. Rerouting requires a meaningful improvement.</span>{liveAlternative&&<button className="reroute-btn" onClick={()=>setSelectedRoute(liveAlternative.id)}>Show alternative (+{liveAlternative.eta-(ROUTES.find(r=>r.id==='fastest')?.eta??0)} min) <ChevronRight size={16}/></button>}</div>}</section>
   </aside>
  </main>

  {selectedSegment&&<div className="segment-detail glass"><div className="eyebrow">SELECTED SEGMENT</div><h3>{selectedSegment.toUpperCase()}</h3>{(()=>{const ss=segments.find(x=>x.id===selectedSegment); if(!ss) return <p>Segment not found.</p>; return <><div className="detail-grid"><div><span>ETA</span><b>{String(ss.arrivalHour).padStart(2,'0')}:00</b></div><div><span>Risk</span><b>{ss.risk}/100</b></div><div><span>Lighting</span><b>{ss.visibility}%</b></div><div><span>Activity</span><b>{ss.activity}%</b></div><div><span>Reports</span><b>{ss.reports}</b></div><div><span>Freshness</span><b>{ss.freshness}</b></div></div><p>{ss.reason}</p><button className="secondary-btn" onClick={()=>setSelectedSegment(null)}>Close details</button></>})()}</div>}

  {safeHavenOpen&&<div className="modal-backdrop" onClick={()=>setSafeHavenOpen(false)}><div className="modal glass" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">SAFE HAVEN</div><h2>Nearby support</h2></div><button className="icon-btn" onClick={()=>setSafeHavenOpen(false)}>×</button></div><p>Choose a verified public support point and route there from the current journey context.</p><div className="safe-haven-list">{SAFE_POINTS.map(point=><button key={point.id} className={`safe-haven-item ${selectedSafePoint.id===point.id?'selected':''}`} onClick={()=>setSelectedSafePoint(point)}><div><b>{point.name}</b><span>Verified public support point</span></div><Navigation size={17}/></button>)}</div><button className="primary-btn" onClick={()=>{setSafeHavenOpen(false);setSelectedRoute('lowrisk')}}><Navigation size={16}/> Navigate to {selectedSafePoint.name}</button></div></div>}

  {reportOpen&&<div className="modal-backdrop" onClick={()=>setReportOpen(false)}><div className="modal glass" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">COMMUNITY REPORT</div><h2>Help update the safety layer</h2></div><button className="icon-btn" onClick={()=>setReportOpen(false)}>×</button></div><label>Condition type<select value={reportType} onChange={e=>setReportType(e.target.value)}><option value="streetlight">Streetlight outage</option><option value="harassment">Harassment concern</option><option value="obstruction">Road obstruction</option><option value="crowding">Unusual crowding</option><option value="unsafe_activity">Unsafe activity</option></select></label><label>What did you observe?<textarea value={reportText} onChange={e=>setReportText(e.target.value)} placeholder="Keep the report factual. Do not include personal information."/></label><div className="privacy-note"><Lock size={15}/> Anonymous demo report · confidence starts low and increases only with evidence.</div><button className="primary-btn" onClick={submitReport}><Send size={16}/> Submit report</button></div></div>}
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
