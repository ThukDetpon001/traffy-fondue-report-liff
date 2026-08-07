# 🍱 Traffy Fondue Report LIFF

แอปพลิเคชัน **LINE LIFF** สำหรับแจ้งปัญหาสาธารณะเข้าระบบ [Traffy Fondue](https://citydata.traffy.in.th/) — สร้างด้วย React + Vite รองรับ Mobile-First และผ่านมาตรฐาน WCAG AAA Accessibility

---

## 📋 สารบัญ

- [ภาพรวมโปรเจกต์](#ภาพรวมโปรเจกต์)
- [Tech Stack](#tech-stack)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [การติดตั้งและรันโปรเจกต์](#การติดตั้งและรันโปรเจกต์)
- [การตั้งค่า LIFF ID](#การตั้งค่า-liff-id)
- [การตั้งค่า Mock Data / API จริง](#การตั้งค่า-mock-data--api-จริง)
- [ขั้นตอนการทำงานของผู้ใช้](#ขั้นตอนการทำงานของผู้ใช้)
- [Accessibility (WCAG AAA)](#accessibility-wcag-aaa)
- [Roadmap](#roadmap)

---

## ภาพรวมโปรเจกต์

**Traffy Fondue Report LIFF** คือ Web Application น้ำหนักเบา ประสิทธิภาพสูง ที่ทำงานภายใน LINE LIFF (LINE Front-end Framework) เพื่อให้ประชาชนสามารถแจ้งปัญหาสาธารณะเข้าระบบ Traffy Fondue ได้สะดวก รวดเร็ว ผ่าน LINE App ได้ทันที

**Core Workflow:**
1. ผู้ใช้เปิดแอปผ่าน LINE Rich Menu (บังคับให้ล็อกอินด้วยบัญชี LINE ก่อนใช้งาน)
2. ผู้ใช้ระบุตำแหน่งเกิดเหตุผ่าน GPS หรือปักหมุดบนแผนที่ Leaflet แบบ Interactive
3. ระบบดึงรายชื่อหน่วยงานรับผิดชอบในพื้นที่ผ่าน API ตามพิกัด Lat/Lng ที่เลือก
4. ผู้ใช้ค้นหาและเลือกหน่วยงานจาก Searchable List
5. ผู้ใช้กรอกรายละเอียดปัญหาและถ่าย/แนบรูปภาพประกอบ
6. ผู้ใช้ตรวจสอบข้อมูลสรุปก่อนกดส่ง ระบบดึง LINE Profile (userId, displayName) และส่ง Multipart FormData ไปยัง Traffy Fondue Backend API

---

## Tech Stack

| ส่วนประกอบ | เทคโนโลยี |
|---|---|
| **Framework & Build** | React 19 + Vite 8 (Pure JavaScript / JSX) |
| **Form Engine** | `react-hook-form` (Uncontrolled, Mobile-optimized) |
| **Validation** | `zod` + `@hookform/resolvers/zod` |
| **UI & Styling** | Shadcn UI + Tailwind CSS v4 |
| **Icons** | `lucide-react` |
| **Font** | Geist Variable (`@fontsource-variable/geist`) |
| **Interactive Map** | `leaflet` + `react-leaflet` (OpenStreetMap — ฟรี ไม่มี API Key) |
| **LINE Integration** | `@line/liff` SDK v2 |
| **Linter** | `oxlint` |

---

## โครงสร้างโปรเจกต์

```
traffy-fondue-report-liff/
├── src/
│   ├── assets/
│   │   └── traffy.png             # โลโก้ Traffy Fondue
│   ├── components/
│   │   ├── ui/                    # Shadcn UI Base Components
│   │   ├── LocationPicker.jsx     # แผนที่ Leaflet + HTML5 GPS Geolocation
│   │   ├── AgencySelect.jsx       # Inline Searchable Agency List (Mock/API)
│   │   └── ReportForm.jsx         # Main Form — Multi-Step Wizard (4 ขั้นตอน)
│   ├── schema.js                  # Zod Validation Schema
│   ├── App.jsx                    # Root Component
│   ├── main.jsx                   # Entry Point — liff.init() + Login Guard
│   └── index.css                  # Tailwind CSS + Custom Tokens
├── vite.config.js                 # Vite Config (allowedHosts: true สำหรับ ngrok)
└── package.json
```

---

## การติดตั้งและรันโปรเจกต์

### Prerequisites
- Node.js >= 18
- npm >= 9

### ติดตั้ง Dependencies

```bash
npm install
```

### รันโหมด Development

```bash
npm run dev
```

เว็บจะเปิดที่ `http://localhost:5173`

### รันผ่าน ngrok (สำหรับทดสอบบน LINE LIFF)

```bash
# Terminal 1 — รัน Vite Dev Server
npm run dev

# Terminal 2 — เปิด ngrok tunnel
ngrok http 5173
```

คัดลอก HTTPS URL จาก ngrok (เช่น `https://xxxx.ngrok-free.app`) ไปตั้งเป็น LIFF Endpoint URL ใน LINE Developers Console

### Build สำหรับ Production

```bash
npm run build
```

---

## การตั้งค่า LIFF ID

เปิดไฟล์ [`src/main.jsx`](./src/main.jsx) แล้วเปลี่ยน `liffId` เป็นค่าที่ได้จาก [LINE Developers Console](https://developers.line.biz/):

```js
liff.init({
  liffId: "YOUR_LIFF_ID_HERE",  // ← ใส่ LIFF ID ของคุณ
  withLoginOnExternalBrowser: true,
})
```

> **หมายเหตุ:** `withLoginOnExternalBrowser: true` บังคับให้ผู้ใช้ต้องล็อกอิน LINE ก่อนใช้งานเสมอ — ระบบจะไม่อนุญาตให้ส่งแจ้งเรื่องหากไม่มีข้อมูลบัญชี LINE

---

## การตั้งค่า Mock Data / API จริง

เปิดไฟล์ [`src/components/AgencySelect.jsx`](./src/components/AgencySelect.jsx):

```js
// เปลี่ยน Flag นี้เพื่อสลับระหว่าง Mock Data และ API จริง
const USE_MOCK_DATA = true;  // true = Mock | false = API จริง
```

- **`true`** — แสดงรายชื่อหน่วยงาน A ถึง Z (26 รายการ) สำหรับการพัฒนา/ทดสอบ
- **`false`** — ยิง API จริงไปยัง `/api/agencies?lat={lat}&lng={lng}` ตามพิกัดที่ผู้ใช้เลือก

### API Response Format (ที่คาดหวัง)

```json
[
  { "id": "agency-uuid-xxx", "name": "ชื่อหน่วยงาน" },
  ...
]
```

---

## ขั้นตอนการทำงานของผู้ใช้

แบบฟอร์มถูกออกแบบเป็น **Multi-Step Wizard 4 ขั้นตอน** พร้อม Progress Bar และ Validation ต่อขั้นตอน:

| ขั้นตอน | หัวข้อ | รายละเอียด |
|---|---|---|
| **1** | 📍 ตำแหน่ง | ดึงพิกัด GPS หรือปักหมุดบนแผนที่ OpenStreetMap |
| **2** | 🏛️ หน่วยงาน | ค้นหาและเลือกหน่วยงานรับผิดชอบในพื้นที่ |
| **3** | 📝 รายละเอียด | กรอกข้อความปัญหา + ถ่าย/แนบรูปภาพ (พร้อม Preview) |
| **4** | ✅ สรุปผล | ตรวจสอบข้อมูลทั้งหมด + กดส่งแจ้งเรื่อง |

**Validation Rules (Zod Schema):**
- `latitude` / `longitude` — Required Number (ต้องปักหมุดก่อน)
- `agency_id` — Required String (ต้องเลือกหน่วยงาน)
- `description` — String ขั้นต่ำ 10 ตัวอักษร
- `images` — ต้องแนบรูปภาพอย่างน้อย 1 รูป

---

## Accessibility (WCAG AAA)

โปรเจกต์นี้ผ่านมาตรฐาน WCAG 2.1 Level AAA ในทุกด้านดังต่อไปนี้:

| หัวข้อ | การดำเนินการ |
|---|---|
| **Semantic HTML** | ใช้ `<h1>`, `<header>`, `<nav>`, `<section>`, `<dl>/<dt>/<dd>` อย่างถูกต้อง |
| **ARIA Roles** | `role="progressbar"`, `role="alert"`, `role="note"`, `role="group"` |
| **ARIA Attributes** | `aria-label`, `aria-current="step"`, `aria-live="polite"`, `aria-valuenow/min/max`, `aria-invalid`, `aria-required`, `aria-describedby` |
| **Form Labels** | ทุก input/textarea เชื่อมกับ `<label>` ผ่าน `htmlFor`/`id` |
| **Error Messages** | `role="alert"` + `aria-describedby` ชี้ไป error element ทุกฟิลด์ |
| **Decorative Icons** | `aria-hidden="true"` ทุก icon ที่ไม่มีความหมายเชิงข้อมูล |
| **Touch Targets** | ปุ่มทุกปุ่ม `min-height: 48px` ≥ มาตรฐาน WCAG 2.5.5 (44×44px) |
| **Focus Visible** | `focus-visible:ring-2` + `focus-visible:ring-offset-2` ทุก interactive element |
| **Reduced Motion** | `motion-safe:` utilities — animations ปิดอัตโนมัติหากผู้ใช้เปิด prefers-reduced-motion |
| **Color Contrast** | Text contrast ratio ≥ 7:1 (AAA), Error text `text-red-700` บนพื้นขาว |

---

## Roadmap

- [ ] **Dynamic Question Renderer** — JSON Schema-driven คำถามเพิ่มเติมตามประเภทหน่วยงาน
- [ ] **Ticket Status Tracking** — หน้าตรวจสอบสถานะแจ้งเรื่องจากเลข Ticket ID
- [ ] **Offline Queue & Retry** — บันทึก Draft ใน IndexedDB และ Auto-retry เมื่อสัญญาณกลับมา
- [ ] **LINE OA Notification** — แจ้งเตือนสถานะแจ้งเรื่องผ่าน LINE Messaging API
- [ ] **Dark Mode Support** — รองรับ `prefers-color-scheme: dark`

---

## License

MIT License — สำหรับการพัฒนาต่อยอดระบบ Traffy Fondue
