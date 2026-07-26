import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
});

const getStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem("token");
  } catch (error) {
    return null;
  }
};

const isLoginRequest = (url) => {
  if (typeof url !== "string") {
    return false;
  }

  return /\/login\/?$/i.test(url);
};

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url;

    if (status === 401 && !isLoginRequest(requestUrl)) {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem("token");
        } catch (storageError) {
          // Ignore localStorage failures and continue with redirect.
        }

        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;