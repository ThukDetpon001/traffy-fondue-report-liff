import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Maximize2, Minimize2, Navigation, Loader2, MapPin } from "lucide-react";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to re-center map dynamically
function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center?.lat && center?.lng) {
            map.flyTo([center.lat, center.lng], 16, { animate: true });
        }
    }, [center, map]);
    return null;
}

// Map Event Handler Component
function MapEventsHandler({ onLocationSelect, setPosition }) {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            setPosition({ lat, lng });
            onLocationSelect(lat, lng);
        },
    });
    return null;
}

export function LocationPicker({ initialLat, initialLng, onLocationSelect }) {
    const [center, setCenter] = useState({
        lat: initialLat || 13.7563,
        lng: initialLng || 100.5018,
    });
    const [position, setPosition] = useState(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
    );
    const [loadingGps, setLoadingGps] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Auto-fetch GPS on component mount if initial coordinates are not present
    useEffect(() => {
        if (initialLat && initialLng) {
            setCenter({ lat: initialLat, lng: initialLng });
            setPosition({ lat: initialLat, lng: initialLng });
            return;
        }
        handleGetGPS(true);
    }, []);

    const handleGetGPS = (isAuto = false) => {
        if (!("geolocation" in navigator)) {
            if (!isAuto) alert("เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS");
            return;
        }

        setLoadingGps(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const newPos = { lat: latitude, lng: longitude };
                setCenter(newPos);
                setPosition(newPos);
                onLocationSelect(latitude, longitude);
                setLoadingGps(false);
            },
            (err) => {
                console.warn("Geolocation fetch failed/denied:", err);
                setLoadingGps(false);
                if (!isAuto) {
                    alert("ไม่สามารถดึงตำแหน่งพิกัดปัจจุบันได้ กรุณาเปิดสิทธิ์ระบุตำแหน่ง GPS บนมือถือ");
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    return (
        <div className="space-y-3 text-left">
            {/* Action Toolbar: Auto GPS Button + Fullscreen Map Toggle */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => handleGetGPS(false)}
                    disabled={loadingGps}
                    className="py-2.5 px-3 bg-[#7A3E1D] hover:bg-[#5C2E10] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-[#7A3E1D]/20 active:scale-95 disabled:opacity-60"
                >
                    {loadingGps ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>กำลังดึงตำแหน่ง GPS...</span>
                        </>
                    ) : (
                        <>
                            <Navigation className="w-4 h-4 text-white shrink-0" />
                            <span>ดึงตำแหน่ง GPS ปัจจุบัน</span>
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs active:scale-98"
                >
                    {isFullscreen ? (
                        <>
                            <Minimize2 className="w-4 h-4 text-amber-800 shrink-0" />
                            <span>ย่อแผนที่ลง</span>
                        </>
                    ) : (
                        <>
                            <Maximize2 className="w-4 h-4 text-amber-800 shrink-0" />
                            <span>ขยายแผนที่เต็มจอ</span>
                        </>
                    )}
                </button>
            </div>

            {/* Map Container (Regular Mode or Fullscreen Overlay Mode) */}
            <div
                className={
                    isFullscreen
                        ? "fixed inset-0 z-50 bg-slate-900/90 p-3 sm:p-6 flex flex-col space-y-3"
                        : "h-[320px] sm:h-[380px] w-full rounded-2xl overflow-hidden border-2 border-amber-900/20 shadow-inner relative z-0"
                }
            >
                {isFullscreen && (
                    <div className="flex justify-between items-center bg-white px-4 py-3 rounded-xl shadow-md z-10">
                        <div className="flex items-center gap-2 text-[#7A3E1D] font-bold text-sm">
                            <MapPin className="w-4 h-4" />
                            <span>โหมดแผนที่เต็มจอ (คลิก/แตะลากหมุดบนแผนที่)</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsFullscreen(false)}
                            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-lg flex items-center gap-1"
                        >
                            <Minimize2 className="w-3.5 h-3.5" />
                            <span>ปิดเต็มจอ</span>
                        </button>
                    </div>
                )}

                <div className={isFullscreen ? "flex-1 w-full rounded-2xl overflow-hidden shadow-2xl relative" : "h-full w-full"}>
                    <MapContainer
                        center={[center.lat, center.lng]}
                        zoom={16}
                        style={{ height: "100%", width: "100%" }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapController center={center} />
                        <MapEventsHandler onLocationSelect={onLocationSelect} setPosition={setPosition} />
                        {position && <Marker position={[position.lat, position.lng]} />}
                    </MapContainer>
                </div>
            </div>

            {/* Status Footer */}
            <div className="p-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium flex items-center justify-between">
                <span>แตะลากปักหมุดบนแผนที่เพื่อระบุตำแหน่งปัญหา</span>
                {position ? (
                    <span className="text-[#7A3E1D] font-bold font-mono">
                        {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                    </span>
                ) : (
                    <span className="text-amber-700 font-bold">ยังไม่ได้ปักหมุด</span>
                )}
            </div>
        </div>
    );
}