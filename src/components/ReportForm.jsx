import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reportFormSchema } from "../schema";
import { LocationPicker } from "./LocationPicker";
import { AgencySelect } from "./AgencySelect";
import liff from "@line/liff";
import traffyLogo from "../assets/traffy.png";
import { submitTraffyTicket } from "@/services/api";
import { compressImage } from "@/utils/imageCompressor";
import {
    MapPin,
    Building2,
    FileText,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Camera,
    Image,
    Send,
    AlertCircle,
    Sparkles,
    Trash2,
    Loader2,
    RotateCcw
} from "lucide-react";

const DRAFT_KEY = "traffy_liff_draft";

export default function ReportForm() {
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedAgencyObj, setSelectedAgencyObj] = useState(null);
    const [attachedImages, setAttachedImages] = useState([]); // Array of { id, name, url, file, sizeStr }
    const [compressingImage, setCompressingImage] = useState(false);
    const [fontSize, setFontSize] = useState("sm"); // "sm" (A=16px) | "md" (A+=20px) | "lg" (A++=24px)
    const [draftRestored, setDraftRestored] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successModal, setSuccessModal] = useState({ open: false, payload: null, idMsg: null });

    useEffect(() => {
        const root = document.documentElement;
        if (fontSize === "sm") {
            root.style.fontSize = "16px";
        } else if (fontSize === "md") {
            root.style.fontSize = "20px";
        } else if (fontSize === "lg") {
            root.style.fontSize = "24px";
        }
        return () => {
            root.style.fontSize = "";
        };
    }, [fontSize]);

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        watch,
        control,
        trigger,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(reportFormSchema),
    });

    const watchLat = watch("latitude");
    const watchLng = watch("longitude");
    const watchAgencyId = watch("agency_id");
    const watchDescription = watch("description");

    // ============================================================
    // DRAFT ENGINE: LocalStorage Auto-Save & Restore
    // ============================================================
    // Restore draft on mount
    useEffect(() => {
        try {
            const savedDraft = localStorage.getItem(DRAFT_KEY);
            if (savedDraft) {
                const parsed = JSON.parse(savedDraft);
                if (parsed.latitude && parsed.longitude) {
                    setValue("latitude", parsed.latitude, { shouldValidate: true });
                    setValue("longitude", parsed.longitude, { shouldValidate: true });
                }
                if (parsed.agency_id) {
                    setValue("agency_id", parsed.agency_id, { shouldValidate: true });
                }
                if (parsed.agency_name) {
                    setSelectedAgencyObj({ id: parsed.agency_id, name: parsed.agency_name });
                }
                if (parsed.description) {
                    setValue("description", parsed.description, { shouldValidate: true });
                }
                if (parsed.fontSize) setFontSize(parsed.fontSize);
                if (parsed.currentStep && parsed.currentStep <= 4) {
                    setCurrentStep(parsed.currentStep);
                }
                setDraftRestored(true);
            }
        } catch (e) {
            console.warn("Failed to restore draft from localStorage:", e);
        }
    }, [setValue]);

    // Auto-save draft on form changes
    useEffect(() => {
        try {
            const draftData = {
                latitude: watchLat || null,
                longitude: watchLng || null,
                agency_id: watchAgencyId || null,
                agency_name: selectedAgencyObj?.name || null,
                description: watchDescription || "",
                fontSize,
                currentStep,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
        } catch (e) {
            console.warn("Failed to save draft to localStorage:", e);
        }
    }, [watchLat, watchLng, watchAgencyId, selectedAgencyObj, watchDescription, fontSize, currentStep]);

    const handleClearDraft = () => {
        try {
            localStorage.removeItem(DRAFT_KEY);
            reset();
            setSelectedAgencyObj(null);
            setAttachedImages([]);
            setCurrentStep(1);
            setDraftRestored(false);
        } catch (e) {
            console.warn("Failed to clear draft:", e);
        }
    };

    const steps = [
        { id: 1, title: "ตำแหน่ง", icon: MapPin },
        { id: 2, title: "หน่วยงาน", icon: Building2 },
        { id: 3, title: "รายละเอียด", icon: FileText },
        { id: 4, title: "สรุปผล", icon: CheckCircle2 },
    ];

    const handleNext = async () => {
        let isStepValid = false;

        if (currentStep === 1) {
            isStepValid = await trigger(["latitude", "longitude"]);
        } else if (currentStep === 2) {
            isStepValid = await trigger(["agency_id"]);
        } else if (currentStep === 3) {
            isStepValid = await trigger(["description", "images"]);
        }

        if (isStepValid && currentStep < 4) {
            setCurrentStep((prev) => prev + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    // ============================================================
    // IMAGE COMPRESSION & THUMBNAILS HANDLER
    // ============================================================
    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setCompressingImage(true);
        try {
            const compressedResults = [];
            for (const file of files) {
                const res = await compressImage(file, 1280, 0.75);
                const sizeKb = (res.compressedSize / 1024).toFixed(0);
                compressedResults.push({
                    id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    name: res.name,
                    url: res.url,
                    file: res.file,
                    sizeStr: `${sizeKb} KB`,
                });
            }

            const updatedList = [...attachedImages, ...compressedResults];
            setAttachedImages(updatedList);
            setValue("images", updatedList.map((item) => item.file), { shouldValidate: true });
        } catch (err) {
            alert("ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองเลือกรูปภาพใหม่อีกครั้ง");
        } finally {
            setCompressingImage(false);
            e.target.value = ""; // Reset input value so same image can be re-selected if deleted
        }
    };

    const handleRemoveImage = (imageId) => {
        const updatedList = attachedImages.filter((item) => item.id !== imageId);
        setAttachedImages(updatedList);
        setValue("images", updatedList.length > 0 ? updatedList.map((item) => item.file) : null, {
            shouldValidate: true,
        });
    };

    // ============================================================
    // SUBMIT TICKET HANDLER (MANUAL IN STEP 4 ONLY)
    // ============================================================
    const handleManualSubmit = async () => {
        // Validate all fields before submitting
        const isValid = await trigger(["latitude", "longitude", "agency_id", "description"]);
        if (!isValid) return;

        const data = getValues();

        if (!liff.isLoggedIn()) {
            alert("กรุณาเข้าสู่ระบบด้วยบัญชี LINE เพื่อส่งเรื่องแจ้งปัญหา");
            liff.login();
            return;
        }

        let lineProfile;
        try {
            lineProfile = await liff.getProfile();
        } catch (liffError) {
            console.error("ดึง LINE Profile ไม่สำเร็จ:", liffError);
            alert("ไม่สามารถเชื่อมต่อข้อมูลบัญชี LINE ได้ กรุณาลองใหม่อีกครั้ง");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await submitTraffyTicket({
                latitude: data.latitude,
                longitude: data.longitude,
                agency_id: data.agency_id,
                agency_name: selectedAgencyObj?.name || "",
                description: data.description,
                attachedImages: attachedImages,
                lineProfile: lineProfile,
            });

            if (result.success) {
                // Clear LocalStorage draft on successful submission
                try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}

                // Send text confirmation into LINE chat if available (bkk-careplan style)
                if (liff && liff.isInClient && liff.isInClient() && typeof liff.sendMessages === 'function') {
                    liff.sendMessages([
                        {
                            type: 'text',
                            text: `📌 บันทึกเรื่องแจ้งปัญหา Traffy Fondue เรียบร้อยแล้ว\n\nหน่วยงาน: ${selectedAgencyObj?.name || 'หน่วยงานรับผิดชอบ'}\nรายละเอียด: ${(data.description || '').substring(0, 60)}...\nสถานะ: ส่งเรื่องเข้าสู่ระบบเรียบร้อยแล้ว 🚀`
                        }
                    ]).catch((err) => console.warn("liff.sendMessages warning:", err));
                }

                // Show success modal with clean summary card
                setSuccessModal({ open: true, payload: result.payload, idMsg: result.id_msg });
            } else {
                alert("ไม่สามารถส่งเรื่องแจ้งได้ในขณะนี้ กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง");
            }
        } catch (error) {
            console.error("❌ Submit ticket error:", error);
            alert("เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตแล้วลองอีกครั้ง");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto min-h-screen sm:min-h-0 p-4 sm:p-5 bg-white sm:rounded-3xl shadow-xl border border-amber-900/10 flex flex-col justify-start gap-3 text-slate-900 relative">

            {/* Screen reader live region */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                ขั้นตอนที่ {currentStep} จาก {steps.length}: {steps[currentStep - 1]?.title}
            </div>

            {/* Header & Step Progress Bar */}
            <div>
                {/* Brand Title Banner */}
                <header className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-amber-100">
                    <div className="flex items-center gap-2 shrink-0">
                        <img
                            src={traffyLogo}
                            alt="โลโก้ Traffy Fondue"
                            className="w-6 h-6 rounded-lg object-cover shadow-sm border border-amber-900/10 shrink-0"
                        />
                        <span className="text-xs font-bold text-slate-800 tracking-tight whitespace-nowrap">
                            แจ้งปัญหา Traffy Fondue
                        </span>
                    </div>

                    {/* Font size buttons: A / A+ / A++ */}
                    <div
                        role="group"
                        aria-label="เลือกขนาดตัวอักษร"
                        className="flex items-center border border-amber-300 rounded-lg overflow-hidden shrink-0"
                    >
                        <button
                            type="button"
                            onClick={() => setFontSize("sm")}
                            aria-label="ขนาดอักษรปัญกา ปกติ"
                            className={`px-2 py-0.5 text-[11px] font-bold transition ${
                                fontSize === "sm"
                                    ? "bg-[#7A3E1D] text-white"
                                    : "bg-white text-amber-900 hover:bg-amber-50"
                            }`}
                        >
                            A
                        </button>
                        <button
                            type="button"
                            onClick={() => setFontSize("md")}
                            aria-label="ขนาดอักษรปัญกา ปานกลาง"
                            className={`px-2 py-0.5 text-[11px] font-bold transition border-l border-r border-amber-200 ${
                                fontSize === "md"
                                    ? "bg-[#7A3E1D] text-white"
                                    : "bg-white text-amber-900 hover:bg-amber-50"
                            }`}
                        >
                            A+
                        </button>
                        <button
                            type="button"
                            onClick={() => setFontSize("lg")}
                            aria-label="ขนาดอักษรปัญกา ใหญ่"
                            className={`px-2 py-0.5 text-[11px] font-bold transition ${
                                fontSize === "lg"
                                    ? "bg-[#7A3E1D] text-white"
                                    : "bg-white text-amber-900 hover:bg-amber-50"
                            }`}
                        >
                            A++
                        </button>
                    </div>
                </header>

                {/* Draft Restored Banner */}
                {draftRestored && (
                    <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-medium">
                        <span>💾 คืนค่าแบบร่างข้อมูลที่คุณเคยกรอกไว้ให้อัตโนมัติแล้ว</span>
                        <button
                            type="button"
                            onClick={handleClearDraft}
                            className="text-emerald-700 hover:text-red-600 font-bold underline ml-2 flex items-center gap-1 shrink-0"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>เริ่มใหม่</span>
                        </button>
                    </div>
                )}

                {/* Step Navigation Indicator Bar */}
                <div className="mb-4">
                    <div
                        role="progressbar"
                        aria-valuenow={currentStep}
                        aria-valuemin={1}
                        aria-valuemax={steps.length}
                        aria-label={`ความคืบหน้าขั้นตอนที่ ${currentStep} จาก 4`}
                        className="w-full bg-amber-100 rounded-full h-2 overflow-hidden mb-3"
                    >
                        <div
                            className="bg-[#7A3E1D] h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${(currentStep / steps.length) * 100}%` }}
                        />
                    </div>

                    <nav aria-label="ขั้นตอนการแจ้งปัญหา" className="grid grid-cols-4 gap-1">
                        {steps.map((step) => {
                            const IconComponent = step.icon;
                            const isActive = currentStep === step.id;
                            const isDone = currentStep > step.id;

                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => {
                                        if (isDone) setCurrentStep(step.id);
                                    }}
                                    disabled={!isDone && !isActive}
                                    aria-current={isActive ? "step" : undefined}
                                    className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-xl transition ${
                                        isActive
                                            ? "bg-amber-100/90 text-[#7A3E1D] font-bold"
                                            : isDone
                                            ? "text-amber-900 font-semibold hover:bg-amber-50"
                                            : "text-slate-400 font-normal cursor-not-allowed opacity-60"
                                    }`}
                                >
                                    <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                                            isActive
                                                ? "bg-[#7A3E1D] text-white shadow-sm"
                                                : isDone
                                                ? "bg-amber-800 text-white"
                                                : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                        <IconComponent className="w-3.5 h-3.5" aria-hidden="true" />
                                    </div>
                                    <span className="text-[11px] whitespace-nowrap">{step.title}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Form Content Steps Container */}
                <form id="traffy-report-form" onSubmit={(e) => e.preventDefault()} className="space-y-4" noValidate>
                    {/* STEP 1: Location Picker */}
                    {currentStep === 1 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xs">
                            <div role="note" className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-start gap-2.5 text-amber-950 text-xs sm:text-sm text-left leading-relaxed">
                                <MapPin className="w-4 h-4 text-[#7A3E1D] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>ขั้นตอนที่ 1: ระบบดึงพิกัด GPS ให้อัตโนมัติ หรือสามารถปักหมุดบนแผนที่เพื่อระบุตำแหน่งปัญหา</span>
                            </div>

                            <div className="text-left">
                                <LocationPicker
                                    initialLat={watchLat}
                                    initialLng={watchLng}
                                    onLocationSelect={(lat, lng) => {
                                        setValue("latitude", lat, { shouldValidate: true });
                                        setValue("longitude", lng, { shouldValidate: true });
                                    }}
                                />
                                {(errors.latitude || errors.longitude) && (
                                    <p id="location-error" role="alert" className="text-red-700 text-xs font-bold mt-2 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                                        {errors.latitude?.message || errors.longitude?.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Agency Select */}
                    {currentStep === 2 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-4 shadow-xs">
                            <div role="note" className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-start gap-2.5 text-amber-950 text-xs sm:text-sm text-left leading-relaxed">
                                <Building2 className="w-4 h-4 text-[#7A3E1D] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>ขั้นตอนที่ 2: เลือกหน่วยงานรับผิดชอบในพื้นที่สำหรับปัญหานี้</span>
                            </div>

                            <div className="text-left">
                                <label id="agency-label" className="block text-sm font-bold mb-2 text-slate-900 text-left">
                                    หน่วยงานรับผิดชอบ <span aria-hidden="true" className="text-red-600">*</span>
                                </label>
                                <Controller
                                    name="agency_id"
                                    control={control}
                                    render={({ field }) => (
                                        <AgencySelect
                                            lat={watchLat}
                                            lng={watchLng}
                                            value={field.value}
                                            onChange={(val, agencyObj) => {
                                                setValue("agency_id", val, { shouldValidate: true });
                                                if (agencyObj) setSelectedAgencyObj(agencyObj);
                                            }}
                                            aria-labelledby="agency-label"
                                            aria-describedby={errors.agency_id ? "agency-error" : undefined}
                                            aria-invalid={!!errors.agency_id}
                                        />
                                    )}
                                />
                                {errors.agency_id && (
                                    <p id="agency-error" role="alert" className="text-red-700 text-xs font-bold mt-2 flex items-center gap-1 text-left">
                                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                                        {errors.agency_id.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Description & Image Upload with Canvas Compression & Thumbnails */}
                    {currentStep === 3 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-4 shadow-xs">
                            <div role="note" className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-start gap-2.5 text-amber-950 text-xs sm:text-sm text-left leading-relaxed">
                                <FileText className="w-4 h-4 text-[#7A3E1D] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>ขั้นตอนที่ 3: อธิบายรายละเอียดปัญหาและถ่าย/แนบรูปถ่ายประกอบ</span>
                            </div>

                            {/* Description field */}
                            <div className="text-left">
                                <label htmlFor="description" className="block text-sm font-bold mb-1.5 text-slate-900 text-left">
                                    รายละเอียดปัญหา <span aria-hidden="true" className="text-red-600">*</span>
                                </label>
                                <textarea
                                    id="description"
                                    {...register("description")}
                                    aria-required="true"
                                    aria-invalid={!!errors.description}
                                    aria-describedby={errors.description ? "description-error" : "description-hint"}
                                    className="w-full border-2 border-slate-300 focus:border-[#7A3E1D] rounded-xl p-3 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3E1D] text-slate-900 placeholder:text-slate-400 transition"
                                    rows={4}
                                    placeholder="อธิบายรายละเอียด เช่น ท่อประปาแตกบริเวณหน้าอาคาร..."
                                />
                                <p id="description-hint" className="text-xs text-slate-500 mt-1">กรุณาระบุอย่างน้อย 10 ตัวอักษร</p>
                                {errors.description && (
                                    <p id="description-error" role="alert" className="text-red-700 text-xs font-bold mt-1 flex items-center gap-1 text-left">
                                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                                        {errors.description.message}
                                    </p>
                                )}
                            </div>

                            {/* Image Upload field: Clean Card with Gallery & Camera Selection */}
                            <div className="text-left">
                                <label htmlFor="images" className="block text-sm font-bold mb-1.5 text-slate-900 text-left">
                                    รูปภาพประกอบ <span aria-hidden="true" className="text-red-600">*</span>
                                </label>

                                {/* Main Clickable Upload Card (Opens OS sheet with Gallery Album + Camera options) */}
                                <div className="relative rounded-3xl bg-gradient-to-b from-[#2E1508] via-[#3B1C0B] to-[#2E1508] border-2 border-amber-900/50 p-6 sm:p-7 text-center text-white overflow-hidden shadow-xl group transition hover:border-amber-700/80 cursor-pointer">
                                    {/* Ambient Glow */}
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

                                    {/* System File Input (No capture attribute so OS displays BOTH Camera & Photo Gallery Album) */}
                                    <input
                                        id="images"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        title="กดเพื่อถ่ายภาพหรือเลือกรูปจากอัลบั้ม"
                                    />

                                    {/* Top Status Tag */}
                                    <div className="flex items-center justify-between text-amber-200 text-xs relative z-0 pointer-events-none mb-3">
                                        <div className="flex items-center gap-1.5 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-800/60 font-semibold text-[11px] text-amber-300">
                                            <Camera className="w-3.5 h-3.5 text-amber-400" />
                                            <span>อัปโหลดรูปภาพ</span>
                                        </div>
                                        <div className="text-[11px] font-bold text-amber-300/80 bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-900/50">
                                            {attachedImages.length} รูปที่แนบ
                                        </div>
                                    </div>

                                    {/* Center Content Area */}
                                    <div className="flex flex-col items-center justify-center gap-3 relative z-0 py-2">
                                        {compressingImage ? (
                                            <div className="flex flex-col items-center gap-2 py-3">
                                                <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                                                <span className="text-xs font-bold text-amber-200">กำลังเตรียมรูปภาพ...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner group-hover:scale-105 transition-transform duration-200">
                                                        <Camera className="w-6 h-6" />
                                                    </div>
                                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner group-hover:scale-105 transition-transform duration-200">
                                                        <Image className="w-6 h-6" />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm sm:text-base font-bold text-amber-100 tracking-wide">
                                                        กดที่นี่เพื่อถ่ายภาพ หรือเลือกรูปภาพจากอัลบั้ม
                                                    </span>
                                                    <span className="text-xs text-amber-300/70 font-medium">
                                                        รองรับเลือกรูปจากคลังภาพ (Gallery) หรือถ่ายจากกล้องสด (บีบอัดภาพอัตโนมัติ)
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Dedicated Quick Choice Buttons (Camera Direct vs Gallery Album Direct) */}
                                <div className="grid grid-cols-2 gap-2 mt-2.5">
                                    {/* Button 1: Camera Direct */}
                                    <label className="relative flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-950/20 border border-amber-900/30 hover:border-[#7A3E1D] hover:bg-amber-50/50 rounded-xl cursor-pointer transition shadow-xs active:scale-95 text-slate-800">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleImageUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <Camera className="w-4 h-4 text-[#7A3E1D]" />
                                        <span className="text-xs font-bold text-slate-800">ถ่ายภาพด้วยกล้อง</span>
                                    </label>

                                    {/* Button 2: Photo Library / Gallery */}
                                    <label className="relative flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-950/20 border border-amber-900/30 hover:border-[#7A3E1D] hover:bg-amber-50/50 rounded-xl cursor-pointer transition shadow-xs active:scale-95 text-slate-800">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <Image className="w-4 h-4 text-[#7A3E1D]" />
                                        <span className="text-xs font-bold text-slate-800">เลือกจากอัลบั้ม</span>
                                    </label>
                                </div>

                                {/* Thumbnail Cards Grid Preview (inspired by bkk-careplan) */}
                                {attachedImages.length > 0 && (
                                    <div className="mt-3">
                                        <span className="text-xs font-bold text-slate-700 block mb-1.5">
                                            รูปภาพที่แนบแล้ว ({attachedImages.length} รูป):
                                        </span>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                            {attachedImages.map((img) => (
                                                <div
                                                    key={img.id}
                                                    className="relative aspect-square rounded-xl overflow-hidden border-2 border-amber-900/20 bg-slate-900 group shadow-xs"
                                                >
                                                    <img
                                                        src={img.url}
                                                        alt={img.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveImage(img.id)}
                                                        title="ลบรูปภาพนี้"
                                                        aria-label={`ลบรูปภาพ ${img.name}`}
                                                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-mono text-center py-0.5 truncate px-1">
                                                        {img.sizeStr}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {errors.images && (
                                    <p id="images-error" role="alert" className="text-red-700 text-xs font-bold mt-1 flex items-center gap-1 text-left">
                                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                                        {errors.images.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Manual Review & Summary (Explicit Submission) */}
                    {currentStep === 4 && (
                        <section aria-label="สรุปข้อมูลก่อนส่งแจ้งเรื่อง" className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3 text-left shadow-xs">
                            <div role="note" className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-start gap-2.5 text-amber-950 text-xs sm:text-sm text-left leading-relaxed">
                                <Sparkles className="w-4 h-4 text-[#7A3E1D] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>ขั้นตอนสุดท้าย: กรุณาตรวจสอบความถูกต้อง แล้วกดปุ่ม "ส่งแจ้งเรื่อง" ด้านล่าง</span>
                            </div>

                            <dl className="space-y-2.5">
                                {/* Item 1: พิกัดเกิดเหตุ */}
                                <div className="p-3 bg-white border border-slate-200 rounded-xl text-left space-y-1">
                                    <dt className="text-xs font-bold text-slate-500 block">1. พิกัดเกิดเหตุ</dt>
                                    <dd className="flex items-center gap-2 font-mono text-xs font-bold text-slate-900">
                                        <MapPin className="w-4 h-4 text-[#7A3E1D] shrink-0" />
                                        <span>{watchLat?.toFixed(5)}, {watchLng?.toFixed(5)}</span>
                                    </dd>
                                </div>

                                {/* Item 2: หน่วยงานรับผิดชอบ */}
                                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-left space-y-1">
                                    <dt className="text-xs font-bold text-amber-900 block">2. หน่วยงานรับผิดชอบ</dt>
                                    <dd className="flex items-center gap-2 text-xs font-bold text-[#5C2E10]">
                                        <Building2 className="w-4 h-4 text-[#7A3E1D] shrink-0" />
                                        <span>{selectedAgencyObj ? selectedAgencyObj.name : "ไม่ได้ระบุ"}</span>
                                    </dd>
                                </div>

                                {/* Item 3: รายละเอียดปัญหา */}
                                <div className="p-3 bg-white border border-slate-200 rounded-xl text-left space-y-1 border-l-4 border-l-[#7A3E1D]">
                                    <dt className="text-xs font-bold text-slate-500 block">3. รายละเอียดปัญหา</dt>
                                    <dd className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                                        {watchDescription}
                                    </dd>
                                </div>

                                {/* Item 4: รูปภาพแนบ (Thumbnail Cards Grid) */}
                                {attachedImages.length > 0 && (
                                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-left space-y-1.5">
                                        <dt className="text-xs font-bold text-slate-500 block">
                                            4. รูปภาพแนบ ({attachedImages.length} รูป)
                                        </dt>
                                        <dd className="grid grid-cols-4 gap-2">
                                            {attachedImages.map((img) => (
                                                <div key={img.id} className="aspect-square rounded-lg overflow-hidden border border-slate-300">
                                                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </dd>
                                    </div>
                                )}
                            </dl>


                        </section>
                    )}
                </form>
            </div>

            {/* Bottom Sticky Action Buttons */}
            <div className="sticky -bottom-4 sm:-bottom-5 bg-white/95 backdrop-blur-md pt-3 pb-4 sm:pb-5 px-4 sm:px-5 -mx-4 sm:-mx-5 border-t border-slate-100 mt-auto z-30 flex gap-3 sm:rounded-b-3xl" role="group" aria-label="การนำทางขั้นตอน">


                {currentStep > 1 && (
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex-1 min-h-[48px] py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-1 text-sm shadow-xs"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        ย้อนกลับ
                    </button>
                )}

                {currentStep < 4 ? (
                    <button
                        type="button"
                        onClick={handleNext}
                        className="flex-1 min-h-[48px] py-3 bg-[#7A3E1D] hover:bg-[#5C2E10] text-white font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-1 text-sm shadow-md shadow-[#7A3E1D]/20"
                    >
                        ถัดไป
                        <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleManualSubmit}
                        disabled={isSubmitting}
                        className="flex-1 min-h-[48px] py-3.5 bg-[#7A3E1D] hover:bg-[#5C2E10] text-white font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-2 text-sm shadow-md shadow-[#7A3E1D]/20 disabled:opacity-60"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>กำลังส่งข้อมูลเรื่องแจ้ง...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                <span>ส่งเรื่องแจ้งปัญหา</span>
                            </>
                        )}
                    </button>
                )}
            </div>
            {/* ✅ SUCCESS MODAL (bkk-careplan style) */}
            {successModal.open && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="successModalTitle"
                >
                    <div className="w-full max-w-md bg-white sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#7A3E1D] to-[#5C2E10] px-5 py-4 text-white text-center">
                            <div className="text-3xl mb-1">✅</div>
                            <h3 id="successModalTitle" className="text-base font-bold">ยื่นเรื่องเรียบร้อยแล้ว!</h3>
                            {successModal.idMsg && (
                                <p className="text-amber-100 text-xs mt-0.5">รหัสเรื่อง #{successModal.idMsg}</p>
                            )}
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                            <p className="text-xs text-slate-600 leading-relaxed text-center">
                                ระบบบันทึกข้อมูลคำร้องเข้าสู่ระบบเรียบร้อยแล้ว เมื่อระบบประมวลผลเสร็จสิ้น ท่านจะได้รับใบรวบรวมสรุปข้อมูลผ่านทางแชต LINE นี้ และเจ้าหน้าที่จะแจ้งความคืบหน้าการดำเนินงานให้ทราบเป็นระยะ
                            </p>

                            {/* Clean Summary Card (bkk-careplan style - No raw JSON exposed) */}
                            <div className="rounded-2xl bg-amber-50/70 border border-amber-900/15 p-3.5 space-y-2 text-left text-xs">
                                <div className="flex justify-between items-center pb-2 border-b border-amber-900/10">
                                    <span className="font-bold text-slate-700">หน่วยงานรับผิดชอบ:</span>
                                    <span className="font-bold text-[#7A3E1D] text-right truncate max-w-[180px]">
                                        {selectedAgencyObj?.name || "หน่วยงานรับผิดชอบ"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-amber-900/10">
                                    <span className="font-bold text-slate-700">พิกัดสถานที่:</span>
                                    <span className="font-mono text-slate-600">
                                        {getValues("latitude")?.toFixed(4)}, {getValues("longitude")?.toFixed(4)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-amber-900/10">
                                    <span className="font-bold text-slate-700">จำนวนรูปถ่ายแนบ:</span>
                                    <span className="font-semibold text-slate-800">{attachedImages.length} รูป</span>
                                </div>
                                <div className="flex justify-between items-center pt-0.5">
                                    <span className="font-bold text-slate-700">สถานะการส่งเรื่อง:</span>
                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md text-[11px] border border-emerald-300/60">
                                        <span>✓</span> บันทึกข้อมูลเข้าสู่ระบบแล้ว
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-4 pb-5 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setSuccessModal({ open: false, payload: null, idMsg: null });
                                    if (liff.isInClient && liff.isInClient()) {
                                        liff.closeWindow();
                                    } else {
                                        reset();
                                        setAttachedImages([]);
                                        setCurrentStep(1);
                                    }
                                }}
                                className="w-full min-h-[48px] bg-[#7A3E1D] hover:bg-[#5C2E10] text-white font-bold rounded-xl active:scale-95 transition text-sm flex items-center justify-center shadow-md shadow-[#7A3E1D]/20"
                            >
                                เสร็จสิ้น / ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}