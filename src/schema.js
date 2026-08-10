import { z } from "zod";

export const reportFormSchema = z.object({
    latitude: z.coerce.number({ invalid_type_error: "กรุณาระบุพิกัดตำแหน่ง", required_error: "กรุณาระบุพิกัดตำแหน่ง" }),
    longitude: z.coerce.number({ invalid_type_error: "กรุณาระบุพิกัดตำแหน่ง", required_error: "กรุณาระบุพิกัดตำแหน่ง" }),

    agency_id: z.preprocess(
        (val) => (val === undefined || val === null ? "" : String(val)),
        z.string().min(1, "กรุณาเลือกหน่วยงานรับผิดชอบ")
    ),

    description: z.string({ required_error: "กรุณาระบุรายละเอียดปัญหา" }).min(10, "กรุณาระบุรายละเอียดปัญหาอย่างน้อย 10 ตัวอักษร"),
    images: z
        .any()
        .refine((files) => files && files.length > 0, "กรุณาแนบรูปภาพอย่างน้อย 1 รูป"),
});