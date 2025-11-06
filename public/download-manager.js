// Enhanced Download Manager with Progress Tracking
const DownloadManager = {
    downloads: new Map(), // Store active downloads
    downloadHistory: [],
    maxConcurrentDownloads: 3,

    // Initialize download manager
    init() {
        console.log('📥 Initializing Download Manager');
        this.loadDownloadHistory();
        this.createDownloadUI();

        // Clean up completed downloads every 30 seconds
        setInterval(() => {
            this.cleanupCompletedDownloads();
        }, 30000);
    },

    // Create download UI elements
    createDownloadUI() {
        // Create download panel if it doesn't exist
        if (!document.getElementById('downloadPanel')) {
            const downloadPanel = document.createElement('div');
            downloadPanel.id = 'downloadPanel';
            downloadPanel.className = 'download-panel';
            downloadPanel.style.display = 'none'; // Initially hidden
            downloadPanel.innerHTML = `
                <div class="download-panel-header">
                    <h3>📥 Downloads</h3>
                    <div class="download-panel-controls">
                        <button onclick="DownloadManager.hidePanel()" class="download-close-btn">✕</button>
                        <button onclick="DownloadManager.clearCompleted()" class="download-clear-btn">Clear Completed</button>
                    </div>
                </div>
                <div class="download-panel-content" id="downloadPanelContent">
                    <div class="no-downloads">No active downloads</div>
                </div>
            `;
            document.body.appendChild(downloadPanel);
        }

        // Create download notification area
        if (!document.getElementById('downloadNotifications')) {
            const notificationArea = document.createElement('div');
            notificationArea.id = 'downloadNotifications';
            notificationArea.className = 'download-notifications';
            document.body.appendChild(notificationArea);
        }
    },

    // Start a new download
    async startDownload(url, filename, options = {}) {
        const downloadId = this.generateDownloadId();
        const download = {
            id: downloadId,
            url: url,
            filename: filename || this.extractFilename(url),
            status: 'starting',
            progress: 0,
            downloadedBytes: 0,
            totalBytes: 0,
            speed: 0,
            eta: 0,
            startTime: Date.now(),
            lastUpdateTime: Date.now(),
            error: null,
            ...options
        };

        this.downloads.set(downloadId, download);
        this.updateDownloadUI();

        console.log(`📥 Starting download: ${download.filename}`);

        try {
            // Check if we can use Electron's download API
            if (window.electronAPI?.startDownload) {
                await this.startElectronDownload(download);
            } else {
                // Fallback to browser download with progress simulation
                await this.startBrowserDownload(download);
            }
        } catch (error) {
            console.error('❌ Download failed:', error);
            download.status = 'failed';
            download.error = error.message;
            this.updateDownloadUI();
            this.showDownloadNotification(`Download failed: ${download.filename}`, 'error');
        }

        return downloadId;
    },

    // Start download using Electron API
    async startElectronDownload(download) {
        try {
            download.status = 'downloading';
            this.updateDownloadUI();

            // Set up progress listener
            if (window.electronAPI?.onDownloadProgress) {
                console.log('📊 Setting up progress listener for download:', download.id);
                window.electronAPI.onDownloadProgress((progressData) => {
                    console.log('📊 Progress update received:', progressData);
                    if (progressData.downloadId === download.id) {
                        console.log('📊 Updating progress for download:', download.id);
                        this.updateDownloadProgress(download.id, progressData);
                    }
                });
            } else {
                console.warn('⚠️ electronAPI.onDownloadProgress not available');
            }

            // Use Electron's download API
            const result = await window.electronAPI.startDownload({
                url: download.url,
                filename: download.filename,
                downloadId: download.id
            });

            if (result.success) {
                download.status = 'completed';
                download.progress = 100;
                download.downloadedBytes = result.size || download.downloadedBytes;
                download.totalBytes = result.size || download.totalBytes;

                this.updateDownloadUI();
                this.saveToHistory(download);
                this.showDownloadNotification(`Download completed: ${download.filename}`, 'success');

                console.log(`✅ Download completed: ${result.path}`);
            } else {
                throw new Error(result.error || 'Download failed');
            }
        } catch (error) {
            download.status = 'failed';
            download.error = error.message;
            this.updateDownloadUI();
            throw error;
        }
    },

    // Start download using browser with progress simulation
    async startBrowserDownload(download) {
        try {
            download.status = 'downloading';
            this.updateDownloadUI();

            // Get file size first
            const headResponse = await fetch(download.url, { method: 'HEAD' });
            if (headResponse.ok) {
                const contentLength = headResponse.headers.get('content-length');
                if (contentLength) {
                    download.totalBytes = parseInt(contentLength);
                }
            }

            // Start the actual download
            const response = await fetch(download.url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const chunks = [];
            let receivedLength = 0;

            // Read the stream
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                receivedLength += value.length;

                // Update progress
                download.downloadedBytes = receivedLength;
                if (download.totalBytes > 0) {
                    download.progress = (receivedLength / download.totalBytes) * 100;
                }

                // Calculate speed and ETA
                this.calculateDownloadStats(download);
                this.updateDownloadUI();

                // Small delay to prevent UI blocking
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Create blob and download
            const blob = new Blob(chunks);
            const downloadUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = download.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(downloadUrl);

            download.status = 'completed';
            download.progress = 100;
            this.showDownloadNotification(`Download completed: ${download.filename}`, 'success');

        } catch (error) {
            download.status = 'failed';
            download.error = error.message;
            throw error;
        }
    },

    // Update download progress
    updateDownloadProgress(downloadId, progressData) {
        const download = this.downloads.get(downloadId);
        if (!download) return;

        download.downloadedBytes = progressData.downloadedBytes || 0;
        download.totalBytes = progressData.totalBytes || 0;
        download.progress = progressData.progress || 0;
        download.speed = progressData.speed || 0;
        download.eta = progressData.eta || 0;
        download.lastUpdateTime = Date.now();

        this.updateDownloadUI();
    },

    // Calculate download statistics
    calculateDownloadStats(download) {
        const now = Date.now();
        const timeDiff = (now - download.lastUpdateTime) / 1000; // seconds

        if (timeDiff > 0) {
            // Calculate speed (bytes per second)
            const bytesDiff = download.downloadedBytes - (download.lastDownloadedBytes || 0);
            download.speed = bytesDiff / timeDiff;

            // Calculate ETA
            if (download.speed > 0 && download.totalBytes > 0) {
                const remainingBytes = download.totalBytes - download.downloadedBytes;
                download.eta = remainingBytes / download.speed;
            }
        }

        download.lastDownloadedBytes = download.downloadedBytes;
        download.lastUpdateTime = now;
    },

    // Update download UI
    updateDownloadUI() {
        const content = document.getElementById('downloadPanelContent');
        if (!content) return;

        const activeDownloads = Array.from(this.downloads.values());

        if (activeDownloads.length === 0) {
            content.innerHTML = '<div class="no-downloads">No active downloads</div>';
            return;
        }

        content.innerHTML = activeDownloads.map(download => this.createDownloadItem(download)).join('');

        // Update download panel visibility
        const panel = document.getElementById('downloadPanel');
        if (panel) {
            if (activeDownloads.some(d => d.status === 'downloading')) {
                panel.classList.add('has-active-downloads');
                // Auto-show panel when there are active downloads
                if (panel.style.display === 'none') {
                    panel.style.display = 'block';
                }
            } else {
                panel.classList.remove('has-active-downloads');
            }
        }

        // Update header download button
        this.updateHeaderDownloadButton();
    },

    // Create download item HTML
    createDownloadItem(download) {
        const progressPercent = Math.round(download.progress);
        const downloadedMB = (download.downloadedBytes / (1024 * 1024)).toFixed(1);
        const totalMB = download.totalBytes > 0 ? (download.totalBytes / (1024 * 1024)).toFixed(1) : '?';
        const speedText = this.formatSpeed(download.speed);
        const etaText = this.formatETA(download.eta);
        const statusIcon = this.getStatusIcon(download.status);

        return `
            <div class="download-item ${download.status}" data-download-id="${download.id}">
                <div class="download-item-header">
                    <div class="download-info">
                        <span class="download-status-icon">${statusIcon}</span>
                        <span class="download-filename" title="${download.filename}">${download.filename}</span>
                    </div>
                    <div class="download-controls">
                        ${download.status === 'downloading' ? `
                            <button onclick="DownloadManager.pauseDownload('${download.id}')" class="download-control-btn" title="Pause">⏸️</button>
                        ` : download.status === 'paused' ? `
                            <button onclick="DownloadManager.resumeDownload('${download.id}')" class="download-control-btn" title="Resume">▶️</button>
                        ` : ''}
                        <button onclick="DownloadManager.cancelDownload('${download.id}')" class="download-control-btn" title="Cancel">❌</button>
                    </div>
                </div>
                
                <div class="download-progress-container">
                    <div class="download-progress-bar">
                        <div class="download-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <span class="download-progress-text">${progressPercent}%</span>
                </div>
                
                <div class="download-stats">
                    <span class="download-size">${downloadedMB} MB / ${totalMB} MB</span>
                    ${download.status === 'downloading' ? `
                        <span class="download-speed">${speedText}</span>
                        <span class="download-eta">ETA: ${etaText}</span>
                    ` : ''}
                    ${download.error ? `<span class="download-error">Error: ${download.error}</span>` : ''}
                </div>
            </div>
        `;
    },

    // Get status icon
    getStatusIcon(status) {
        const icons = {
            starting: '🔄',
            downloading: '📥',
            paused: '⏸️',
            completed: '✅',
            failed: '❌',
            cancelled: '🚫'
        };
        return icons[status] || '📄';
    },

    // Format download speed
    formatSpeed(bytesPerSecond) {
        if (bytesPerSecond === 0) return '0 B/s';

        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        let size = bytesPerSecond;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    },

    // Format ETA
    formatETA(seconds) {
        if (!seconds || seconds === Infinity) return 'Unknown';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    },

    // Pause download
    pauseDownload(downloadId) {
        const download = this.downloads.get(downloadId);
        if (download && download.status === 'downloading') {
            download.status = 'paused';
            this.updateDownloadUI();
            console.log(`⏸️ Paused download: ${download.filename}`);
        }
    },

    // Resume download
    resumeDownload(downloadId) {
        const download = this.downloads.get(downloadId);
        if (download && download.status === 'paused') {
            download.status = 'downloading';
            this.updateDownloadUI();
            console.log(`▶️ Resumed download: ${download.filename}`);
            // Note: Actual resume logic would need to be implemented based on the download method
        }
    },

    // Cancel download
    cancelDownload(downloadId) {
        const download = this.downloads.get(downloadId);
        if (download) {
            download.status = 'cancelled';
            this.updateDownloadUI();
            this.showDownloadNotification(`Download cancelled: ${download.filename}`, 'info');
            console.log(`🚫 Cancelled download: ${download.filename}`);
        }
    },

    // Toggle download panel
    togglePanel() {
        const panel = document.getElementById('downloadPanel');
        if (panel) {
            panel.classList.toggle('collapsed');
            const toggleBtn = panel.querySelector('.download-toggle-btn');
            if (toggleBtn) {
                toggleBtn.textContent = panel.classList.contains('collapsed') ? '+' : '−';
            }
        }
    },

    // Clear completed downloads
    clearCompleted() {
        const completedIds = [];
        this.downloads.forEach((download, id) => {
            if (download.status === 'completed' || download.status === 'failed' || download.status === 'cancelled') {
                completedIds.push(id);
            }
        });

        completedIds.forEach(id => this.downloads.delete(id));
        this.updateDownloadUI();

        if (completedIds.length > 0) {
            this.showDownloadNotification(`Cleared ${completedIds.length} completed downloads`, 'info');
        }
    },

    // Clean up old completed downloads
    cleanupCompletedDownloads() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes

        const toRemove = [];
        this.downloads.forEach((download, id) => {
            if ((download.status === 'completed' || download.status === 'failed') &&
                (now - download.lastUpdateTime) > maxAge) {
                toRemove.push(id);
            }
        });

        toRemove.forEach(id => this.downloads.delete(id));

        if (toRemove.length > 0) {
            this.updateDownloadUI();
        }
    },

    // Show download notification
    showDownloadNotification(message, type = 'info') {
        const notificationArea = document.getElementById('downloadNotifications');
        if (!notificationArea) return;

        const notification = document.createElement('div');
        notification.className = `download-notification ${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        notificationArea.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    },

    // Generate unique download ID
    generateDownloadId() {
        return 'download_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Extract filename from URL
    extractFilename(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();

            if (filename && filename.includes('.')) {
                return filename;
            }

            // Fallback to generic name with extension based on content type
            return `download_${Date.now()}.mp4`;
        } catch (error) {
            return `download_${Date.now()}.mp4`;
        }
    },

    // Load download history from localStorage
    loadDownloadHistory() {
        try {
            const history = localStorage.getItem('downloadHistory');
            if (history) {
                this.downloadHistory = JSON.parse(history);
            }
        } catch (error) {
            console.error('Failed to load download history:', error);
            this.downloadHistory = [];
        }
    },

    // Save download to history
    saveToHistory(download) {
        const historyItem = {
            filename: download.filename,
            url: download.url,
            status: download.status,
            completedAt: Date.now(),
            fileSize: download.totalBytes
        };

        this.downloadHistory.unshift(historyItem);

        // Keep only last 100 downloads
        if (this.downloadHistory.length > 100) {
            this.downloadHistory = this.downloadHistory.slice(0, 100);
        }

        try {
            localStorage.setItem('downloadHistory', JSON.stringify(this.downloadHistory));
        } catch (error) {
            console.error('Failed to save download history:', error);
        }
    },

    // Get download statistics
    getDownloadStats() {
        const active = Array.from(this.downloads.values());
        return {
            total: active.length,
            downloading: active.filter(d => d.status === 'downloading').length,
            completed: active.filter(d => d.status === 'completed').length,
            failed: active.filter(d => d.status === 'failed').length,
            paused: active.filter(d => d.status === 'paused').length
        };
    },

    // Hide download panel completely
    hidePanel() {
        const panel = document.getElementById('downloadPanel');
        if (panel) {
            panel.style.display = 'none';
            console.log('📥 Download panel hidden');
        }
    },

    // Show download panel
    showPanel() {
        const panel = document.getElementById('downloadPanel');
        if (panel) {
            panel.style.display = 'block';
            console.log('📥 Download panel shown');
        } else {
            // Create panel if it doesn't exist
            this.createDownloadUI();
        }
    },

    // Toggle panel visibility (for backward compatibility)
    togglePanel() {
        const panel = document.getElementById('downloadPanel');
        if (panel) {
            if (panel.style.display === 'none') {
                this.showPanel();
            } else {
                this.hidePanel();
            }
        }
    },

    // Update header download button
    updateHeaderDownloadButton() {
        const downloadBtn = document.getElementById('downloadsBtn');
        if (!downloadBtn) return;

        const activeDownloads = Array.from(this.downloads.values());
        const hasActiveDownloads = activeDownloads.some(d => d.status === 'downloading');

        if (hasActiveDownloads) {
            downloadBtn.classList.add('has-downloads');
            downloadBtn.title = `Downloads (${activeDownloads.filter(d => d.status === 'downloading').length} active)`;
        } else {
            downloadBtn.classList.remove('has-downloads');
            downloadBtn.title = 'Downloads';
        }
    }
};

// Initialize download manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    DownloadManager.init();
});

// Make globally accessible
window.DownloadManager = DownloadManager;
// Enhanced download methods for better compatibility
async function tryDownloadMethods(url, stream, title) {
    console.log('🔽 Trying enhanced download methods');

    // Generate smart filename
    const filename = generateDownloadFilename(stream, title);

    try {
        // Method 1: Use DownloadManager if available
        if (window.DownloadManager) {
            const downloadId = await window.DownloadManager.startDownload(url, filename, {
                source: 'tryDownloadMethods',
                streamServer: stream.server,
                quality: stream.quality,
                contentTitle: title,
                streamType: stream.type
            });
            console.log('✅ Started download via DownloadManager:', downloadId);
            return true;
        }

        // Method 2: Direct browser download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        console.log('✅ Started browser download:', filename);
        return true;

    } catch (error) {
        console.error('❌ All download methods failed:', error);
        return false;
    }
}

// Global helper functions for backward compatibility
window.tryDownloadMethods = tryDownloadMethods;

// Enhanced filename generation (moved from app.js for reuse)
function generateDownloadFilename(stream, contentTitle) {
    try {
        // Clean content title for filename
        let title = contentTitle || 'Video';
        title = title.replace(/[<>:"/\\|?*]/g, ''); // Remove invalid filename characters
        title = title.substring(0, 50); // Limit length

        // Determine file extension
        let extension = '.mp4'; // default
        if (stream.type === 'm3u8' || stream.link.includes('.m3u8')) {
            extension = '.m3u8';
        } else if (stream.link.includes('.mkv')) {
            extension = '.mkv';
        } else if (stream.link.includes('.avi')) {
            extension = '.avi';
        } else if (stream.link.includes('.mov')) {
            extension = '.mov';
        }

        // Add quality info if available
        const quality = stream.quality ? `_${stream.quality}p` : '';

        // Add server info for identification
        const server = stream.server ? `_${stream.server.replace(/[<>:"/\\|?*]/g, '')}` : '';

        // Construct filename
        const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const filename = `${title}${quality}${server}_${timestamp}${extension}`;

        return filename;
    } catch (error) {
        console.error('Error generating filename:', error);
        return `download_${Date.now()}.mp4`;
    }
}

// Make globally available
window.generateDownloadFilename = generateDownloadFilename;