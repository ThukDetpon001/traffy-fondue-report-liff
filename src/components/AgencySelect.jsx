import { useState, useEffect } from "react";
import { Check, Building2, Search } from "lucide-react";

// ============================================================================
// CONFIG & MOCK DATA
// ============================================================================
// เปลี่ยนสวิตช์นี้เป็น false เมื่อพร้อมเชื่อมต่อกับ Backend API จริง
const USE_MOCK_DATA = true;

// Mockup รายชื่อหน่วยงาน A ถึง Z
const MOCK_AGENCIES = Array.from({ length: 26 }, (_, i) => {
    const letter = String.fromCharCode(65 + i); // 'A' .. 'Z'
    return {
        id: `agency-${letter.toLowerCase()}`,
        name: `หน่วยงาน ${letter}`,
    };
});

export function AgencySelect({ lat, lng, value, onChange }) {
    const [agencies, setAgencies] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAgencies = async () => {
            setLoading(true);

            // 1. กรณีใช้ข้อมูล Mockup
            if (USE_MOCK_DATA) {
                await new Promise((resolve) => setTimeout(resolve, 100));
                setAgencies(MOCK_AGENCIES);
                setLoading(false);
                return;
            }

            // 2. กรณีเชื่อมต่อ Backend API จริง
            if (!lat || !lng) {
                setAgencies([]);
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/agencies?lat=${lat}&lng=${lng}`);
                const data = await res.json();
                setAgencies(data);
            } catch (err) {
                console.error("Failed to fetch agencies", err);
                setAgencies(MOCK_AGENCIES);
            } finally {
                setLoading(false);
            }
        };

        fetchAgencies();
    }, [lat, lng]);

    // กรองรายชื่อหน่วยงานตามคำค้นหา
    const filteredAgencies = agencies.filter((agency) =>
        agency.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col space-y-3 w-full text-left">
            {/* กรอบสีเหลือง: ช่องค้นหาหน่วยงาน (Search Input) */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4 text-[#7A3E1D]" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="พิมพ์เพื่อค้นหาหน่วยงาน (เช่น หน่วยงาน A)..."
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-amber-900/20 focus:border-[#7A3E1D] focus:ring-2 focus:ring-[#7A3E1D]/20 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition shadow-xs"
                />
            </div>

            {/* กรอบสีแดง: รายชื่อหน่วยงานทั้งหมดแบบ Scroll ได้ (Full List View) */}
            <div className="border-2 border-amber-900/10 rounded-2xl bg-slate-50/50 p-2 max-h-[320px] sm:max-h-[360px] overflow-y-auto space-y-1.5 shadow-inner">
                {loading ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">กำลังโหลดรายชื่อหน่วยงาน...</div>
                ) : filteredAgencies.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">ไม่พบหน่วยงานที่ค้นหา</div>
                ) : (
                    filteredAgencies.map((agency) => {
                        const isSelected = value === agency.id;
                        return (
                            <button
                                key={agency.id}
                                type="button"
                                onClick={() => onChange(agency.id, agency)}
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