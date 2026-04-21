import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

// Request interceptor to convert camelCase to snake_case
api.interceptors.request.use((config) => {
  if (config.data && !(config.data instanceof FormData)) {
    config.data = transformToSnake(config.data);
  }
  return config;
});

// Response interceptor to convert snake_case to camelCase
// (The backend SnakeCaseInterceptor already sends snake_case)
// But wait, the frontend usually prefers camelCase. 
// So I should transform it BACK to camelCase on the frontend.
api.interceptors.response.use((response) => {
  if (response.data) {
    response.data = transformToCamel(response.data);
  }
  return response;
});

function transformToSnake(data: any): any {
  if (Array.isArray(data)) return data.map(transformToSnake);
  if (data !== null && typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      acc[snakeKey] = transformToSnake(data[key]);
      return acc;
    }, {} as any);
  }
  return data;
}

function transformToCamel(data: any): any {
  if (Array.isArray(data)) return data.map(transformToCamel);
  if (data !== null && typeof data === 'object' && !(data instanceof Date)) {
    return Object.keys(data).reduce((acc, key) => {
      const camelKey = key.replace(/(_\w)/g, (m) => m[1].toUpperCase());
      acc[camelKey] = transformToCamel(data[key]);
      return acc;
    }, {} as any);
  }
  return data;
}

export default api;
