/**
 * Scales an image file down so its longest side is at most `maxSide` px, on a white background (transparent PNGs print on
 * white). PNG keeps a QR code crisp; JPEG keeps food photos small.
 */
export function scaleImage(file: File, maxSide = 900, type: "image/png" | "image/jpeg" = "image/png"): Promise<Blob> {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith("image/")) return reject(new Error("Choose an image file"));
        const url = URL.createObjectURL(file);
        const img = new Image();
        const fail = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not read the image"));
        };
        img.onerror = fail;
        img.onload = () => {
            URL.revokeObjectURL(url);
            const k = Math.min(1, maxSide / Math.max(img.width, img.height));
            const c = document.createElement("canvas");
            c.width = Math.round(img.width * k);
            c.height = Math.round(img.height * k);
            const g = c.getContext("2d");
            if (!g) return fail();
            g.fillStyle = "#fff";
            g.fillRect(0, 0, c.width, c.height);
            g.drawImage(img, 0, 0, c.width, c.height);
            c.toBlob((b) => (b ? resolve(b) : fail()), type, 0.85);
        };
        img.src = url;
    });
}

/** Reads a blob as a data URL. */
export function blobToDataUrl(b: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const rd = new FileReader();
        rd.onerror = () => reject(new Error("Could not read the image"));
        rd.onload = () => resolve(String(rd.result));
        rd.readAsDataURL(b);
    });
}

/** Reads an image file as a scaled PNG data URL. */
export const imageToDataUrl = async (file: File, maxSide = 900) => blobToDataUrl(await scaleImage(file, maxSide));
