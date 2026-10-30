import { Platform } from "react-native";
import axios from "axios";

const LAN_IP = "192.168.88.2"; // CHANGE WHEN YOU TEST ON YOUR PHONE
// Find it by running: ipconfig getifaddr en0

// export const BASE_URL =
//   Platform.OS === "web" ? "http://localhost:4000" : `http://${LAN_IP}:4000`;
export const BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

const instance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

instance.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";
    if (status === 401 && !url.startsWith("/auth/")) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export async function api<T = unknown>(
  path: string,
  { method = "GET", body }: RequestOptions = {},
): Promise<T> {
  try {
    const res = await instance({
      url: path,
      method,
      data: body,
    });

    return res.data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        throw new ApiError(
          "Can't reach the server. Is the backend running?",
          0,
        );
      }
      throw new ApiError(
        error.response?.data?.message ?? "Something went wrong",
        error.response?.status ?? 0,
      );
    }

    throw error;
  }
}
