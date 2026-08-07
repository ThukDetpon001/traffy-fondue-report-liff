import { z } from "zod";

export const reportFormSchema = z.object({
    latitude: z.number({ required_error: "กรุณาระบุพิกัดตำแหน่ง" }),
    longitude: z.number({ required_error: "กรุณาระบุพิกัดตำแหน่ง" }),
    agency_id: z.string().min(1, "กรุณาเลือกหน่วยงานรับผิดชอบ"),
    description: z.string().min(10, "กรุณาระบุรายละเอียดปัญหาอย่างน้อย 10 ตัวอักษร"),
    images: z
        .any()
        .refine((files) => files && files.length > 0, "กรุณาแนบรูปภาพอย่างน้อย 1 รูป"),
});