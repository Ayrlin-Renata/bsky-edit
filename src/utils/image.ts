export async function compressImage(file: File): Promise<{ blob: Blob, isCompressed: boolean }> {
    const MAX_SIZE = 1000000;
    if (file.size <= MAX_SIZE) return { blob: file, isCompressed: false };

    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            let quality = 0.9;
            const step = () => {
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob && blob.size > MAX_SIZE) {
                        if (quality > 0.5) {
                            quality -= 0.1;
                            step();
                        } else {
                            width *= 0.9;
                            height *= 0.9;
                            quality = 0.8;
                            step();
                        }
                    } else if (blob) {
                        resolve({ blob, isCompressed: true });
                    }
                }, 'image/jpeg', quality);
            };
            step();
        };
    });
}
