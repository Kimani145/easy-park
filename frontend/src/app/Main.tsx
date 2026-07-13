import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate, Link } from "react-router";
import { Drawer } from "vaul";
import { Root as VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  MapPin, Navigation, Clock, Car, Search, Star, Zap, X, ArrowLeft,
  CircleParking, LocateFixed, CalendarClock, CheckCircle2, ChevronDown,
  Ticket, Copy, Check, LogOut, User, ChevronUp, Filter,
} from "lucide-react";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { ArrivalConfirmation } from "./components/ArrivalConfirmation";
import { apiFetch } from "./services/api";

/* ── Types ── */
type Parking = {
  id: string; name: string; address: string;
  distance: string; distanceNum: number;
  walkTime: string; driveTime: string;
  price: string; priceNum: number;
  available: number; total: number;
  status: string;
  rating: number; features: string[];
  lat: number; lng: number; open24h: boolean;
};

type Reservation = {
  id: string; parkingId: string; parkingName: string; address: string;
  date: string; startTime: string; duration: number;
  totalCost: number; spotNumber: string; createdAt: string;
};

type SortKey = "distance" | "price" | "available";
type BottomTab = "explore" | "directions" | "reservations" | "account";

/* ── Data ── */
const PARKINGS_INITIAL: Parking[] = [];

const DURATIONS = [1, 2, 3, 4, 6, 8, 12, 24];
const TODAY = new Date();
const fmtDate = (d: Date) => d.toISOString().split("T")[0];
const todayStr = fmtDate(TODAY);
const tomorrowStr = fmtDate(new Date(TODAY.getTime() + 86400000));
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return [`${h}:00`, `${h}:30`];
}).flat();

function genId() { return "EP" + Math.random().toString(36).substring(2, 8).toUpperCase(); }
function genSpot() { return `${Math.floor(Math.random()*5)+1}-${String(Math.floor(Math.random()*40)+1).padStart(2,"0")}`; }

/* ── Helpers ── */
const availColor = (a: number, t: number) => { const r=a/t; return r>0.4?"text-[#39e079]":r>0.15?"text-[#e0a839]":"text-[#e05555]"; };
const availBg    = (a: number, t: number) => { const r=a/t; return r>0.4?"bg-[#39e079]/15 border-[#39e079]/30":r>0.15?"bg-[#e0a839]/15 border-[#e0a839]/30":"bg-[#e05555]/15 border-[#e05555]/30"; };
const pinColor   = (a: number, t: number) => { const r=a/t; return r>0.4?"#39e079":r>0.15?"#e0a839":"#e05555"; };
const barColor   = (a: number, t: number) => { const r=a/t; return r>0.4?"bg-[#39e079]":r>0.15?"bg-[#e0a839]":"bg-[#e05555]"; };

const createPinIcon = (a: number, t: number, isSel: boolean) => {
  const pc = pinColor(a, t);
  const size = isSel ? 26 : 20;
  const bg = isSel ? pc : "#1e2520";
  const border = isSel ? "none" : `1.5px solid ${pc}`;
  const color = isSel ? "#0a0f0c" : pc;
  return L.divIcon({
    className: "custom-pin",
    html: `<div style="width:${size}px; height:${size}px; background:${bg}; border:${border}; border-radius:50%; display:flex; align-items:center; justify-content:center; color:${color}; font-weight:bold; font-size:${isSel?12:10}px; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">P</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
};

const userIcon = L.divIcon({
  className: "user-pin",
  html: `<div style="width:16px; height:16px; background:#39e079; border:2px solid #fff; border-radius:50%; box-shadow: 0 0 10px #39e079;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
}

function MapView({ parkings, selected, userLoc, onSelect, onMapClick, userRealLocation }: { parkings: Parking[]; selected: Parking|null; userLoc: [number, number] | null; onSelect:(p:Parking)=>void; onMapClick: (lat: number, lng: number) => void; userRealLocation: [number, number] | null; }) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [routeError, setRouteError] = useState(false);

  useEffect(() => {
    if (userLoc && selected) {
      const fetchRoute = async () => {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${userLoc[1]},${userLoc[0]};${selected.lng},${selected.lat}?geometries=geojson`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
            setRoute(coords);
            setRouteError(false);
          } else {
            setRoute(null);
            setRouteError(true);
          }
        } catch (err) {
          setRoute(null);
          setRouteError(true);
        }
      };
      fetchRoute();
    } else {
      setRoute(null);
      setRouteError(false);
    }
  }, [userLoc, selected]);

  const center: [number, number] = userLoc || [-1.2676, 36.8108];

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#111614] rounded-xl">
      <MapContainer center={center} zoom={14} style={{ width: "100%", height: "100%", background: "#111614" }} zoomControl={false} ref={setMapInstance}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapClickHandler onLocationSelect={(lat, lng) => onMapClick(lat, lng)} />
        {userLoc && <Marker position={userLoc} icon={userIcon} />}
        {parkings.map(p => (
          <Marker 
            key={p.id} 
            position={[p.lat, p.lng]} 
            icon={createPinIcon(p.available, p.total, selected?.id === p.id)}
            eventHandlers={{ click: () => onSelect(p) }}
          />
        ))}
        {route && !routeError && <Polyline positions={route} color="#39e079" weight={4} opacity={0.8} />}
        {userLoc && selected && (!route || routeError) && (
          <Polyline positions={[userLoc, [selected.lat, selected.lng]]} color="#39e079" weight={3} dashArray="5, 10" opacity={0.6} />
        )}
      </MapContainer>
      <button 
        className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 z-[1000] cursor-pointer hover:bg-black/90 transition-colors"
        onClick={() => {
          if (mapInstance && userRealLocation) {
            mapInstance.flyTo(userRealLocation, 15);
            onMapClick(userRealLocation[0], userRealLocation[1]);
          }
        }}
      >
        <LocateFixed size={12} className="text-[#39e079]"/>
        <span className="text-[11px] font-mono text-white/70 tracking-wide">YOUR LOCATION</span>
      </button>
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-[1000]">
        {[{color:"bg-[#39e079]",label:"Available"},{color:"bg-[#e0a839]",label:"Limited"},{color:"bg-[#e05555]",label:"Almost full"}].map(({color,label})=>(
          <div key={label} className="flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-white/10 rounded-md px-2.5 py-1">
            <div className={`w-2 h-2 rounded-full ${color}`}/>
            <span className="text-[10px] font-mono text-white/60">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Reserve Modal ── */
function ReserveModal({ parking, onClose, onConfirm }: { parking:Parking; onClose:()=>void; onConfirm:(r:Reservation)=>void }) {
  const [date,setDate]=useState(todayStr);
  const [startTime,setStartTime]=useState("09:00");
  const [duration,setDuration]=useState(2);
  const [step,setStep]=useState<"form"|"confirm">("form");
  const [reservation,setReservation]=useState<Reservation|null>(null);
  const [copied,setCopied]=useState(false);
  const total=parking.priceNum*duration;
  const endTime=(()=>{ const [h,m]=startTime.split(":").map(Number); const e=new Date(0,0,0,h+duration,m); return `${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`; })();

  const handleReserve=()=>{
    const r:Reservation={ id:genId(), parkingId:parking.id, parkingName:parking.name, address:parking.address, date, startTime, duration, totalCost:total, spotNumber:genSpot(), createdAt:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) };
    setReservation(r); setStep("confirm"); onConfirm(r);
  };
  const copyId=()=>{ if(reservation){ navigator.clipboard.writeText(reservation.id).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); } };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden max-h-[90vh] overflow-y-auto" style={{scrollbarWidth:"none"}}>
        {step==="form" ? (
          <>
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <CalendarClock size={16} className="text-primary"/>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Reserve a Spot</p>
                  <h2 className="text-sm font-semibold text-foreground leading-tight">{parking.name}</h2>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                <X size={13} className="text-muted-foreground"/>
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${availBg(parking.available,parking.total)}`}>
                <CircleParking size={16} className={availColor(parking.available,parking.total)}/>
                <div>
                  <p className={`text-sm font-semibold ${availColor(parking.available,parking.total)}`}>{parking.available} spots available</p>
                  <p className="text-[11px] font-mono text-muted-foreground">{parking.address}</p>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-2">Date</label>
                <div className="flex gap-2">
                  {[{label:"Today",val:todayStr},{label:"Tomorrow",val:tomorrowStr}].map(({label,val})=>(
                    <button key={val} onClick={()=>setDate(val)} className={`flex-1 h-10 rounded-lg border text-xs font-mono font-medium transition-colors ${date===val?"bg-primary/15 border-primary/40 text-primary":"border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"}`}>{label}</button>
                  ))}
                  <input type="date" value={date} min={todayStr} onChange={e=>setDate(e.target.value)} className="flex-1 h-10 rounded-lg border border-border bg-secondary/40 text-xs font-mono text-muted-foreground px-3 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all" style={{colorScheme:"dark"}}/>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-2">Start Time</label>
                <div className="relative">
                  <select value={startTime} onChange={e=>setStartTime(e.target.value)} className="w-full h-11 rounded-lg border border-border bg-secondary/40 text-sm text-foreground px-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono" style={{colorScheme:"dark"}}>
                    {TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-2">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map(d=>(
                    <button key={d} onClick={()=>setDuration(d)} className={`h-10 rounded-lg border text-xs font-mono font-medium transition-colors ${duration===d?"bg-primary/15 border-primary/40 text-primary":"border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"}`}>{d}h</button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-secondary/40 border border-border p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-wide uppercase">Summary</p>
                  <p className="text-xs font-mono text-foreground">{startTime} → {endTime} · {duration}h</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{parking.price} × {duration}h</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-wide uppercase">Total</p>
                  <p className="text-2xl font-bold text-foreground font-mono">${total.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="px-5 pb-6">
              <button onClick={handleReserve} disabled={parking.available===0} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                <Ticket size={15}/> Reserve for ${total.toFixed(2)}
              </button>
            </div>
          </>
        ) : reservation ? (
          <>
            <div className="p-6 flex flex-col items-center text-center border-b border-border">
              <div className="w-14 h-14 rounded-2xl bg-[#39e079]/15 border border-[#39e079]/30 flex items-center justify-center mb-4">
                <CheckCircle2 size={28} className="text-[#39e079]"/>
              </div>
              <p className="text-[10px] font-mono text-[#39e079] tracking-widest uppercase mb-1">Reservation Confirmed</p>
              <h2 className="text-lg font-bold text-foreground">{reservation.parkingName}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{reservation.address}</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-xl bg-secondary/40 border border-border p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-1">Booking ID</p>
                  <p className="text-xl font-bold font-mono text-foreground tracking-wider">{reservation.id}</p>
                </div>
                <button onClick={copyId} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                  {copied?<Check size={13} className="text-[#39e079]"/>:<Copy size={13} className="text-muted-foreground"/>}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[{label:"Spot",value:reservation.spotNumber},{label:"Date",value:reservation.date===todayStr?"Today":reservation.date===tomorrowStr?"Tomorrow":reservation.date},{label:"From",value:reservation.startTime},{label:"Duration",value:`${reservation.duration}h`},{label:"Total Paid",value:`$${reservation.totalCost.toFixed(2)}`},{label:"Reserved at",value:reservation.createdAt}].map(({label,value})=>(
                  <div key={label} className="rounded-lg bg-secondary/30 border border-border px-3 py-2.5">
                    <p className="text-[10px] font-mono text-muted-foreground tracking-wide uppercase mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-foreground font-mono">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-mono text-muted-foreground text-center leading-relaxed px-2">Show your Booking ID at the entrance. Your spot is held for 15 minutes after your start time.</p>
            </div>
            <div className="px-5 pb-6">
              <button onClick={onClose} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">Done</button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ── Parking Card ── */
function ParkingCard({ parking, selected, reserved, onClick, onDirections, onReserve }: {
  parking:Parking; selected:boolean; reserved:boolean;
  onClick:()=>void; onDirections:()=>void; onReserve:()=>void;
}) {
  const ratio=parking.available/parking.total;
  return (
    <div onClick={onClick} className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 ${selected?"border-primary/50 bg-primary/5":"border-border bg-card hover:border-foreground/15 hover:bg-secondary/40"}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {parking.open24h&&<span className="text-[9px] font-mono font-medium tracking-widest text-[#39e079] bg-[#39e079]/10 border border-[#39e079]/20 px-1.5 py-0.5 rounded">24H</span>}
            {reserved&&<span className="text-[9px] font-mono font-medium tracking-widest text-[#e0a839] bg-[#e0a839]/10 border border-[#e0a839]/20 px-1.5 py-0.5 rounded flex items-center gap-1"><Ticket size={8}/>RESERVED</span>}
            <div className="flex items-center gap-1"><Star size={9} className="text-[#e0a839] fill-[#e0a839]"/><span className="text-[10px] font-mono text-muted-foreground">{parking.rating}</span></div>
          </div>
          <h3 className="font-semibold text-sm text-foreground truncate">{parking.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{parking.address}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5"><Clock size={11} className="text-muted-foreground"/><span className="text-xs font-mono text-muted-foreground">{parking.driveTime} drive</span></div>
        <div className="flex items-center gap-1.5"><MapPin size={11} className="text-muted-foreground"/><span className="text-xs font-mono text-muted-foreground">{parking.distance}</span></div>
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-muted-foreground tracking-wide uppercase">Availability</span>
          <span className={`text-[11px] font-mono font-medium ${parking.status === 'FREE' ? 'text-[#39e079]' : 'text-[#e05555]'}`}>{parking.status}</span>
        </div>
        <div className="h-1 rounded-full bg-foreground/8 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor(parking.available,parking.total)}`} style={{width:`${ratio*100}%`}}/>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 flex-wrap">
          {parking.features.slice(0,2).map(f=><span key={f} className="text-[9px] font-mono text-muted-foreground bg-foreground/5 border border-foreground/8 px-1.5 py-0.5 rounded">{f}</span>)}
          {parking.features.length>2&&<span className="text-[9px] font-mono text-muted-foreground bg-foreground/5 border border-foreground/8 px-1.5 py-0.5 rounded">+{parking.features.length-2}</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={e=>{e.stopPropagation();onDirections();}} className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground font-mono transition-colors"><Navigation size={10}/>Go</button>
          <button onClick={e=>{e.stopPropagation();onReserve();}} className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold font-mono transition-colors ${reserved?"bg-[#e0a839]/15 border border-[#e0a839]/30 text-[#e0a839] hover:bg-[#e0a839]/20":"bg-primary/15 border border-primary/25 text-primary hover:bg-primary/25"}`}><Ticket size={10}/>{reserved?"View":"Reserve"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Directions Panel ── */
function DirectionsPanel({ parking, reservation, onClose, onConfirmArrival }: {
  parking:Parking; reservation:Reservation|null; onClose:()=>void; onConfirmArrival:()=>void;
}) {
  const steps=[
    {icon:"→",text:"Head north on Main St toward 5th Ave",dist:"0.1 mi"},
    {icon:"↑",text:"Continue straight on 5th Ave",dist:"0.2 mi"},
    {icon:"↗",text:`Turn right toward ${parking.address.split(",")[0]}`,dist:"0.05 mi"},
    {icon:"↑",text:`Arrive at ${parking.name}`,dist:""},
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={onClose} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
          <ArrowLeft size={14} className="text-muted-foreground"/>
        </button>
        <div>
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Directions</p>
          <h3 className="text-sm font-semibold text-foreground leading-tight">{parking.name}</h3>
        </div>
      </div>
      <div className="p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-4">
          {[
            {icon:<Car size={14} className="text-[#39e079]"/>,bg:"bg-[#39e079]/15",label:"Drive",val:parking.driveTime},
            {icon:<Navigation size={14} className="text-muted-foreground"/>,bg:"bg-foreground/5",label:"Walk",val:parking.walkTime},
            {icon:<MapPin size={14} className="text-muted-foreground"/>,bg:"bg-foreground/5",label:"Distance",val:parking.distance},
          ].map(({icon,bg,label,val},i)=>(
            <div key={i} className="flex items-center gap-2">
              {i>0&&<div className="w-px h-8 bg-border"/>}
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
              <div><p className="text-xs text-muted-foreground font-mono">{label}</p><p className="text-sm font-semibold text-foreground">{val}</p></div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{scrollbarWidth:"none"}}>
        <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-4">Turn-by-turn</p>
        {steps.map((step,i)=>(
          <div key={i} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center flex-shrink-0 mt-0.5 text-sm text-primary font-mono">{step.icon}</div>
            <div className="flex-1 pt-0.5">
              <p className="text-sm text-foreground leading-snug">{step.text}</p>
              {step.dist&&<p className="text-xs font-mono text-muted-foreground mt-0.5">{step.dist}</p>}
            </div>
          </div>
        ))}
      </div>
      {reservation && (
        <div className="px-4 py-3 border-t border-border bg-[#e0a839]/8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">Have you arrived?</p>
              <p className="text-[10px] font-mono text-muted-foreground">Spot {reservation.spotNumber}</p>
            </div>
            <button onClick={onConfirmArrival} className="h-8 px-3 rounded-lg bg-[#39e079] text-[#0a0f0c] text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5">
              <CheckCircle2 size={12}/> Confirm Arrival
            </button>
          </div>
        </div>
      )}
      <div className="p-4 border-t border-border">
        <button className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          <Navigation size={15}/> Start Navigation
        </button>
      </div>
    </div>
  );
}

/* ── Reservations Panel ── */
function ReservationsPanel({ reservations, onClose, onCancel }: { reservations:Reservation[]; onClose:()=>void; onCancel:(id:string)=>void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">My Reservations</p>
          <p className="text-sm font-semibold text-foreground">{reservations.length} active</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"><X size={13} className="text-muted-foreground"/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{scrollbarWidth:"none"}}>
        {reservations.length===0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Ticket size={24} className="text-muted-foreground mb-2"/>
            <p className="text-sm text-muted-foreground">No reservations yet</p>
          </div>
        ) : reservations.map(r=>(
          <div key={r.id} className="rounded-xl border border-[#e0a839]/25 bg-[#e0a839]/5 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{r.parkingName}</p>
                <p className="text-[11px] font-mono text-muted-foreground">{r.address}</p>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#e0a839] bg-[#e0a839]/10 border border-[#e0a839]/20 px-2 py-1 rounded">{r.id}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[{label:"Spot",val:r.spotNumber},{label:"Date",val:r.date===todayStr?"Today":"Tomorrow"},{label:"Time",val:r.startTime},{label:"Duration",val:`${r.duration}h`},{label:"Total",val:`$${r.totalCost.toFixed(2)}`},{label:"Booked",val:r.createdAt}].map(({label,val})=>(
                <div key={label} className="bg-foreground/5 rounded-lg px-2.5 py-2">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-xs font-semibold font-mono text-foreground">{val}</p>
                </div>
              ))}
            </div>
            <button onClick={()=>onCancel(r.id)} className="w-full h-8 rounded-lg border border-[#e05555]/30 text-[#e05555] text-xs font-mono font-medium hover:bg-[#e05555]/10 transition-colors">Cancel Reservation</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Parking List Panel ── */
function ParkingListPanel({ parkings, search, setSearch, sortBy, setSortBy, filterOpen24h, setFilterOpen24h, selected, reservedIds, onSelect, onDirections, onReserve }: {
  parkings:Parking[]; search:string; setSearch:(s:string)=>void;
  sortBy:SortKey; setSortBy:(s:SortKey)=>void;
  filterOpen24h:boolean; setFilterOpen24h:(v:boolean)=>void;
  selected:Parking|null; reservedIds:Set<string>;
  onSelect:(p:Parking)=>void; onDirections:(p:Parking)=>void; onReserve:(p:Parking)=>void;
}) {
  const filtered=parkings
    .filter(p=>{
      const q=search.toLowerCase();
      return (!q||p.name.toLowerCase().includes(q)||p.address.toLowerCase().includes(q))&&(!filterOpen24h||p.open24h);
    })
    .sort((a,b)=>sortBy==="distance"?a.distanceNum-b.distanceNum:sortBy==="price"?a.priceNum-b.priceNum:b.available-a.available);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-2 flex-shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
          <input type="text" placeholder="Search garages…" value={search} onChange={e=>setSearch(e.target.value)} className="w-full h-9 pl-8 pr-8 rounded-lg bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all"/>
          {search&&<button onClick={()=>setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X size={12} className="text-muted-foreground"/></button>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex rounded-lg overflow-hidden border border-border">
            {(["distance","price","available"] as SortKey[]).map(key=>(
              <button key={key} onClick={()=>setSortBy(key)} className={`flex-1 h-7 text-[10px] font-mono font-medium tracking-wide capitalize transition-colors ${sortBy===key?"bg-primary text-primary-foreground":"text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}>
                {key==="available"?"Avail":key.charAt(0).toUpperCase()+key.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={()=>setFilterOpen24h(!filterOpen24h)} className={`h-7 px-2.5 rounded-lg border text-[10px] font-mono font-medium transition-colors flex items-center gap-1.5 ${filterOpen24h?"bg-primary/15 border-primary/30 text-primary":"border-border text-muted-foreground hover:text-foreground"}`}>
            <Zap size={10}/>24H
          </button>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground pl-0.5">{filtered.length} parking{filtered.length!==1?"s":""} found nearby</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5" style={{scrollbarWidth:"none"}}>
        {filtered.length===0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed border-gray-700 rounded-lg p-6 bg-gray-900/50">
            <div className="bg-gray-800 p-3 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-gray-200 font-semibold text-lg mb-1">No Parking Nearby</h3>
            <p className="text-gray-400 text-sm">
              We couldn't find any registered EasyPark zones within a 5km radius of this pin.
            </p>
            <p className="text-green-500/80 text-xs mt-4 uppercase tracking-wider font-semibold">
              Try clicking a busier district
            </p>
          </div>
        ) : filtered.map(p=>(
          <ParkingCard key={p.id} parking={p} selected={selected?.id===p.id} reserved={reservedIds.has(p.id)}
            onClick={()=>onSelect(p)} onDirections={()=>onDirections(p)} onReserve={()=>onReserve(p)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Bottom Nav ── */
function BottomNav({ active, onTab, reservationCount }: { active:BottomTab; onTab:(t:BottomTab)=>void; reservationCount:number }) {
  const tabs: {id:BottomTab; label:string; icon:React.ReactNode}[]=[
    {id:"explore",label:"Explore",icon:<MapPin size={20}/>},
    {id:"directions",label:"Navigate",icon:<Navigation size={20}/>},
    {id:"reservations",label:"Bookings",icon:<Ticket size={20}/>},
    {id:"account",label:"Account",icon:<User size={20}/>},
  ];
  return (
    <nav className="flex-shrink-0 border-t border-border bg-card flex md:hidden safe-bottom">
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onTab(t.id)} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-colors ${active===t.id?"text-primary":"text-muted-foreground hover:text-foreground"}`}>
          {t.icon}
          <span className="text-[10px] font-medium">{t.label}</span>
          {t.id==="reservations"&&reservationCount>0&&(
            <span className="absolute top-2 right-[calc(50%-12px)] w-4 h-4 rounded-full bg-[#e0a839] text-[#0a0f0c] text-[9px] font-bold flex items-center justify-center">{reservationCount}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

/* ── Main App ── */
export default function Main() {
  const navigate=useNavigate();
  const [userRealLocation, setUserRealLocation] = useState<[number, number] | null>(null);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [parkings,setParkings]=useState<Parking[]>(PARKINGS_INITIAL);
  const [search,setSearch]=useState("");
  const [sortBy,setSortBy]=useState<SortKey>("distance");
  const [filterOpen24h,setFilterOpen24h]=useState(false);
  const [selected,setSelected]=useState<Parking|null>(parkings[0]);
  const [reservations,setReservations]=useState<Reservation[]>([]);
  const [reserveTarget,setReserveTarget]=useState<Parking|null>(null);
  const [activeTab,setActiveTab]=useState<BottomTab>("explore");
  const [mobileSheetOpen,setMobileSheetOpen]=useState(true);
  const [showArrival,setShowArrival]=useState(false);

  // Desktop sidebar panel
  const [desktopPanel,setDesktopPanel]=useState<"list"|"directions"|"reservations">("list");

  const reservedIds=new Set(reservations.map(r=>r.parkingId));

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserRealLocation([pos.coords.latitude, pos.coords.longitude]);
        setUserLoc([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        setUserRealLocation([-1.2676, 36.8108]);
        setUserLoc([-1.2676, 36.8108]); // default Nairobi
      }
    );
  }, []);

  useEffect(() => {
    async function loadSlots() {
      if (!userLoc) return;
      try {
        const slots = await apiFetch<any[]>(`/api/v1/slots/map-grid/?lat=${userLoc[0]}&lng=${userLoc[1]}`);
        const mapped: Parking[] = slots.map(s => ({
          id: s.id,
          name: s.slot_code,
          address: "Nairobi",
          distance: "0.1 mi",
          distanceNum: 0.1,
          walkTime: "2 min",
          driveTime: "1 min",
          price: "",
          priceNum: 0,
          available: s.current_status === "FREE" ? 1 : 0,
          total: 1,
          status: s.current_status,
          rating: 5.0,
          features: ["Open Air"],
          lat: s.latitude,
          lng: s.longitude,
          open24h: true
        }));
        setParkings(mapped);
        if (mapped.length > 0) setSelected(mapped[0]);
        else setSelected(null);
      } catch (e) {
        console.error("Failed to load map grid", e);
      }
    }
    loadSlots();
  }, [userLoc]);

  const activeReservation=selected ? reservations.find(r=>r.parkingId===selected.id)||null : null;

  const handleConfirmReservation=async (r:Reservation)=>{
    try {
      await apiFetch(`/api/v1/slots/${r.parkingId}/checkin/`, {
        method: "POST",
        body: JSON.stringify({ latitude: -1.2676, longitude: 36.8108 })
      });
      setReservations(prev=>[...prev,r]);
      setParkings(prev=>prev.map(p=>p.id===r.parkingId?{...p,available:0}:p));
    } catch (e: any) {
      alert("Failed to reserve: " + e.message);
    }
  };
  const handleCancelReservation=(id:string)=>{
    const r=reservations.find(res=>res.id===id);
    if(r){ setParkings(prev=>prev.map(p=>p.id===r.parkingId?{...p,available:Math.min(p.total,p.available+1)}:p)); setReservations(prev=>prev.filter(res=>res.id!==id)); }
  };
  const handleSelectParking=(p:Parking)=>{ setSelected(p); setMobileSheetOpen(false); };
  const handleDirections=(p:Parking)=>{ setSelected(p); setActiveTab("directions"); setDesktopPanel("directions"); setMobileSheetOpen(true); };
  const handleReserve=(p:Parking)=>{ setSelected(p); setReserveTarget(p); };

  // Mobile tab → sheet
  const handleTab=(t:BottomTab)=>{
    setActiveTab(t);
    if(t==="account"){ navigate("/app/profile"); return; }
    if(t==="explore"){ setMobileSheetOpen(true); return; }
    setMobileSheetOpen(true);
    if(t==="directions"&&selected) setDesktopPanel("directions");
    if(t==="reservations") setDesktopPanel("reservations");
  };

  const mobileSheetContent=()=>{
    if(activeTab==="directions"&&selected) return (
      <DirectionsPanel parking={selected} reservation={activeReservation} onClose={()=>{setActiveTab("explore");setMobileSheetOpen(false);}} onConfirmArrival={()=>setShowArrival(true)}/>
    );
    if(activeTab==="reservations") return (
      <ReservationsPanel reservations={reservations} onClose={()=>{setActiveTab("explore");setMobileSheetOpen(false);}} onCancel={handleCancelReservation}/>
    );
    return (
      <ParkingListPanel parkings={parkings} search={search} setSearch={setSearch} sortBy={sortBy} setSortBy={setSortBy} filterOpen24h={filterOpen24h} setFilterOpen24h={setFilterOpen24h} selected={selected} reservedIds={reservedIds} onSelect={handleSelectParking} onDirections={handleDirections} onReserve={handleReserve}/>
    );
  };

  const desktopSidebar=()=>{
    if(desktopPanel==="directions"&&selected) return (
      <DirectionsPanel parking={selected} reservation={activeReservation} onClose={()=>setDesktopPanel("list")} onConfirmArrival={()=>setShowArrival(true)}/>
    );
    if(desktopPanel==="reservations") return (
      <ReservationsPanel reservations={reservations} onClose={()=>setDesktopPanel("list")} onCancel={handleCancelReservation}/>
    );
    return (
      <ParkingListPanel parkings={parkings} search={search} setSearch={setSearch} sortBy={sortBy} setSortBy={setSortBy} filterOpen24h={filterOpen24h} setFilterOpen24h={setFilterOpen24h} selected={selected} reservedIds={reservedIds} onSelect={p=>{setSelected(p);}} onDirections={handleDirections} onReserve={handleReserve}/>
    );
  };

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden" style={{fontFamily:"'Inter', sans-serif"}}>
      {/* Header */}
      <header className="flex-shrink-0 h-14 border-b border-border flex items-center px-4 gap-3 bg-card/80 backdrop-blur-sm z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <CircleParking size={15} className="text-primary-foreground" strokeWidth={2.5}/>
          </div>
          <span className="text-base font-bold tracking-tight">easy<span className="text-primary">park</span></span>
        </div>

        {/* Desktop search */}
        <div className="hidden md:flex flex-1 max-w-sm relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
          <input type="text" placeholder="Search location or garage…" value={search} onChange={e=>setSearch(e.target.value)} className="w-full h-8 pl-8 pr-3 rounded-lg bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all"/>
          {search&&<button onClick={()=>setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X size={12} className="text-muted-foreground"/></button>}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Desktop: reservations button */}
          <button onClick={()=>setDesktopPanel(desktopPanel==="reservations"?"list":"reservations")} className={`hidden md:flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-mono font-medium transition-colors ${desktopPanel==="reservations"?"bg-[#e0a839]/15 border-[#e0a839]/30 text-[#e0a839]":"border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"}`}>
            <Ticket size={12}/>My Bookings
            {reservations.length>0&&<span className="w-4 h-4 rounded-full bg-[#e0a839]/80 text-[#0a0f0c] text-[9px] font-bold flex items-center justify-center">{reservations.length}</span>}
          </button>

          {/* Live indicator — desktop only */}
          <div className="hidden md:flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#39e079] animate-pulse"/>
            <span className="text-xs font-mono text-muted-foreground">Live Map</span>
          </div>

          <ThemeSwitcher/>

          {/* Desktop: profile + logout */}
          <Link to="/app/profile" className="hidden md:flex w-8 h-8 rounded-lg border border-border items-center justify-center hover:bg-secondary transition-colors">
            <User size={14} className="text-muted-foreground"/>
          </Link>
          <button onClick={()=>navigate("/")} className="hidden md:flex w-8 h-8 rounded-lg border border-border items-center justify-center hover:bg-secondary transition-colors">
            <LogOut size={14} className="text-muted-foreground"/>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-[320px] lg:w-[340px] flex-shrink-0 border-r border-border flex-col overflow-hidden">
          {desktopSidebar()}
        </aside>

        {/* Map */}
        <main className="flex-1 relative overflow-hidden p-2 md:p-3">
          <MapView 
            parkings={parkings} 
            selected={selected} 
            userLoc={userLoc} 
            userRealLocation={userRealLocation}
            onMapClick={(lat, lng) => setUserLoc([lat, lng])}
            onSelect={p=>{ setSelected(p); setMobileSheetOpen(false); }}
          />

          {/* Desktop bottom chip */}
          {selected&&desktopPanel==="list"&&(
            <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-4 items-center gap-4 min-w-[380px]">
              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${availBg(selected.available,selected.total)}`}>
                <CircleParking size={18} className={availColor(selected.available,selected.total)}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{selected.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`text-xs font-mono ${selected.status === 'FREE' ? 'text-[#39e079]' : 'text-[#e05555]'}`}>{selected.status}</span>
                  <span className="text-xs font-mono text-muted-foreground">·</span>
                  <span className="text-xs font-mono text-muted-foreground">{selected.driveTime}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>handleReserve(selected)} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${reservedIds.has(selected.id)?"bg-[#e0a839]/15 border border-[#e0a839]/30 text-[#e0a839]":"bg-foreground/8 border border-foreground/12 text-foreground hover:bg-foreground/12"}`}>
                  <Ticket size={12}/>{reservedIds.has(selected.id)?"Reserved":"Reserve"}
                </button>
                <button onClick={()=>handleDirections(selected)} className="flex items-center gap-2 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                  <Navigation size={12}/>Go
                </button>
              </div>
            </div>
          )}

          {/* Mobile: selected parking mini chip (above bottom sheet handle) */}
          {selected&&!mobileSheetOpen&&(
            <div className="md:hidden absolute bottom-4 left-3 right-3 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl p-3 flex items-center gap-3" onClick={()=>setMobileSheetOpen(true)}>
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${availBg(selected.available,selected.total)}`}>
                <CircleParking size={16} className={availColor(selected.available,selected.total)}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{selected.name}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${selected.status === 'FREE' ? 'text-[#39e079]' : 'text-[#e05555]'}`}>{selected.status}</span>
                </div>
              </div>
              <ChevronUp size={16} className="text-muted-foreground"/>
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom sheet */}
      <div className="block md:hidden">
        <Drawer.Root open={mobileSheetOpen} onOpenChange={setMobileSheetOpen} dismissible>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40 z-30"/>
            <Drawer.Content className="fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-card rounded-t-2xl border-t border-border" style={{maxHeight:"80vh"}}>
              <VisuallyHidden>
                <Drawer.Title>Map Actions</Drawer.Title>
                <Drawer.Description>Swipe up to view parking options or directions.</Drawer.Description>
              </VisuallyHidden>
              <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-foreground/20"/>
              </div>
              <div className="flex-1 overflow-hidden" style={{paddingBottom:"env(safe-area-inset-bottom)"}}>
                {mobileSheetContent()}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      {/* Bottom nav (mobile) */}
      <BottomNav active={activeTab} onTab={handleTab} reservationCount={reservations.length}/>

      {/* Reserve modal */}
      {reserveTarget&&<ReserveModal parking={reserveTarget} onClose={()=>setReserveTarget(null)} onConfirm={r=>{handleConfirmReservation(r);}}/>}

      {/* Arrival confirmation */}
      {showArrival&&selected&&(
        <ArrivalConfirmation parking={selected} reservation={activeReservation} onClose={()=>setShowArrival(false)}/>
      )}
    </div>
  );
}
