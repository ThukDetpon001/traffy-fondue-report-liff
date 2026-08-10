/**
 * Traffy Fondue Report LIFF - API Services Module
 * File: src/services/api.js
 * 
 * Handles direct integration with Traffy Fondue API Gateway & Kong Services:
 * 1. fetchAgenciesByCoords(lat, lng) - Reverse Geocoding to get nearby agencies
 * 2. uploadReportImage(file) - Base64 image upload to GCS (returns photo_link)
 * 3. registerFondueUser(lineProfile) - Authenticates LINE user and gets JWT Token
 * 4. submitTraffyTicket(formData) - Complete ticket submission to Traffy Fondue
 */

// Base URLs & Endpoints
const KONG_BASE_URL   = import.meta.env.DEV ? "/api-kong"   : "https://kong.traffy.in.th";
const NEO_BASE_URL    = import.meta.env.DEV ? "/api-neo"    : "https://neo-fondue.traffy.in.th";
const TRAFFY_BASE_URL = import.meta.env.DEV ? "/api-traffy" : "https://api.traffy.in.th";

/**
 * 1. Fetch nearby responsible agencies based on latitude and longitude coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Array<{id: string|number, name: string, type?: string}>>}
 */
export async function fetchAgenciesByCoords(lat, lng) {
    if (!lat || !lng) return [];

    try {
        const url = `${KONG_BASE_URL}/fondue-reverse-geo/?action=find&latlng=${lat},${lng}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Reverse Geo API error: status ${response.status}`);
        }

        const data = await response.json();
        
        // Parse array of agency objects from API response
        const rawResults = Array.isArray(data) ? data : data.results || data.data || [];
        
        return rawResults.map((item, index) => ({
            id: String(item.fonduegroup_id || item.id || item.org_id || `agency-${index + 1}`),
            name: item.fonduegroup_name || item.name || item.org_name || item.title || `หน่วยงาน ${index + 1}`,
            type: item.fonduegroup_type_name || item.type || item.org_type || ""
        }));


    } catch (error) {
        console.error("❌ Failed to fetch agencies from Traffy Reverse Geo API:", error);
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
 * 4. Submit complete Traffy Fondue Ticket using API: https://api.traffy.in.th/issue/new-issue/v2
 * @param {Object} ticketData - { latitude, longitude, agency_id, agency_name, description, imageFile, lineProfile }
 * @returns {Promise<{success: boolean, message: string, id_msg?: number, data?: any}>}
 */
export async function submitTraffyTicket(ticketData) {
    const { latitude, longitude, agency_id, agency_name, description, imageFile, lineProfile } = ticketData;

    try {
        // Step A: Upload image to GCS if image is present
        let photoUrl = "";
        if (imageFile) {
            photoUrl = await uploadReportImage(imageFile);
        }

        // Step B: Assemble new-issue v2 Payload according to official Traffy API Spec
        const parsedOrgId = Number(agency_id);
        const payload = {
            id: lineProfile?.userId || "Uca378ac6504c504af909e43ad884fb90",
            org_id: isNaN(parsedOrgId) ? [agency_id] : [parsedOrgId],
            description: description,
            category_name_th: "อื่นๆ",
            latitude: Number(latitude),
            longitude: Number(longitude),
            platform: "line-liff"
        };


        if (agency_name) {
            payload.org_name = [agency_name];
        }

        if (photoUrl) {
            payload.photo = [photoUrl];
        }

        // Step C: POST JSON to https://api.traffy.in.th/issue/new-issue/v2
        console.log("📤 Sending Traffy Ticket Payload:", JSON.stringify(payload, null, 2));

        const response = await fetch(`${TRAFFY_BASE_URL}/issue/new-issue/v2`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const resData = await response.json().catch(() => ({}));
        console.log("📥 Traffy API Response:", resData);

        // Strictly check HTTP 200 OK AND success === true from API
        if (response.ok && resData.success === true && resData.id_msg) {
            return {
                success: true,
                message: `แจ้งเรื่องเข้าระบบ Traffy Fondue สำเร็จ! (รหัสเรื่อง #${resData.id_msg})`,
                id_msg: resData.id_msg,
                data: resData
            };
        } else {
            // Extract exact error message returned by Traffy API
            const errorMsg = resData["response-message"] || resData.message || `HTTP Error ${response.status}`;
            console.error("❌ Traffy API Error Response:", resData);
            return {
                success: false,
                message: errorMsg,
                data: resData
            };
        }
    } catch (error) {
        console.error("❌ Failed to submit ticket via new-issue/v2:", error);
        return {
            success: false,
            message: error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์",
        };
    }
}


