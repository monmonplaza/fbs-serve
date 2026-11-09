/**
 * @file api-service/uploads/http.ts
 * Picture uploads to the Laravel backend, which stores them on DigitalOcean Spaces. Same method names and shapes as ./mock.ts.
 */

import { http, unwrap } from "@/api-service/client";
import { uploadSpec, type UploadFolder } from "@/api-service/uploads/mock";
import { scaleImage } from "@/lib/image";

export const uploadsHttp = {
    /** Scales the picture in the browser (smaller uploads), sends it, and returns its public URL. */
    image: async (file: File, folder: UploadFolder): Promise<string> => {
        const s = uploadSpec(folder);
        const blob = await scaleImage(file, s.side, s.type);
        const form = new FormData();
        form.append("file", blob, `upload.${s.type === "image/png" ? "png" : "jpg"}`);
        form.append("folder", folder);
        return unwrap<{ url: string }>(await http.post("/uploads", form)).url;
    },
};
