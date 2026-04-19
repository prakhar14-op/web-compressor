import { compressAudio } from '../compressors/lossy/audio-mp3.js';
import { compressPDF } from '../compressors/lossless/document-pdf.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const btnCompress = document.getElementById('btn-compress');
    const btnDecompress = document.getElementById('btn-decompress');
    const errorMessage = document.getElementById('error-message');
    const resultsDashboard = document.getElementById('results-dashboard');
    const btnDownload = document.getElementById('btn-download');
    const verificationStatus = document.getElementById('verification-status');

    let currentFile = null;
    let processedBlob = null;
    let lastOriginalHash = null; // Stores SHA-256 hash for lossless text verification

    // --- Drag and Drop Aesthetics ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        handleFileSelect(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files[0]);
    });

    // --- File Handling & Validation ---
    function handleFileSelect(file) {
        hideError();
        resultsDashboard.classList.add('hidden');
        if (verificationStatus) verificationStatus.classList.add('hidden');

        if (!file) return;

        // Strict validation based on project requirements + GZIP support
        // Find this array and add 'application/pdf'
        const allowedTypes = [
            'text/plain', 'text/csv', 'image/jpeg', 'image/png',
            'audio/mpeg', 'audio/wav', 'video/mp4', 'application/gzip', 'application/x-gzip',
            'application/pdf'
        ];

        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.gz')) {
            showError("Unsupported format. Please upload TXT, CSV, JPG, PNG, MP3, WAV, MP4, or GZ.");
            btnCompress.disabled = true;
            btnDecompress.disabled = true;
            return;
        }

        currentFile = file;
        fileNameDisplay.textContent = currentFile.name;

        // Enable buttons
        btnCompress.disabled = false;
        btnDecompress.disabled = false;
    }

    // --- COMPRESSION MASTER ROUTER ---
    btnCompress.addEventListener('click', async () => {
        if (!currentFile) return;

        btnCompress.disabled = true;
        btnCompress.textContent = "Compressing...";

        try {
            let result;
            const fileType = currentFile.type;

            if (fileType.startsWith('audio/')) {
                result = await compressAudio(currentFile);
            }
            else if (fileType === 'image/png') {
                result = await compressLosslessPNG(currentFile);
            }
            else if (fileType === 'image/jpeg' || fileType === 'image/jpg') {
                result = await compressJPG(currentFile);
            }
            else if (fileType === 'video/mp4') {
                result = await compressMP4(currentFile);
            }
            // Find your COMPRESSION MASTER ROUTER and update the text/csv `else if` block:
            else if (fileType.startsWith('text/') || currentFile.name.endsWith('.csv') || fileType === 'application/pdf') {
                result = await compressText(currentFile);
                lastOriginalHash = result.originalHash;
                showVerification('compress', result.originalHash);
            }
            else {
                throw new Error("Cannot compress this file type.");
            }

            processedBlob = result.blob;
            updateDashboard(result.metrics, result.psnr);

            // Handle output extensions
            let ext = currentFile.name.split('.').pop();
            if (fileType.startsWith('text/') || ext === 'csv') ext = ext + '.gz';
            setupDownload(processedBlob, `compressed_${currentFile.name.split('.')[0]}.${ext}`);

        } catch (error) {
            showError(`Compression failed: ${error.message}`);
        } finally {
            btnCompress.disabled = false;
            btnCompress.textContent = "Compress File";
        }
    });

    // --- DECOMPRESSION MASTER ROUTER ---
    btnDecompress.addEventListener('click', async () => {
        if (!currentFile) return;

        btnDecompress.disabled = true;
        btnDecompress.textContent = "Decompressing...";

        try {
            let result;
            const fileName = currentFile.name || '';
            const fileType = currentFile.type;

            // 1. Text / GZ Routing
            if (fileName.endsWith('.gz') || fileType === 'application/gzip' || fileType === 'application/x-gzip') {
                result = await decompressText(currentFile, lastOriginalHash);
                if (result.verification) {
                    showVerification('decompress', null, result.verification);
                }
            }
            // 2. JPG Routing
            else if (fileType === 'image/jpeg' || fileType === 'image/jpg') {
                result = await decompressJPG(currentFile);
            }
            // 3. MP4 Routing
            else if (fileType === 'video/mp4') {
                result = await decompressMP4(currentFile);
            }
            // 4. Fallback (PNG, Audio) via FileProcessor
            else {
                const readerRes = await FileProcessor.routeDecompression(currentFile);
                result = {
                    blob: new Blob([readerRes.data], { type: currentFile.type }),
                    metrics: { originalSize: '--', compressedSize: '--', ratio: 'N/A', savings: 'N/A' }
                };
            }

            processedBlob = result.blob;

            if (result.metrics) {
                updateDashboard(result.metrics, result.psnr);
            }

            // Handle output names
            let downloadName = fileName.endsWith('.gz')
                ? fileName.slice(0, -3)
                : `decompressed_${fileName}`;
            setupDownload(processedBlob, downloadName);

        } catch (error) {
            showError(`Decompression failed: ${error.message}`);
        } finally {
            btnDecompress.disabled = false;
            btnDecompress.textContent = "Decompress File";
        }
    });

    // --- UI Update Utilities ---
    function updateDashboard(metrics, psnr = null) {
        document.getElementById('val-original').textContent = metrics.originalSize;
        document.getElementById('val-compressed').textContent = metrics.compressedSize;
        document.getElementById('val-ratio').textContent = metrics.ratio;
        document.getElementById('val-savings').textContent = metrics.savings; // metrics.js already adds the '%' sign

        // Display PSNR for lossy media if it was returned
        if (psnr !== null && psnr !== undefined) {
            verificationStatus.innerHTML = `
                <strong>📊 Quality Assessment</strong><br>
                <small style="color:#2ecc71;">PSNR: ${psnr} dB</small>
            `;
            verificationStatus.style.borderColor = 'rgba(46, 204, 113, 0.4)';
            verificationStatus.classList.remove('hidden');
        }

        resultsDashboard.classList.remove('hidden');
        btnDownload.classList.remove('hidden');
    }

    function setupDownload(blob, filename) {
        btnDownload.onclick = () => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url); // Clean up memory
        };
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    // --- SHA-256 Verification Display (Kartikay's Logic) ---
    function showVerification(mode, hash, verification) {
        verificationStatus.classList.remove('hidden');

        if (mode === 'compress' && hash) {
            verificationStatus.innerHTML = `
                <strong>🔒 SHA-256 Fingerprint</strong><br>
                <code style="font-size:10px;word-break:break-all;color:#8a2be2;">${hash}</code>
                <br><small style="color:#888;">This hash will verify lossless rebuild on decompression.</small>
            `;
            verificationStatus.style.borderColor = 'rgba(138, 43, 226, 0.4)';
        } else if (mode === 'decompress' && verification) {
            if (verification.match === true) {
                verificationStatus.innerHTML = `
                    <strong>✅ Lossless Rebuild Verified</strong><br>
                    <small style="color:#2ecc71;">SHA-256 hashes match — byte-for-byte identical reconstruction.</small><br>
                    <code style="font-size:10px;word-break:break-all;color:#2ecc71;">${verification.computed}</code>
                `;
                verificationStatus.style.borderColor = 'rgba(46, 204, 113, 0.4)';
            } else if (verification.match === false) {
                verificationStatus.innerHTML = `
                    <strong>❌ Hash Mismatch</strong><br>
                    <small style="color:#e74c3c;">Data may have been altered.</small><br>
                    <strong>Expected:</strong> <code style="font-size:10px;word-break:break-all;">${verification.expected}</code><br>
                    <strong>Got:</strong> <code style="font-size:10px;word-break:break-all;">${verification.computed}</code>
                `;
                verificationStatus.style.borderColor = 'rgba(231, 76, 60, 0.4)';
            } else {
                verificationStatus.innerHTML = `
                    <strong>🔓 Decompressed Successfully</strong><br>
                    <small style="color:#888;">No original hash available for comparison.</small><br>
                    <code style="font-size:10px;word-break:break-all;color:#8a2be2;">${verification.computed}</code>
                `;
                verificationStatus.style.borderColor = 'rgba(138, 43, 226, 0.4)';
            }
        }
    }
});