# MACS-FC: Universal File Compression Extension

![Status](https://img.shields.io/badge/Status-In_Development-blue)
![MACS JC](https://img.shields.io/badge/MACS_JC-Project_2-brightgreen)

## Overview
A fully functional, browser-native Chrome Extension that reduces the size of various file types (text, image, audio, and video) either through lossless encoding (preserving 100% data integrity) or lossy encoding (discarding imperceptible data). The extension transparently reports performance metrics, including compression ratios and rebuild quality, while running entirely offline.

---

## Team Members & File Assignments

Our team is structured to leverage each member's core strengths across Frontend UI, AI/ML, and DSA.

* **Soumya (Frontend & Audio Engine):** `popup.html`, `popup.css`, `scripts/ui/dom-handler.js`, `scripts/compressors/lossy/audio-mp3.js`
* **Aryan Manu (Lossy Media Engine):** `scripts/compressors/lossy/image-jpg.js`, `scripts/compressors/lossy/video-mp4.js`
* **Kartikay (Core DSA & Cryptography):** `scripts/compressors/lossless/text-gz.js`, `scripts/utils/crypto-hash.js`
* **Lavisha (Data Pipeline & Routing):** `scripts/utils/file-reader.js`, Decompression Router logic
* **Gitesh (Metrics Engine & Lossless Visuals):** `scripts/utils/metrics.js`, `scripts/compressors/lossless/image-png.js`
* **Prakhar (Background Ops & Testing):** `manifest.json`, `background/service-worker.js`

---

## Repository Structure

```text
macs-file-compressor/
├── manifest.json
├── popup.html
├── popup.css
├── background/
│   └── service-worker.js
├── scripts/
│   ├── ui/
│   │   └── dom-handler.js
│   ├── compressors/
│   │   ├── lossless/
│   │   │   ├── text-gz.js
│   │   │   └── image-png.js
│   │   └── lossy/
│   │       ├── image-jpg.js
│   │       ├── audio-mp3.js
│   │       └── video-mp4.js
│   └── utils/
│       ├── metrics.js
│       ├── crypto-hash.js
│       └── file-reader.js
├── lib/
│   ├── pako.min.js
│   ├── jpeg-js.min.js
│   ├── upng.min.js
│   ├── lamejs.min.js
│   └── ffmpeg.min.js
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── samples/
│   ├── sample_data.csv
│   ├── sample_photo.jpg
│   ├── sample_audio.wav
│   └── sample_video.mp4
└── .gitignore

## Member vs File vs Work Intended

| Team Member | File(s) Assigned | Work Intended |
|------------|----------------|--------------|
| Soumya | `popup.html`, `popup.css`, `dom-handler.js`, `audio-mp3.js` | Build the dark-themed glassmorphism UI, wire DOM event listeners, and implement `lamejs` for MP3 audio compression |
| Aryan Manu | `image-jpg.js`, `video-mp4.js` | Implement spatial redundancy algorithms for lossy images via `jpeg-js` and handle temporal redundancy via `ffmpeg.wasm` for video |
| Kartikay | `text-gz.js`, `crypto-hash.js` | Write dictionary-based text compression using `pako` and utilize the SubtleCrypto API to generate SHA-256 hashes for lossless rebuild verification |
| Lavisha | `file-reader.js`, Decompression Router | Manage browser memory using the FileReader API to chunk heavy uploads and build the master routing logic for the reverse decompression process |
| Gitesh | `metrics.js`, `image-png.js` | Write mathematical logic to calculate Compression Ratios, Space Savings %, PSNR, and SSIM, and implement `UPNG.js` for lossless image encoding |
| Prakhar | `manifest.json`, `service-worker.js` | Configure the Manifest V3 architecture and implement the background service worker to prevent heavy video/image processing from freezing the main UI thread |

---

## Objective

To develop a fully functional, browser-native Chrome Extension that reduces the size of text, image, audio, and video files. The extension must transparently report performance metrics, including compression ratios and space savings percentage, while ensuring the UI remains clean and responsive.

---

## Features to Include

- Multi-Format Support: Accepts and processes text (`.txt`, `.csv`), images (`.png`, `.jpg`), audio (`.mp3`, `.wav`), and video (`.mp4`)
- Live Metrics Dashboard: Displays Original Size, Compressed Size, Compression Ratio, and Space Savings Percentage immediately after processing
- Bidirectional Processing: Allows users to download compressed files and upload them back for decompression
- Cryptographic Verification: Automatically compares SHA-256 hashes for lossless files to prove byte-for-byte identical rebuilds
- Quality Assessment: Calculates and displays perceptual quality metrics (PSNR or SSIM) for lossy media files
- Graceful Error Handling: Catches unsupported formats and oversized files, rendering clear error messages directly in the UI instead of silent console failures

---

## Core Requirements

- Must be packaged and installable as a Chrome Extension `.crx` file via `Load unpacked` or `chrome://extensions`
- Must operate entirely within the browser environment using JavaScript libraries (no Node.js servers)
- Must maintain strict separation of concerns between UI logic and compression algorithms
- Must include a clean, responsive UI that fits within the popup dimensions without horizontal scrollbars or overflowing text

---

## Additional Feature (USP)

- Premium Glassmorphism Aesthetic: A highly polished, dark-themed UI featuring translucent backdrop filters, modern typography, and smooth state transitions
- Asynchronous Background Processing: Utilizes a dedicated background Service Worker for heavy WebAssembly (`ffmpeg.wasm`) tasks, guaranteeing the UI never locks up during intense video encoding
- Chunked Memory Management: Implements specialized file-reading pipelines to handle large datasets and media files safely, preventing out-of-memory browser errors

---

## Deadline

19th April, 1:00 PM