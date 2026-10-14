import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    let message = error.response?.data?.message || error.message || 'Something went wrong';

    // Handle Blob error responses (e.g. server returned JSON error during CSV export with responseType: 'blob')
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const parsed = JSON.parse(text);
        if (parsed?.message) {
          message = parsed.message;
        }
      } catch {
        // Fallback to default message
      }
    }

    const customError = {
      message,
      status: error.response?.status,
      errors: error.response?.data?.errors || [],
    };
    return Promise.reject(customError);
  }
);

export default api;
