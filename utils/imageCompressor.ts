export interface CompressedImageResult {
    dataUrl: string;
    originalBytes: number;
    compressedBytes: number;
    width: number;
    height: number;
    mimeType: string;
}

export interface CompressImageOptions {
    /** Target max width/height in pixels (default 200 for avatars) */
    maxDimension?: number;
    /** Target max data URL payload in bytes (default 22 KB — tiny for Firestore) */
    maxBytes?: number;
    /** Center-crop to a 1:1 square (default true for avatars) */
    squareCrop?: boolean;
}

/**
 * Formats a byte count into a human-readable string (e.g. "1.4 MB" or "8.2 KB").
 */
export const formatBytes = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not read the selected image file.'));
        };
        img.src = objectUrl;
    });
};

const supportsWebpEncoding = (): boolean => {
    try {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 2;
        testCanvas.height = 2;
        return testCanvas.toDataURL('image/webp', 0.5).startsWith('data:image/webp');
    } catch {
        return false;
    }
};

/**
 * Compresses an uploaded image file entirely in the browser into a very small
 * Base64 Data URL (WebP or JPEG) safe for storing directly in Firebase Firestore.
 */
export const compressImageToDataUrl = async (
    file: File,
    options: CompressImageOptions = {}
): Promise<CompressedImageResult> => {
    if (!file || !file.type.startsWith('image/')) {
        throw new Error('Please choose a valid image file (JPG, PNG, or WebP).');
    }

    const {
        maxDimension = 200,
        maxBytes = 22 * 1024, // ~22 KB max base64 payload (~16 KB binary)
        squareCrop = true,
    } = options;

    const img = await loadImageFromFile(file);
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;

    if (!srcW || !srcH) {
        throw new Error('Image dimensions could not be determined.');
    }

    const mimeType = supportsWebpEncoding() ? 'image/webp' : 'image/jpeg';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Browser canvas is unavailable for image compression.');
    }

    // Crop coordinates
    let sx = 0;
    let sy = 0;
    let sWidth = srcW;
    let sHeight = srcH;

    if (squareCrop) {
        const side = Math.min(srcW, srcH);
        sx = Math.floor((srcW - side) / 2);
        sy = Math.floor((srcH - side) / 2);
        sWidth = side;
        sHeight = side;
    }

    // Progressively try target dimensions and quality steps until under maxBytes
    const dimensionSteps = [maxDimension, Math.round(maxDimension * 0.8), Math.round(maxDimension * 0.64), 96];
    const qualitySteps = [0.72, 0.58, 0.45, 0.34, 0.25];

    let bestDataUrl = '';
    let bestWidth = maxDimension;
    let bestHeight = maxDimension;

    for (const dim of dimensionSteps) {
        let targetW: number;
        let targetH: number;

        if (squareCrop) {
            targetW = Math.min(dim, sWidth);
            targetH = targetW;
        } else {
            const scale = Math.min(1, dim / Math.max(sWidth, sHeight));
            targetW = Math.max(1, Math.round(sWidth * scale));
            targetH = Math.max(1, Math.round(sHeight * scale));
        }

        canvas.width = targetW;
        canvas.height = targetH;
        ctx.clearRect(0, 0, targetW, targetH);
        // Fill dark backdrop in case transparent PNG is converted to JPEG
        if (mimeType === 'image/jpeg') {
            ctx.fillStyle = '#111114';
            ctx.fillRect(0, 0, targetW, targetH);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);

        for (const quality of qualitySteps) {
            const dataUrl = canvas.toDataURL(mimeType, quality);
            bestDataUrl = dataUrl;
            bestWidth = targetW;
            bestHeight = targetH;

            if (dataUrl.length <= maxBytes) {
                return {
                    dataUrl,
                    originalBytes: file.size,
                    compressedBytes: Math.round((dataUrl.length * 3) / 4),
                    width: targetW,
                    height: targetH,
                    mimeType,
                };
            }
        }
    }

    return {
        dataUrl: bestDataUrl,
        originalBytes: file.size,
        compressedBytes: Math.round((bestDataUrl.length * 3) / 4),
        width: bestWidth,
        height: bestHeight,
        mimeType,
    };
};
