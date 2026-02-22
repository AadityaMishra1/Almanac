// Simple API client for Next.js API routes
const apiClient = {
  async get(url: string, config?: { params?: Record<string, any> }) {
    const queryString = config?.params
      ? "?" + new URLSearchParams(config.params).toString()
      : "";

    const response = await fetch(`/api${url}${queryString}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return { data: await response.json() };
  },

  async post(
    url: string,
    data?: any,
    config?: { params?: Record<string, any> },
  ) {
    const queryString = config?.params
      ? "?" + new URLSearchParams(config.params).toString()
      : "";

    const isFormData = data instanceof FormData;
    const headers: Record<string, string> = {};

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`/api${url}${queryString}`, {
      method: "POST",
      headers,
      body: isFormData ? data : JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return { data: await response.json() };
  },
};

export { apiClient as api };
export default apiClient;
