import axios from "axios";

const API_URL = (process.env.REACT_APP_API_URL || "https://YOUR-BACKEND-URL.vercel.app")
  .replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

export const getHealth = () => api.get("/api/health");

export default api;