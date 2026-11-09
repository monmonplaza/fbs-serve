/**
 * @file api-service/uploads/mock.ts
 * Picture uploads without a backend: the picture stays in memory as a data URL. Same method names and shapes as ./http.ts.
 */

import { blobToDataUrl, scaleImage } from "@/lib/image";

/** Where a picture belongs. The backend keeps each kind in its own folder. */
export type UploadFolder = "foods" | "payments";

/** QR codes stay PNG so they scan; food photos become JPEG so they load fast on phones. */
export const uploadSpec = (folder: UploadFolder) =>
    folder === "payments" ? { side: 900, type: "image/png" as const } : { side: 1600, type: "image/jpeg" as const };

export const uploads = {
    /** Scales the picture and returns the URL to save on the record. */
    image: async (file: File, folder: UploadFolder): Promise<string> => {
        const s = uploadSpec(folder);
        return blobToDataUrl(await scaleImage(file, s.side, s.type));
    },
};
