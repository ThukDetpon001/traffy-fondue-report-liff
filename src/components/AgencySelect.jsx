import { useState, useEffect } from "react";
import { Check, Building2, Search, AlertTriangle, RefreshCw, History, UserCheck, FileText, Clock } from "lucide-react";
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

    // Helper: Render status badge with icon and styling
    const renderStatusBadge = (statusStr) => {
        if (!statusStr) return null;
        if (statusStr.includes("ใช้งานหนัก")) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-100/90 text-amber-900 border border-amber-300/70 shrink-0">
                    <span>🥇</span>
                    <span>{statusStr}</span>
                </span>
            );
        }
        if (statusStr.includes("ไม่เคลื่อนไหว")) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    <span>🕵️‍♂️</span>
                    <span>{statusStr}</span>
                </span>
            );
        }
        if (statusStr.includes("เริ่มใช้งาน")) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                    <span>🥉</span>
                    <span>{statusStr}</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                <span>🏷️</span>
                <span>{statusStr}</span>
            </span>
        );
    };

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

            {/* รายชื่อหน่วยงานทั้งหมดแบบ Scroll ได้ (Full List View matching Screenshot) */}
            <div className="border-2 border-amber-900/10 rounded-2xl bg-slate-100/60 p-2.5 min-h-[340px] max-h-[55vh] sm:max-h-[460px] overflow-y-auto space-y-2.5 shadow-inner flex flex-col">
                {loading ? (
                    <div className="my-auto py-12 text-center text-xs text-slate-500 font-medium flex flex-col items-center justify-center gap-2">
                        <div className="w-7 h-7 border-3 border-[#7A3E1D] border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-semibold text-slate-700">กำลังโหลดรายชื่อหน่วยงานรับผิดชอบจาก API...</span>
                    </div>
                ) : errorMsg ? (
                    <div className="my-auto py-10 px-4 text-center text-xs font-medium text-amber-950 flex flex-col items-center justify-center gap-2.5">
                        <AlertTriangle className="w-8 h-8 text-amber-700 shrink-0" />
                        <span className="leading-relaxed font-semibold">{errorMsg}</span>
                        {lat && lng && (
                            <button
                                type="button"
                                onClick={loadAgencies}
                                className="mt-1 px-4 py-2 bg-[#7A3E1D] hover:bg-[#5C2E10] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-md"
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
                    <>
                        {/* รายการหน่วยงานรับผิดชอบในพื้นที่ (1-10) */}
                        <div className="space-y-2">
                            {filteredAgencies.map((agency) => {
                                const agencyIdStr = String(agency.id);
                                const isSelected = String(value) === agencyIdStr;
                                return (
                                    <div
                                        key={agencyIdStr}
                                        className={`w-full p-3.5 rounded-2xl transition border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
                                            isSelected
                                                ? "bg-amber-50/90 border-2 border-[#7A3E1D] shadow-sm"
                                                : "bg-white border-slate-200/90 hover:border-amber-900/30 hover:bg-amber-50/20"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            {/* โลโก้/รูปภาพหน่วยงาน */}
                                            {agency.photo ? (
                                                <img
                                                    src={agency.photo}
                                                    alt={agency.name}
                                                    className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0 shadow-xs mt-0.5"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div
                                                className="w-12 h-12 rounded-xl bg-amber-100/70 text-[#7A3E1D] flex items-center justify-center shrink-0 border border-amber-200/60 shadow-xs mt-0.5"
                                                style={{ display: agency.photo ? 'none' : 'flex' }}
                                            >
                                                <Building2 className="w-6 h-6" />
                                            </div>

                                            {/* ข้อมูลชื่อ และป้ายสถิติต่างๆ */}
                                            <div className="flex flex-col min-w-0 text-left">
                                                <span className="font-bold text-slate-900 text-sm leading-tight tracking-tight mb-1.5">
                                                    {agency.name}
                                                </span>

                                                {/* ป้ายสถิติ & Badges (เหมือนในรูปภาพ) */}
                                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 font-sans">
                                                    {renderStatusBadge(agency.fonduegroup_status)}

                                                    {/* จำนวนเจ้าหน้าที่ */}
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-slate-700 border border-slate-200/80">
                                                        <span>👥</span>
                                                        <span>{agency.admin_staff}</span>
                                                    </span>

                                                    {/* อัตราส่วนเรื่องแจ้ง */}
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-slate-700 border border-slate-200/80">
                                                        <span>📄</span>
                                                        <span>{agency.post_finish}/{agency.post}</span>
                                                    </span>

                                                    {/* วันที่อัปเดตล่าสุด */}
                                                    {agency.last_activity && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-slate-700 border border-slate-200/80">
                                                            <span>🕒</span>
                                                            <span>{agency.last_activity}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ปุ่มกดเลือกหน่วยงาน "แจ้งที่นี่" ด้านขวา */}
                                        <div className="flex items-center justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => onChange(agencyIdStr, agency)}
                                                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95 ${
                                                    isSelected
                                                        ? "bg-[#7A3E1D] text-white border border-[#5C2E10] ring-2 ring-[#7A3E1D]/30"
                                                        : "bg-[#7A3E1D] hover:bg-[#5C2E10] text-white"
                                                }`}
                                            >
                                                {isSelected ? (
                                                    <>
                                                        <Check className="w-4 h-4 text-white stroke-[3]" />
                                                        <span>เลือกแล้ว</span>
                                                    </>
                                                ) : (
                                                    <span>แจ้งที่นี่</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* โซนที่ 3: หน่วยงานที่พึ่งแจ้งล่าสุด (Placeholder UI Section) */}
                        <div className="pt-3 border-t-2 border-slate-200/80 mt-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2 px-1">
                                <History className="w-4 h-4 text-[#7A3E1D]" />
                                <span>หน่วยงานที่พึ่งแจ้งล่าสุด (การแจ้งครั้งก่อน)</span>
                            </div>

                            <div className="w-full p-3 rounded-2xl bg-amber-50/50 border border-amber-900/15 flex items-center justify-between gap-3 text-left">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#7A3E1D] flex items-center justify-center shrink-0 border border-amber-200">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-xs text-slate-800">
                                            หน่วยงานแจ้งล่าสุด (รอเชื่อมต่อข้อมูล API)
                                        </span>
                                        <span className="text-[11px] text-slate-500">
                                            ระบบกำลังเตรียมพร้อมรับ API latest-reported-org
                                        </span>
                                    </div>
                                </div>
                                <span className="px-2.5 py-1 bg-slate-200/80 text-slate-600 rounded-lg text-[11px] font-semibold shrink-0">
                                    รอดึงข้อมูล
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}