import { useState, useEffect } from "react";
import { Check, Building2, Search, AlertTriangle, RefreshCw } from "lucide-react";
import { fetchAgenciesByCoords } from "@/services/api";

export function AgencySelect({ lat, lng, value, onChange }) {
    const [agencies, setAgencies] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const loadAgencies = async () => {
        if (!lat || !lng) {
            setAgencies([]);
            setLoading(false);
            setErrorMsg("กรุณาระบุพิกัดตำแหน่งในขั้นตอนที่ 1 ก่อนเลือกหน่วยงาน");
            return;
        }

        setLoading(true);
        setErrorMsg("");

        try {
            const data = await fetchAgenciesByCoords(lat, lng);
            if (data && data.length > 0) {
                setAgencies(data);
                setErrorMsg("");
            } else {
                setAgencies([]);
                setErrorMsg("ไม่พบข้อมูลหน่วยงานรับผิดชอบในบริเวณพิกัดนี้จากระบบ API");
            }
        } catch (err) {
            console.error("❌ API fetch failed:", err);
            setAgencies([]);
            setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อดึงข้อมูลหน่วยงานจาก API");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAgencies();
    }, [lat, lng]);

    // กรองรายชื่อหน่วยงานตามคำค้นหา
    const filteredAgencies = agencies.filter((agency) =>
        agency.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col space-y-3 w-full text-left">
            {/* ช่องค้นหาหน่วยงาน (Search Input) */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4 text-[#7A3E1D]" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="พิมพ์เพื่อค้นหาหน่วยงาน..."
                    disabled={agencies.length === 0}
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-amber-900/20 focus:border-[#7A3E1D] focus:ring-2 focus:ring-[#7A3E1D]/20 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition shadow-xs disabled:bg-slate-100 disabled:opacity-60"
                />
            </div>

            {/* รายชื่อหน่วยงานทั้งหมดแบบ Scroll ได้ (Full List View) */}
            <div className="border-2 border-amber-900/10 rounded-2xl bg-slate-50/50 p-2 min-h-[320px] max-h-[50vh] sm:max-h-[440px] overflow-y-auto space-y-1.5 shadow-inner flex flex-col">
                {loading ? (
                    <div className="my-auto py-12 text-center text-xs text-slate-500 font-medium flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#7A3E1D] border-t-transparent rounded-full animate-spin"></div>
                        <span>กำลังโหลดรายชื่อหน่วยงานในพื้นที่จาก API...</span>
                    </div>
                ) : errorMsg ? (
                    <div className="my-auto py-10 px-4 text-center text-xs font-medium text-amber-950 flex flex-col items-center justify-center gap-2.5">
                        <AlertTriangle className="w-7 h-7 text-amber-700 shrink-0" />
                        <span className="leading-relaxed">{errorMsg}</span>
                        {lat && lng && (
                            <button
                                type="button"
                                onClick={loadAgencies}
                                className="mt-1 px-3 py-1.5 bg-[#7A3E1D] hover:bg-[#5C2E10] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-xs"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>ลองใหม่อีกครั้ง</span>
                            </button>
                        )}
                    </div>
                ) : filteredAgencies.length === 0 ? (
                    <div className="my-auto py-10 text-center text-xs text-slate-500 font-medium">
                        ไม่พบหน่วยงานที่ตรงกับคำค้นหา "{searchQuery}"
                    </div>
                ) : (
                    filteredAgencies.map((agency) => {
                        const agencyIdStr = String(agency.id);
                        const isSelected = String(value) === agencyIdStr;
                        return (
                            <button
                                key={agencyIdStr}
                                type="button"
                                onClick={() => onChange(agencyIdStr, agency)}
                                className={`w-full p-3.5 rounded-xl text-left flex items-center justify-between transition ${
                                    isSelected
                                        ? "bg-amber-100/80 border-2 border-[#7A3E1D] text-[#7A3E1D] font-bold shadow-xs"
                                        : "bg-white border border-slate-200/80 hover:border-amber-900/30 text-slate-800 font-medium hover:bg-amber-50/40"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                            isSelected ? "bg-[#7A3E1D] text-white" : "bg-amber-50 text-[#7A3E1D]"
                                        }`}
                                    >
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm">{agency.name}</span>
                                </div>
                                {isSelected && <Check className="w-5 h-5 text-[#7A3E1D] shrink-0" />}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}