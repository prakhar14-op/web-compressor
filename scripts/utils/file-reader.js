export class FileProcessor {
    
    static async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Error reading file"));
            reader.readAsArrayBuffer(file);
        });
    }

    static async routeDecompression(file) {
        const buffer = await this.readFile(file);
        const extension = file.name.split('.').pop().toLowerCase();

        console.log(`Routing decompression for: .${extension}`);

        switch (extension) {
            case 'txt':
            case 'csv':
                // for GZIP/DEFLATE using pako
                return { data: buffer, type: 'text', method: 'Pako' };
            case 'png':
                // for UPNG.js
                return { data: buffer, type: 'image-png', method: 'UPNG.js' };
            case 'jpg':
            case 'jpeg':
                // for jpeg-js
                return { data: buffer, type: 'image-jpg', method: 'JPEG-js' };
            case 'mp3':
            case 'wav':
                // for lamejs
                return { data: buffer, type: 'audio', method: 'LameJS' };
            case 'mp4':
                // for ffmpeg.wasm
                return { data: buffer, type: 'video', method: 'FFmpeg' };
            default:
                throw new Error("Format not supported for decompression.");
        }
    }
}