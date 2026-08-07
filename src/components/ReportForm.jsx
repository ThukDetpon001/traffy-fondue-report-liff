import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reportFormSchema } from "../schema";
import { LocationPicker } from "./LocationPicker";
import { AgencySelect } from "./AgencySelect";
import liff from "@line/liff";
import traffyLogo from "../assets/traffy.png";
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
    Sparkles
} from "lucide-react";

export default function ReportForm() {
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedAgencyObj, setSelectedAgencyObj] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [fontSize, setFontSize] = useState("sm"); // "sm" (A=16px) | "md" (A+=20px) | "lg" (A++=24px)

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
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(reportFormSchema),
    });

    const watchLat = watch("latitude");
    const watchLng = watch("longitude");
    const watchDescription = watch("description");

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
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    const handleImageFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        } else {
            setImagePreview(null);
        }
    };

    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const onSubmit = async (data) => {
        // ============================================================
        // ตรวจสอบการล็อกอิน LINE - บังคับก่อนส่งข้อมูลทุกครั้ง
        // ============================================================
        if (!liff.isLoggedIn()) {
            alert("❌ ไม่สามารถส่งแจ้งเรื่องได้\nกรุณาล็อกอินด้วยบัญชี LINE ก่อนใช้งาน");
            liff.login(); // Redirect ไปหน้า LINE Login ทันที
            return;       // หยุดการส่งข้อมูลโดยเด็ดขาด
        }

        // ดึงข้อมูล LINE Profile (ต้องได้ เพราะผ่านการตรวจล็อกอินแล้ว)
        let lineProfile;
        try {
            lineProfile = await liff.getProfile();
        } catch (liffError) {
            console.error("ดึง LINE Profile ไม่สำเร็จ:", liffError);
            alert("❌ ไม่สามารถดึงข้อมูลบัญชี LINE ได้\nกรุณาลองใหม่อีกครั้ง");
            return; // หยุดการส่งข้อมูล ถ้าดึง Profile ไม่ได้
        }

        // สร้าง FormData และแนบข้อมูลทั้งหมด รวมถึง LINE User ID (บังคับ)
        const formData = new FormData();
        formData.append("latitude", data.latitude);
        formData.append("longitude", data.longitude);
        formData.append("agency_id", data.agency_id);
        formData.append("description", data.description);
        if (data.images?.[0]) formData.append("image", data.images[0]);

        // แนบข้อมูล LINE Profile (Required - ไม่ใช่ Optional)
        formData.append("line_user_id", lineProfile.userId);
        formData.append("line_display_name", lineProfile.displayName);

        // ส่งข้อมูลไปยัง Backend
        try {
            const response = await fetch("/api/traffy/tickets", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                alert("✅ ส่งแจ้งปัญหาสำเร็จ!");
            } else {
                alert("❌ เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
            }
        } catch (error) {
            alert("❌ เกิดข้อผิดพลาดในการส่งข้อมูล");
        }
    };


    return (
        <div className="w-full max-w-md mx-auto min-h-screen sm:min-h-[90vh] flex flex-col justify-between p-4 sm:p-5 bg-white sm:rounded-3xl shadow-xl border border-amber-900/10">
            {/* Screen reader live region — announces step changes */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                ขั้นตอนที่ {currentStep} จาก {steps.length}: {steps[currentStep - 1]?.title}
            </div>

            {/* Header & Step Progress Bar */}
            <div>
                {/* Brand Title Banner */}
                <header className="flex items-center justify-between gap-2 mb-4 pb-2.5 border-b border-amber-100">
                    {/* Logo + Title */}
                    <div className="flex items-center gap-2 shrink-0">
                        <img
                            src={traffyLogo}
                            alt="โลโก้ Traffy Fondue"
                            className="w-6 h-6 rounded-lg object-cover shadow-sm border border-amber-900/10 shrink-0"
                        />
                        <span className="text-xs font-bold text-slate-800 tracking-tight whitespace-nowrap">แจ้งปัญหา Traffy Fondue</span>
                    </div>

                    {/* Font size buttons: A / A+ / A++ */}
                    <div
                        role="group"
                        aria-label="เลือกขนาดตัวอักษร"
                        className="flex items-center border border-amber-300 rounded-lg overflow-hidden shrink-0"
                    >
                        {[
                            { key: "sm",  label: "A",   aria: "เล็ก" },
                            { key: "md",  label: "A+",  aria: "กลาง" },
                            { key: "lg",  label: "A++", aria: "ใหญ่" },
                        ].map(({ key, label, aria }, i) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setFontSize(key)}
                                aria-label={`ตัวอักษร${aria}`}
                                aria-pressed={fontSize === key}
                                className={`min-w-[32px] min-h-[30px] px-2 py-1 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7A3E1D] ${
                                    i > 0 ? "border-l border-amber-300" : ""
                                } ${
                                    fontSize === key
                                        ? "bg-[#7A3E1D] text-white"
                                        : "bg-white text-[#7A3E1D] hover:bg-amber-50"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Progress Bar Track */}
                <div className="relative mb-6">
                    <div
                        role="progressbar"
                        aria-valuenow={currentStep}
                        aria-valuemin={1}
                        aria-valuemax={steps.length}
                        aria-label={`ความคืบหน้า: ขั้นตอนที่ ${currentStep} จาก ${steps.length}`}
                        className="w-full bg-amber-100/80 h-2.5 rounded-full overflow-hidden"
                    >
                        <div
                            className="bg-[#7A3E1D] h-full motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out"
                            style={{ width: `${(currentStep / steps.length) * 100}%` }}
                        />
                    </div>

                    {/* Step Indicators */}
                    <nav aria-label="ขั้นตอนการกรอกแบบฟอร์ม" className="flex justify-between mt-3 px-1">
                        {steps.map((step) => {
                            const IconComponent = step.icon;
                            const isActive = currentStep === step.id;
                            const isDone = currentStep > step.id;

                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={async () => {
                                        if (step.id < currentStep) {
                                            setCurrentStep(step.id);
                                        }
                                    }}
                                    disabled={step.id > currentStep}
                                    aria-current={isActive ? "step" : undefined}
                                    aria-label={`${step.title} — ${isDone ? "เสร็จสิ้นแล้ว" : isActive ? "ขั้นตอนปัจจุบัน" : "ยังไม่ถึงขั้นตอนนี้"}`}
                                    className={`min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 motion-safe:transition-all rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3E1D] focus-visible:ring-offset-2 ${
                                        isActive
                                            ? "text-[#7A3E1D] font-bold"
                                            : isDone
                                            ? "text-amber-900 font-medium"
                                            : "text-slate-500 opacity-60"
                                    }`}
                                >
                                    <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shadow-sm motion-safe:transition-all ${
                                            isActive
                                                ? "bg-[#7A3E1D] text-white ring-4 ring-[#7A3E1D]/20"
                                                : isDone
                                                ? "bg-amber-800 text-white"
                                                : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                        <IconComponent className="w-4 h-4" aria-hidden="true" />
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
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                            <div role="note" className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-start gap-2.5 text-amber-950 text-sm text-left leading-relaxed">
                                <MapPin className="w-4 h-4 text-[#7A3E1D] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>ขั้นตอนที่ 1: กรุณากดดึงตำแหน่ง GPS หรือเลื่อนปักหมุดบนแผนที่ เพื่อระบุตำแหน่งปัญหา</span>
                            </div>

                            <div className="text-left">
                                <LocationPicker
                                    onLocationSelect={(lat, lng) => {
                                        setValue("latitude", lat, { shouldValidate: true });
                                        setValue("longitude", lng, { shouldValidate: true });
                                    }}
                                />
                                {(errors.latitude || errors.longitude) && (
                                    <p id="location-error" role="alert" className="text-red-700 text-sm mt-2 flex items-center gap-1 font-semibold">
                                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                                        {errors.latitude?.message || errors.longitude?.message}
                                    </p>
                                )}
                            </div>

                            {watchLat && watchLng && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-slate-800 flex justify-between items-center text-left">
                                    <span className="font-semibold text-slate-700">พิกัดหมุดที่ระบุ:</span>
                                    <span className="font-mono text-[#5C2E10] font-bold bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-xs">
                                        {watchLat.toFixed(5)}, {watchLng.toFixed(5)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: Agency Select */}
                    {currentStep === 2 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
                            <div role="note" className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-start gap-2.5 text-amber-950 text-sm text-left leading-relaxed">
                                <Building2 className="w-4 h-4 text-[#7A3E1D] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>ขั้นตอนที่ 2: เลือกหน่วยงานรับผิดชอบในพื้นที่สำหรับปัญหานี้</span>
                            </div>

                            <div className="text-left">
                                <label id="agency-label" className="block text-sm font-bold mb-2 text-slate-900 text-left">
                                    หน่วยงานรับผิดชอบ <span aria-hidden="true" className="text-red-600">*</span>
                                    <span className="sr-only">(จำเป็นต้องกรอก)</span>
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
                                            aria-required="true"
                                        />
                                    )}
                                />
                                {errors.agency_id && (
                                    <p id="agency-error" role="alert" className="text-red-700 text-sm mt-2 flex items-center gap-1 font-semibold text-left">
                                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                                        {errors.agency_id.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Description & Image Upload */}
                    {currentStep === 3 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
                            <div role="note" className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-start gap-2.5 text-amber-950 text-sm text-left leading-relaxed">
                                <FileText className="w-4 h-4 text-[#7A3E1D] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>ขั้นตอนที่ 3: อธิบายรายละเอียดปัญหาและถ่าย/แนบรูปถ่ายประกอบ</span>
                            </div>

                            {/* Description field */}
                            <div className="text-left">
                                <label htmlFor="description" className="block text-sm font-bold mb-1.5 text-slate-900 text-left">
                                    รายละเอียดปัญหา <span aria-hidden="true" className="text-red-600">*</span>
                                    <span className="sr-only">(จำเป็นต้องกรอก)</span>
                                </label>
                                <textarea
                                    id="description"
                                    {...register("description")}
                                    aria-required="true"
                                    aria-invalid={!!errors.description}
                                    aria-describedby={errors.description ? "description-error" : "description-hint"}
                                    className="w-full border-2 border-slate-300 focus:border-[#7A3E1D] rounded-xl p-3 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3E1D] focus-visible:ring-offset-1 text-slate-900 placeholder:text-slate-500 transition"
                                    rows={4}
                                    placeholder="อธิบายรายละเอียด เช่น ท่อประปาแตกบริเวณหน้าอาคาร..."
                                />
                                <p id="description-hint" className="text-sm text-slate-600 mt-1">กรุณาระบุอย่างน้อย 10 ตัวอักษร</p>
                                {errors.description && (
                                    <p id="description-error" role="alert" className="text-red-700 text-sm mt-1 flex items-center gap-1 font-semibold text-left">
                                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                                        {errors.description.message}
                                    </p>
                                )}
                            </div>

                            {/* Image Upload field */}
                            <div className="text-left">
                                <label htmlFor="images" className="block text-sm font-bold mb-1.5 text-slate-900 text-left">
                                    รูปภาพประกอบ <span aria-hidden="true" className="text-red-600">*</span>
                                    <span className="sr-only">(จำเป็น อย่างน้อย 1 รูป)</span>
                                </label>
                                <div
                                    className="border-2 border-dashed border-amber-700/40 hover:border-[#7A3E1D] rounded-2xl p-5 text-center bg-amber-50/40 hover:bg-amber-50/70 transition relative cursor-pointer focus-within:ring-2 focus-within:ring-[#7A3E1D] focus-within:ring-offset-1 focus-within:border-[#7A3E1D]"
                                >
                                    <input
                                        id="images"
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        aria-required="true"
                                        aria-invalid={!!errors.images}
                                        aria-describedby={errors.images ? "images-error" : "images-hint"}
                                        {...register("images", {
                                            onChange: handleImageFileChange,
                                        })}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center gap-2" aria-hidden="true">
                                        <div className="w-12 h-12 rounded-full bg-[#7A3E1D]/10 flex items-center justify-center text-[#7A3E1D]">
                                            <Camera className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-800">
                                            กดที่นี่เพื่อถ่ายภาพ หรือ เลือกรูปจากอัลบั้ม
                                        </span>
                                        <span className="text-xs text-slate-600">รองรับไฟล์ภาพทุกประเภท (JPG, PNG)</span>
                                    </div>
                                </div>
                                <p id="images-hint" className="text-sm text-slate-600 mt-1">แนบรูปภาพอย่างน้อย 1 รูปเพื่อประกอบการแจ้งปัญหา</p>

                                {imagePreview && (
                                    <div className="mt-3 relative rounded-2xl overflow-hidden border-2 border-amber-900/10 max-h-48 flex justify-center bg-slate-950/5">
                                        <img src={imagePreview} alt="ตัวอย่างรูปภาพที่เลือก" className="object-contain max-h-48 w-full" />
                                    </div>
                                )}

                                {errors.images && (
                                    <p id="images-error" role="alert" className="text-red-700 text-sm mt-1 flex items-center gap-1 font-semibold text-left">
                                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                                        {errors.images.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Review & Summary */}
                    {currentStep === 4 && (
                        <section aria-label="สรุปข้อมูลก่อนส่งแจ้งเรื่อง" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 text-left shadow-xs">
                            <div role="note" className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl flex items-start gap-2.5 text-amber-950 text-sm text-left leading-relaxed">
                                <Sparkles className="w-4 h-4 text-[#7A3E1D] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>ขั้นตอนสุดท้าย: ตรวจสอบความถูกต้องของข้อมูลก่อนกดส่งแจ้งเรื่อง</span>
                            </div>

                            <dl className="space-y-3">
                                {/* Item 1: พิกัดเกิดเหตุ */}
                                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1.5">
                                    <dt className="text-xs font-bold text-slate-600 block">1. พิกัดเกิดเหตุ</dt>
                                    <dd className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-slate-200">
                                        <MapPin className="w-4 h-4 text-[#7A3E1D] shrink-0" aria-hidden="true" />
                                        <span className="font-mono text-sm font-bold text-slate-900">
                                            {watchLat?.toFixed(5)}, {watchLng?.toFixed(5)}
                                        </span>
                                    </dd>
                                </div>

                                {/* Item 2: หน่วยงานรับผิดชอบ */}
                                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1.5">
                                    <dt className="text-xs font-bold text-slate-600 block">2. หน่วยงานรับผิดชอบ</dt>
                                    <dd className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-xl">
                                        <Building2 className="w-4 h-4 text-[#7A3E1D] shrink-0" aria-hidden="true" />
                                        <span className="text-sm font-bold text-[#5C2E10]">
                                            {selectedAgencyObj ? selectedAgencyObj.name : "ไม่ได้ระบุ"}
                                        </span>
                                    </dd>
                                </div>

                                {/* Item 3: รายละเอียดปัญหา */}
                                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1.5">
                                    <dt className="text-xs font-bold text-slate-600 block">3. รายละเอียดปัญหา</dt>
                                    <dd className="bg-white p-3 rounded-xl border border-slate-200 border-l-4 border-l-[#7A3E1D]">
                                        <p className="text-sm font-medium text-slate-900 leading-relaxed whitespace-pre-wrap text-left">
                                            {watchDescription}
                                        </p>
                                    </dd>
                                </div>

                                {/* Item 4: รูปภาพแนบ */}
                                {imagePreview && (
                                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1.5">
                                        <dt className="text-xs font-bold text-slate-600 block">4. รูปภาพแนบ</dt>
                                        <dd className="rounded-xl overflow-hidden border-2 border-slate-200 max-h-44 flex justify-center bg-black/5">
                                            <img src={imagePreview} alt="ภาพที่แนบมาพร้อมการแจ้งปัญหา" className="object-contain max-h-44 w-full" />
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </section>
                    )}
                </form>
            </div>

            {/* Bottom Sticky Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 mt-4" role="group" aria-label="การนำทางขั้นตอน">
                {currentStep > 1 && (
                    <button
                        type="button"
                        onClick={handleBack}
                        aria-label={`ย้อนกลับไปขั้นตอนที่ ${currentStep - 1}: ${steps[currentStep - 2]?.title}`}
                        className="flex-1 min-h-[48px] py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl motion-safe:active:scale-95 transition flex items-center justify-center gap-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                    >
                        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                        ย้อนกลับ
                    </button>
                )}

                {currentStep < 4 ? (
                    <button
                        type="button"
                        onClick={handleNext}
                        aria-label={`ถัดไปยังขั้นตอนที่ ${currentStep + 1}: ${steps[currentStep]?.title}`}
                        className="flex-1 min-h-[48px] py-3.5 bg-[#7A3E1D] hover:bg-[#5C2E10] text-white font-bold rounded-xl motion-safe:active:scale-95 transition flex items-center justify-center gap-1 text-sm shadow-md shadow-[#7A3E1D]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3E1D] focus-visible:ring-offset-2"
                    >
                        ถัดไป
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                ) : (
                    <button
                        type="submit"
                        form="traffy-report-form"
                        disabled={isSubmitting}
                        aria-disabled={isSubmitting}
                        aria-label={isSubmitting ? "กำลังส่งข้อมูล กรุณารอสักครู่" : "ยืนยันและส่งแจ้งปัญหา Traffy Fondue"}
                        className="flex-1 min-h-[48px] py-3.5 bg-[#7A3E1D] hover:bg-[#5C2E10] text-white font-bold rounded-xl motion-safe:active:scale-95 transition flex items-center justify-center gap-2 text-sm shadow-md shadow-[#7A3E1D]/30 disabled:bg-slate-400 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3E1D] focus-visible:ring-offset-2"
                    >
                        <Send className="w-4 h-4" aria-hidden="true" />
                        {isSubmitting ? "กำลังส่งข้อมูล..." : "ส่งแจ้งเรื่อง"}
                    </button>
                )}
            </div>
        </div>
    );
}