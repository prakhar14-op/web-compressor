import { getCompressionRatio, getSpaceSavings, formatBytes } from '../../utils/metrics.js';

let _ffmpegInstance = null;
let _ffmpegLoading = false;

async function getFFmpeg() {
    if (_ffmpegInstance && _ffmpegInstance.isLoaded()) return _ffmpegInstance;
    if (_ffmpegLoading) throw new Error("FFmpeg is already loading, please wait.");
    
    _ffmpegLoading = true;
    try {
        const FFmpegLib = window.FFmpeg || window.FFmpegWASM;
        if (!FFmpegLib) throw new Error('ffmpeg.wasm not found. Ensure lib/ffmpeg.min.js is loaded.');

        const createFFmpeg = FFmpegLib.createFFmpeg || FFmpegLib.FFmpeg;
        _ffmpegInstance = createFFmpeg({
            corePath: chrome.runtime.getURL('lib/ffmpeg-core.js'),
            log: false,
        });

        await _ffmpegInstance.load();
        _ffmpegLoading = false;
        return _ffmpegInstance;
    } catch (err) {
        _ffmpegLoading = false;
        throw err;
    }
}

function getFetchFile() {
    const ff = window.FFmpeg || window.FFmpegWASM || {};
    return ff.fetchFile || window.fetchFile;
}

function parsePSNRFromLog(logText) {
    const match = logText.match(/average[:\s]+([\d.]+(?:e[+-]?\d+)?)/i);
    return match ? parseFloat(match[1]) : null;
}

async function withLogCapture(ffmpeg, fn) {
    const lines = [];
    if (typeof ffmpeg.setLogger === 'function') {
        ffmpeg.setLogger(({ message }) => lines.push(message));
    }
    await fn();
    if (typeof ffmpeg.setLogger === 'function') ffmpeg.setLogger(() => { });
    return lines.join('\n');
}

export async function compressMP4(file) {
    const crf = 28; 
    const ffmpeg = await getFFmpeg();
    const fetchFile = getFetchFile();

    const inputName = 'input.mp4';
    const outputName = 'output.mp4';
    const psnrLog = 'psnr_stats.log';

    // Remove the old fetchFile line:
// ffmpeg.FS('writeFile', inputName, await fetchFile(file));

// Add this instead: It reads the file natively and forces it into the WebAssembly filesystem
const arrayBuffer = await file.arrayBuffer();
ffmpeg.FS('writeFile', inputName, new Uint8Array(arrayBuffer));

    await ffmpeg.run('-i', inputName, '-c:v', 'libx264', '-crf', String(crf), '-preset', 'ultrafast', '-c:a', 'aac', '-b:a', '128k', '-y', outputName);

    let psnr = null;
    let logText = '';

    try {
        logText = await withLogCapture(ffmpeg, async () => {
            await ffmpeg.run('-i', outputName, '-i', inputName, '-lavfi', `[0:v][1:v]psnr=stats_file=${psnrLog}`, '-f', 'null', '-');
        });
        try {
            const statsData = ffmpeg.FS('readFile', psnrLog);
            psnr = parsePSNRFromLog(new TextDecoder().decode(statsData));
        } catch (_) {
            psnr = parsePSNRFromLog(logText);
        }
    } catch (psnrErr) {
        console.warn('VideoMp4Compressor: PSNR measurement failed.');
    }

    const compressedData = ffmpeg.FS('readFile', outputName);
    const blob = new Blob([compressedData], { type: 'video/mp4' });

    [inputName, outputName, psnrLog].forEach(f => { try { ffmpeg.FS('unlink', f); } catch (_) { } });

    return {
        blob: blob,
        psnr: psnr !== null ? parseFloat(psnr.toFixed(2)) : null,
        metrics: {
            originalSize: formatBytes(file.size),
            compressedSize: formatBytes(blob.size),
            ratio: getCompressionRatio(file.size, blob.size),
            savings: getSpaceSavings(file.size, blob.size)
        }
    };
}

export async function decompressMP4(file) {
    const ffmpeg = await getFFmpeg();
    const fetchFile = getFetchFile();
    const inputName = 'decomp_input.mp4';
    const outputName = 'decomp_output.mp4';

    // Remove the old fetchFile line:
// ffmpeg.FS('writeFile', inputName, await fetchFile(file));

// Add this instead: It reads the file natively and forces it into the WebAssembly filesystem
const arrayBuffer = await file.arrayBuffer();
ffmpeg.FS('writeFile', inputName, new Uint8Array(arrayBuffer));
    await ffmpeg.run('-i', inputName, '-c:v', 'libx264', '-crf', '0', '-preset', 'ultrafast', '-c:a', 'copy', '-y', outputName);

    const decompressedData = ffmpeg.FS('readFile', outputName);
    const blob = new Blob([decompressedData], { type: 'video/mp4' });

    [inputName, outputName].forEach(f => { try { ffmpeg.FS('unlink', f); } catch (_) { } });

    return {
        blob: blob,
        metrics: {
            originalSize: formatBytes(file.size),
            compressedSize: formatBytes(blob.size),
            ratio: getCompressionRatio(blob.size, file.size),
            savings: getSpaceSavings(blob.size, file.size)
        }
    };
}