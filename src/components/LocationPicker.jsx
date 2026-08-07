import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ onLocationSelect }) {
    const [position, setPosition] = useState(null);

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    return position === null ? null : <Marker position={position} />;
}

export function LocationPicker({ onLocationSelect }) {
    const [center, setCenter] = useState({ lat: 13.7563, lng: 100.5018 }); // กรุงเทพฯ (Default)

    const handleGetGPS = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setCenter({ lat: latitude, lng: longitude });
                    onLocationSelect(latitude, longitude);
                },
                (err) => alert("ไม่สามารถดึงตำแหน่งได้ กรุณาเปิด GPS"),
                { enableHighAccuracy: true }
            );
        }
    };

    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={handleGetGPS}
                className="w-full py-3 bg-[#7A3E1D] hover:bg-[#633014] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-md shadow-[#7A3E1D]/20 active:scale-98"
            >
                📍 ดึงตำแหน่งปัจจุบันจาก GPS
            </button>
            <div className="h-[360px] sm:h-[400px] w-full rounded-2xl overflow-hidden border-2 border-amber-900/20 shadow-inner relative z-0">
                <MapContainer center={[center.lat, center.lng]} zoom={15} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationMarker onLocationSelect={onLocationSelect} />
                </MapContainer>
            </div>
        </div>
    );
}