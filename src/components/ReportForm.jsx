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
        watch,
        control,
        trigger,
        reset,
        formState: { errors, isSubmitting },
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
            alert(err.message || "เกิดข้อผิดพลาดในการบีบอัดรูปภาพ");
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
    const onSubmit = async (data) => {
        if (!liff.isLoggedIn()) {
            alert("❌ ไม่สามารถส่งแจ้งเรื่องได้\nกรุณาล็อกอินด้วยบัญชี LINE ก่อนใช้งาน");
            liff.login();
            return;
        }

        let lineProfile;
        try {
            lineProfile = await liff.getProfile();
        } catch (liffError) {
            console.error("ดึง LINE Profile ไม่สำเร็จ:", liffError);
            alert("❌ ไม่สามารถดึงข้อมูลบัญชี LINE ได้\nกรุณาลองใหม่อีกครั้ง");
            return;
        }

        try {
            const firstImageFile = attachedImages[0]?.file || (data.images?.[0] instanceof File ? data.images[0] : null);

            const result = await submitTraffyTicket({
                latitude: data.latitude,
                longitude: data.longitude,
                agency_id: data.agency_id,
                agency_name: selectedAgencyObj?.name || "",
                description: data.description,
                imageFile: firstImageFile,
                lineProfile: lineProfile,
            });

            if (result.success) {
                // Clear LocalStorage draft on successful submission
                try {
                    localStorage.removeItem(DRAFT_KEY);
                } catch (e) {}

                alert(`✅ ${result.message || "แจ้งเรื่องเข้าระบบ Traffy Fondue สำเร็จ!"}`);
                
                // Try closing LIFF window if open in LINE
                if (liff.isInClient && liff.isInClient()) {
                    liff.closeWindow();
                } else {
                    reset();
                    setAttachedImages([]);
                    setCurrentStep(1);
                }
            } else {
                alert(`❌ ไม่สามารถส่งแจ้งเรื่องได้: ${result.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์"}`);
            }
        } catch (error) {
            console.error("❌ Submit ticket error:", error);
            alert(`❌ เกิดข้อผิดพลาดในการส่งข้อมูล: ${error?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"}`);
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
                <form id="traffy-report-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

                            {/* Image Upload field with Canvas Compression */}
                            <div className="text-left">
                                <label htmlFor="images" className="block text-sm font-bold mb-1.5 text-slate-900 text-left">
                                    รูปภาพประกอบ <span aria-hidden="true" className="text-red-600">*</span>
                                </label>
                                <div className="border-2 border-dashed border-emerald-700/50 hover:border-[#7A3E1D] rounded-2xl p-5 text-center bg-emerald-50/40 hover:bg-emerald-50/70 transition relative cursor-pointer">
                                    <input
                                        id="images"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        capture="environment"
                                        onChange={handleImageUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center gap-2" aria-hidden="true">
                                        {compressingImage ? (
                                            <Loader2 className="w-7 h-7 text-[#7A3E1D] animate-spin" />
                                        ) : (
                                            <div className="w-11 h-11 rounded-full bg-[#7A3E1D]/10 flex items-center justify-center text-[#7A3E1D]">
                                                <Camera className="w-5 h-5" />
                                            </div>
                                        )}
                                        <span className="text-xs sm:text-sm font-bold text-slate-800">
                                            {compressingImage ? "กำลังบีบอัดภาพถ่าย..." : "กดที่นี่เพื่อถ่ายภาพหรือเลือกไฟล์รูปภาพ"}
                                        </span>
                                        <span className="text-xs text-slate-500">รองรับไฟล์รูปภาพ JPG, PNG (ย่อขนาดภาพอัตโนมัติ)</span>
                                    </div>
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
                        <section aria-label="สรุปข้อมูลก่อนส่งแจ้งเรื่อง" className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-4 text-left shadow-xs">
                            <div role="note" className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-start gap-2.5 text-amber-950 text-xs sm:text-sm text-left leading-relaxed">
                                <Sparkles className="w-4 h-4 text-[#7A3E1D] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>ขั้นตอนสุดท้าย: กรุณาตรวจสอบความถูกต้อง แล้วกดปุ่ม "ส่งแจ้งเรื่อง" ด้านล่าง</span>
                            </div>

                            <dl className="space-y-3">
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
                        type="submit"
                        form="traffy-report-form"
                        disabled={isSubmitting}
                        className="flex-1 min-h-[48px] py-3.5 bg-[#0d5c3a] hover:bg-[#0a472d] text-white font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-2 text-sm shadow-md shadow-[#0d5c3a]/30 disabled:opacity-60"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>กำลังส่งข้อมูลเรื่องแจ้ง...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                <span>ยืนยันและส่งเรื่องแจ้งปัญหา 🚀</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}