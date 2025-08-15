/**
 * Loading state management utilities
 */
export class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
        this.callbacks = new Map();
        this.setupDOM();
    }

    /**
     * Setup DOM elements for loading states
     */
    setupDOM() {
        // Create global loading overlay if it doesn't exist
        if (!document.getElementById('loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay hidden';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <div class="loading-message">Loading...</div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        // Add loading styles if they don't exist
        if (!document.getElementById('loading-styles')) {
            const styles = document.createElement('style');
            styles.id = 'loading-styles';
            styles.textContent = `
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    backdrop-filter: blur(2px);
                    transition: opacity 0.3s ease;
                }
                
                .loading-overlay.hidden {
                    opacity: 0;
                    pointer-events: none;
                }
                
                .loading-spinner {
                    text-align: center;
                    padding: 2rem;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                }
                
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1rem;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .loading-message {
                    color: #666;
                    font-size: 14px;
                    margin-top: 0.5rem;
                }

                .loading-button {
                    position: relative;
                    overflow: hidden;
                }

                .loading-button.loading {
                    color: transparent;
                    pointer-events: none;
                }

                .loading-button.loading::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 16px;
                    height: 16px;
                    margin: -8px 0 0 -8px;
                    border: 2px solid #ffffff;
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spin 0.8s linear infinite;
                }
            `;
            document.head.appendChild(styles);
        }
    }

    /**
     * Set loading state for a specific key
     */
    setLoading(key, isLoading, message = 'Loading...') {
        const wasLoading = this.isAnyLoading();
        
        if (isLoading) {
            this.loadingStates.set(key, { message, timestamp: Date.now() });
        } else {
            this.loadingStates.delete(key);
        }

        // Update global loading state
        this.updateGlobalLoadingState();

        // Call callbacks
        const callback = this.callbacks.get(key);
        if (callback) {
            callback(isLoading, message);
        }

        // Emit custom event
        window.dispatchEvent(new CustomEvent('loadingStateChanged', {
            detail: { key, isLoading, message, allStates: this.getLoadingStates() }
        }));
    }

    /**
     * Check if any loading state is active
     */
    isAnyLoading() {
        return this.loadingStates.size > 0;
    }

    /**
     * Check if specific key is loading
     */
    isLoading(key) {
        return this.loadingStates.has(key);
    }

    /**
     * Get all loading states
     */
    getLoadingStates() {
        return Array.from(this.loadingStates.entries()).map(([key, state]) => ({
            key,
            ...state
        }));
    }

    /**
     * Update global loading overlay
     */
    updateGlobalLoadingState() {
        const overlay = document.getElementById('loading-overlay');
        const messageEl = overlay?.querySelector('.loading-message');
        
        if (!overlay) return;

        if (this.isAnyLoading()) {
            // Get the most recent loading message
            const states = this.getLoadingStates();
            const latestState = states.reduce((latest, current) => 
                current.timestamp > latest.timestamp ? current : latest
            );
            
            if (messageEl) {
                messageEl.textContent = latestState.message;
            }
            
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Set button loading state
     */
    setButtonLoading(button, isLoading, originalText = null) {
        if (typeof button === 'string') {
            button = document.getElementById(button) || document.querySelector(button);
        }
        
        if (!button) return;

        if (isLoading) {
            if (originalText === null) {
                originalText = button.textContent;
            }
            button.dataset.originalText = originalText;
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

    /**
     * Subscribe to loading state changes for a specific key
     */
    subscribe(key, callback) {
        this.callbacks.set(key, callback);
    }

    /**
     * Unsubscribe from loading state changes
     */
    unsubscribe(key) {
        this.callbacks.delete(key);
    }

    /**
     * Wrap a function to show loading state
     */
    withLoading(key, fn, message = 'Loading...') {
        return async (...args) => {
            this.setLoading(key, true, message);
            try {
                const result = await fn(...args);
                return result;
            } finally {
                this.setLoading(key, false);
            }
        };
    }

    /**
     * Wrap a button click to show loading state
     */
    withButtonLoading(button, fn, message = null) {
        return async (...args) => {
            this.setButtonLoading(button, true, message);
            try {
                const result = await fn(...args);
                return result;
            } finally {
                this.setButtonLoading(button, false);
            }
        };
    }

    /**
     * Clear all loading states
     */
    clearAll() {
        this.loadingStates.clear();
        this.updateGlobalLoadingState();
    }
}
