/**
 * background/service-worker.js
 * ──────────────────────────────────────────────────────────────────
 * Extension Lifecycle & Keep-Alive Manager.
 * * In Manifest V3, service workers are aggressively terminated by Chrome 
 * after 30 seconds of inactivity. This script prevents the extension from 
 * falling asleep during heavy WebAssembly/Encoding tasks running in the UI.
 * * Assigned to: Prakhar (Background Architecture)
 * ──────────────────────────────────────────────────────────────────
 */

let keepAliveInterval = null;

// Log when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
    console.log("MACS-FC Extension successfully installed and background worker active.");
});

// Listen for lifecycle triggers from the UI router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    if (message.action === 'START_HEAVY_PROCESSING') {
        console.log("[Service Worker] Heavy processing started. Initiating keep-alive protocol...");
        
        // Prakhar's Keep-Alive trick:
        // Calling getPlatformInfo regularly resets the Service Worker termination timer
        if (!keepAliveInterval) {
            keepAliveInterval = setInterval(() => {
                chrome.runtime.getPlatformInfo((info) => {
                    // Silent ping to keep the extension awake
                });
            }, 20000); // 20 seconds is safely under Chrome's 30-second kill threshold
        }
        sendResponse({ status: "Keep-alive active" });
    } 
    
    else if (message.action === 'STOP_HEAVY_PROCESSING') {
        console.log("[Service Worker] Processing complete. Releasing keep-alive.");
        
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
        }
        sendResponse({ status: "Keep-alive deactivated" });
    }
    else if (message.action === 'FETCH_VIDEO') {
        fetchExternalVideo(message.url).then(sendResponse);
    }

    // Return true to keep the message channel open for async responses
    return true; 
});

/**
 * Fetches an external video URL, correctly parses the blob, 
 * and returns it as a safely transmittable Data URL for the UI.
 * 
 * @param {string} url - The external URL to fetch
 */
async function fetchExternalVideo(url) {
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Network error: ${response.status}`);
        }

        // 1. Properly handle as a Blob to protect the binary data stream
        const videoBlob = await response.blob();

        // 2. Read into an ArrayBuffer
        const arrayBuffer = await videoBlob.arrayBuffer();
        
        // 3. Convert to Base64 in a loop to prevent call stack issues
        let binaryString = '';
        const bytes = new Uint8Array(arrayBuffer);
        // Using a tight loop for performance scaling
        for (let i = 0; i < bytes.length; i++) {
            binaryString += String.fromCharCode(bytes[i]);
        }
        
        const base64Data = btoa(binaryString);
        
        // 4. Return as a clean Data URL so the popup interface can reconstruct it
        return { 
            success: true, 
            dataUrl: `data:${videoBlob.type};base64,${base64Data}` 
        };

    } catch (error) {
        console.error("External Fetch Error:", error);
        return { success: false, error: error.message };
    }
}