// PhishShift Configuration
export const CONFIG = {
  USE_MOCK_DATA: false,
  API_BASE_URL: (import.meta.env.VITE_API_BASE_URL || 'https://phishsentry.onrender.com').replace(/\/$/, '')
};
