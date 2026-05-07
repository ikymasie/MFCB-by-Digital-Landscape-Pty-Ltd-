import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Authorization header and correlation ID
api.interceptors.request.use((config) => {
  // Attach token from localStorage (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const authData = localStorage.getItem('mfcb-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        const token = parsed?.state?.token;
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  // Add correlation ID
  const correlationId = crypto.randomUUID();
  config.headers['X-Correlation-Id'] = correlationId;

  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mfcb-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
