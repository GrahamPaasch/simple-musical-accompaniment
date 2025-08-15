/**
 * Error logging and handling utilities
 */
export class ErrorLogger {
    constructor() {
        this.errors = [];
        this.maxErrors = 100; // Prevent memory leaks
    }

    /**
     * Log an error with context
     */
    logError(error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message || String(error),
            stack: error.stack,
            context,
            type: error.constructor.name
        };

        this.errors.push(errorEntry);
        
        // Keep only recent errors
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(-this.maxErrors);
        }

        // Console log in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error logged:', errorEntry);
        }

        // Could send to error reporting service here
        this.reportError(errorEntry);
    }

    /**
     * Log a warning
     */
    logWarning(message, context = {}) {
        const warningEntry = {
            timestamp: new Date().toISOString(),
            level: 'warning',
            message,
            context
        };

        console.warn('Warning:', warningEntry);
    }

    /**
     * Report error to external service (stub for now)
     */
    reportError(errorEntry) {
        // In a real application, you might send this to a service like Sentry
        // For now, we'll just store it locally
        try {
            const existingErrors = JSON.parse(localStorage.getItem('shm_errors') || '[]');
            existingErrors.push(errorEntry);
            
            // Keep only last 50 errors in localStorage
            const recentErrors = existingErrors.slice(-50);
            localStorage.setItem('shm_errors', JSON.stringify(recentErrors));
        } catch (storageError) {
            console.warn('Failed to store error in localStorage:', storageError);
        }
    }

    /**
     * Get recent errors
     */
    getErrors() {
        return [...this.errors];
    }

    /**
     * Clear error log
     */
    clearErrors() {
        this.errors = [];
        try {
            localStorage.removeItem('shm_errors');
        } catch (e) {
            console.warn('Failed to clear errors from localStorage:', e);
        }
    }

    /**
     * Create a wrapped function that catches and logs errors
     */
    wrap(fn, context = {}) {
        return (...args) => {
            try {
                return fn.apply(this, args);
            } catch (error) {
                this.logError(error, { ...context, args });
                throw error;
            }
        };
    }

    /**
     * Create an async wrapped function that catches and logs errors
     */
    wrapAsync(fn, context = {}) {
        return async (...args) => {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                this.logError(error, { ...context, args });
                throw error;
            }
        };
    }
}

// Global error handler
export function setupGlobalErrorHandling(errorLogger) {
    // Handle unhandled promises
    window.addEventListener('unhandledrejection', (event) => {
        errorLogger.logError(event.reason, { type: 'unhandledrejection' });
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
        errorLogger.logError(event.error || new Error(event.message), {
            type: 'globalerror',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });
}
