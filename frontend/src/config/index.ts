const config = {
    // API Configuration
    apiBaseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',

    // Application Info
    appName: 'Sisyphus',
    appVersion: '1.0.0',

    // Pagination Defaults
    defaultPageSize: 10,
    maxPageSize: 100,

    // Storage Keys
    storageKeys: {
        token: 'sisyphus-token',
        theme: 'sisyphus-theme',
        language: 'sisyphus-language'
    },

    // Request Timeout
    requestTimeout: 30000, // 30 seconds
}

export default config
