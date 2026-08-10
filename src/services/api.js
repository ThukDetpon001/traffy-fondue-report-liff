/**
 * Traffy Fondue Report LIFF - API Services Module
 * File: src/services/api.js
 *
 * Handles integration with Traffy Fondue API Gateway & Kong Services:
 * 1. fetchAgenciesByCoords(lat, lng) - Reverse Geocoding to get nearby agencies
 * 2. uploadReportImage(file) - Base64 image upload to GCS (returns photo_link)
 * 3. registerFondueUser(lineProfile) - Authenticates LINE user and gets JWT Token
 * 4. buildPayload(formData) - Assembles bkk-careplan-style full JSON payload
 * 5. submitTraffyTicket(ticketData) - Complete ticket submission
 */

// Base URLs & Endpoints
const KONG_BASE_URL   = import.meta.env.DEV ? "/api-kong"   : "https://kong.traffy.in.th";
const NEO_BASE_URL    = import.meta.env.DEV ? "/api-neo"    : "https://neo-fondue.traffy.in.th";
const TRAFFY_BASE_URL = import.meta.env.DEV ? "/api-traffy" : "https://api.traffy.in.th";

// Gateway API URL (ถ้ามี Cloud Run Gateway ของตัวเอง ใส่ URL ที่นี่)
// หากไม่มี Gateway ระบบจะ Fallback ส่งตรงไปยัง Traffy API
export const GATEWAY_API_URL = import.meta.env.VITE_GATEWAY_API_URL || "";

// LIFF ID สำหรับระบุแหล่งที่มาใน Payload

// ทดสอบ
// export const LIFF_ID = "2008393134-OOPHO3rq";
// ของจริง
export const LIFF_ID = "2000158432-8dRpRkTc";
// Form metadata (bkk-careplan style)
export const FORM_META = {
    form_id: "traffy_fondue_report_liff_v1",
    form_name: "แบบฟอร์มแจ้งปัญหาสาธารณะ Traffy Fondue",
    source: "traffy_fondue_report_liff_webview",
};

/**
 * 1. Fetch nearby responsible agencies based on latitude and longitude coordinates
 * Calls POST https://api.traffy.in.th/org/responsible_org/ as specified in Traffy documentation
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Array<Object>>}
 */
export async function fetchAgenciesByCoords(lat, lng) {
    if (!lat || !lng) return [];

    try {
        const url = `${TRAFFY_BASE_URL}/org/responsible_org/`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                lat: Number(lat),
                lon: Number(lng),
                show_in_chatbot: true,
                limit: 15,
                payload: "linebot-response-org",
                privacy: "all",
                org_tags: "ALL"
            }),
        });

        if (!response.ok) {
            throw new Error(`Responsible Org API error: status ${response.status}`);
        }

        const data = await response.json();
        const rawResults = Array.isArray(data) ? data : data.results || data.data || [];

        return rawResults.map((item, index) => ({
            id: String(item.id || item.fonduegroup_id || item.org_id || `agency-${index + 1}`),
            name: item.name || item.fonduegroup_name || item.org_name || `หน่วยงาน ${index + 1}`,
            photo: item.photo || item.fonduegroup_photo || "",
            fonduegroup_status: item.fonduegroup_status || "",
            admin_staff: item.admin_staff ?? item.staff ?? 0,
            post_finish: item.post_finish ?? 0,
            post: item.post ?? 0,
            last_activity: item.last_activity || "",
            distance: item.distance || null,
            official_group: item.official_group ?? true,
            show_in_chatbot: item.show_in_chatbot ?? true,
            index: item.index || index + 1
        }));

    } catch (error) {
        console.error("❌ Failed to fetch agencies from Traffy Responsible Org API:", error);
        throw error;
    }
}

/**
 * Helper: Convert a File/Blob object to a Base64 Data URL string
 * @param {File|Blob} file
 * @returns {Promise<string>}
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
}

/**
 * 2. Upload an image file to Traffy Public Storage via File API
 * Returns photo_link URL e.g. "https://storage.googleapis.com/traffy_public_bucket/attachment/2026-08/hash.jpeg"
 * @param {File|Blob} imageFile
 * @returns {Promise<string>}
 */
export async function uploadReportImage(imageFile) {
    if (!imageFile) return null;

    try {
        const base64Data = await fileToBase64(imageFile);

        // Format folder_path to attachment/YYYY-MM
        const dateNow = new Date();
        const yearMonth = `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}`;

        const payload = {
            folder_path: `attachment/${yearMonth}`,
            image: base64Data
        };

        const response = await fetch(`${KONG_BASE_URL}/file-api/uploadfile/v1`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Image Upload API error: status ${response.status}`);
        }

        const data = await response.json();

        if (data.photo_link) {
            return data.photo_link;
        } else if (data.url || data.link) {
            return data.url || data.link;
        }

        throw new Error("No photo_link returned from upload API");
    } catch (error) {
        console.error("❌ Failed to upload image to Traffy File API:", error);
        throw error;
    }
}

/**
 * 3. Register / Authenticate LINE User into Traffy Fondue system to obtain JWT token
 * @param {Object} lineProfile - { userId, displayName }
 * @returns {Promise<{jwt?: string, user_id?: number}>}
 */
export async function registerFondueUser(lineProfile) {
    if (!lineProfile?.userId) return null;

    try {
        const payload = {
            username: lineProfile.userId,
            email: `${lineProfile.userId}@mail.com`,
            first_name: lineProfile.displayName || "LINE User",
            last_name: "@line",
            bot_id: "line-liff",
            regis_by: "line"
        };

        const response = await fetch(`${NEO_BASE_URL}/api-auth/registration/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.warn(`Fondue Registration status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("⚠️ Fondue User Registration warning:", error);
        return null;
    }
}

/**
 * 4. Build the full bkk-careplan-style JSON Payload
 * @param {Object} options
 * @returns {Object} Full payload object
 */
export function buildPayload({ latitude, longitude, agency_id, agency_name, description, attachedImages, lineProfile }) {
    const parsedOrgId = Number(agency_id);

    return {
        // ── Metadata (bkk-careplan style) ──
        request_timestamp: new Date().toISOString(),
        form_id: FORM_META.form_id,
        form_name: FORM_META.form_name,
        liff_id: LIFF_ID,
        source: FORM_META.source,

        // ── Location ──
        location: {
            latitude: Number(latitude),
            longitude: Number(longitude),
        },

        // ── Agency (Traffy org fields) ──
        org_id: isNaN(parsedOrgId) ? [agency_id] : [parsedOrgId],
        org_name: agency_name ? [agency_name] : [],

        // ── Issue Description ──
        description: description,
        platform: "line-liff",

        // ── Images (Base64 format, bkk-careplan style) ──
        images: {
            attachments: (attachedImages || []).map(img => ({
                filename: img.name,
                base64: img.url,   // Canvas-compressed Base64 Data URL
            })),
        },
        attachments_count: (attachedImages || []).length,

        // ── LINE Profile ──
        line_profile: lineProfile ? {
            user_id: lineProfile.userId,
            display_name: lineProfile.displayName,
            picture_url: lineProfile.pictureUrl || "",
        } : null,
    };
}

/**
 * 5. Submit complete Traffy Fondue Ticket
 *
 * - ถ้ามี GATEWAY_API_URL → ส่ง Full Payload (bkk-careplan style) ไปยัง Gateway
 * - ถ้าไม่มี Gateway → Fallback ส่งตรงไปยัง Traffy API new-issue/v2 (อัปโหลดรูปแยก)
 *
 * @param {Object} ticketData - { latitude, longitude, agency_id, agency_name, description, attachedImages, lineProfile }
 * @returns {Promise<{success: boolean, message: string, id_msg?: number, data?: any, payload?: object}>}
 */
export async function submitTraffyTicket(ticketData) {
    const { latitude, longitude, agency_id, agency_name, description, attachedImages, lineProfile } = ticketData;

    try {
        // ── Build bkk-careplan style payload ──
        const fullPayload = buildPayload({
            latitude, longitude, agency_id, agency_name, description, attachedImages, lineProfile
        });

        console.log("📤 Full Payload (bkk-careplan style):", JSON.stringify(fullPayload, null, 2));

        // ── Path A: ส่งผ่าน Gateway (ถ้ามี) ──
        if (GATEWAY_API_URL && GATEWAY_API_URL.trim() !== "") {
            const response = await fetch(GATEWAY_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(fullPayload),
            });

            const resData = await response.json().catch(() => ({}));
            console.log("📥 Gateway Response:", resData);

            if (response.ok) {
                return {
                    success: true,
                    message: "แจ้งเรื่องเข้าระบบสำเร็จ!",
                    id_msg: resData.id_msg || resData.message_id || null,
                    data: resData,
                    payload: fullPayload,
                };
            } else {
                return {
                    success: false,
                    message: resData.message || resData["response-message"] || `HTTP Error ${response.status}`,
                    data: resData,
                    payload: fullPayload,
                };
            }
        }

        // ── Path B: Fallback → ส่งตรงไปยัง Traffy API new-issue/v2 ──
        let photoUrl = "";
        if (attachedImages && attachedImages.length > 0 && attachedImages[0].file) {
            try {
                photoUrl = await uploadReportImage(attachedImages[0].file);
            } catch (uploadErr) {
                console.warn("⚠️ Image upload failed, continuing without photo:", uploadErr);
            }
        }

        const traffyPayload = {
            id: lineProfile?.userId || "",
            org_id: isNaN(Number(agency_id)) ? [agency_id] : [Number(agency_id)],
            description: description,
            latitude: Number(latitude),
            longitude: Number(longitude),
            platform: "line-liff",
        };
        if (agency_name) traffyPayload.org_name = [agency_name];
        if (photoUrl) traffyPayload.photo = [photoUrl];

        console.log("📤 Traffy Direct Payload (Fallback):", JSON.stringify(traffyPayload, null, 2));

        const response = await fetch(`${TRAFFY_BASE_URL}/issue/new-issue/v2`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(traffyPayload),
        });

        const resData = await response.json().catch(() => ({}));
        console.log("📥 Traffy API Response:", resData);

        if (response.ok && resData.success === true && resData.id_msg) {
            return {
                success: true,
                message: `แจ้งเรื่องเข้าระบบ Traffy Fondue สำเร็จ! (รหัสเรื่อง #${resData.id_msg})`,
                id_msg: resData.id_msg,
                data: resData,
                payload: fullPayload,
            };
        } else {
            const errorMsg = resData["response-message"] || resData.message || `HTTP Error ${response.status}`;
            console.error("❌ Traffy API Error Response:", resData);
            return {
                success: false,
                message: errorMsg,
                data: resData,
                payload: fullPayload,
            };
        }

    } catch (error) {
        console.error("❌ Failed to submit ticket:", error);
        return {
            success: false,
            message: error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์",
            payload: null,
        };
    }
}

/**
 * 6. Fetch user's most recently reported agency by dynamic LINE User ID
 * Calls GET https://kong.traffy.in.th/api-latest-reported-org/latest-reported-org/?line_user_id={lineUserId}
 * @param {string} lineUserId - Dynamic LINE User ID (NEVER hardcoded)
 * @returns {Promise<Object|null>} Returns agency object if found, or null if new user / no history
 */
export async function fetchLatestReportedAgency(lineUserId) {
    if (!lineUserId) return null;

    try {
        const url = `${KONG_BASE_URL}/api-latest-reported-org/latest-reported-org/?line_user_id=${encodeURIComponent(lineUserId)}`;
        const response = await fetch(url);

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        const rawResults = Array.isArray(data) ? data : data.results || [];

        if (!data.status || rawResults.length === 0) {
            return null;
        }

        const item = rawResults[0];
        if (!item || !item.name) return null;

        return {
            id: String(item.id || item.fonduegroup_id || item.org_id || ""),
            name: item.name || item.fonduegroup_name || item.org_name || "",
            photo: item.photo || item.fonduegroup_photo || "",
            fonduegroup_status: item.fonduegroup_status || "",
            admin_staff: item.admin_staff ?? item.staff ?? 0,
            post_finish: item.post_finish ?? 0,
            post: item.post ?? 0,
            last_activity: item.last_activity || "",
            latest_reported: true
        };
    } catch (error) {
        console.warn("⚠️ Failed to fetch latest reported agency (user may be new):", error);
        return null;
    }
}
