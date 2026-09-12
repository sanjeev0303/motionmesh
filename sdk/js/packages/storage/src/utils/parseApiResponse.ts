/**
 * Parses a JSON API response without crashing on non-JSON error bodies:
 * error responses fall back to response.text() so plain-text errors like
 * "not found" surface cleanly instead of a JSON.parse SyntaxError.
 */
export const parseJsonResponse = async (
  response: Response,
  fallbackMessage: string,
): Promise<any> => {
  if (response.ok) {
    return response.json();
  }

  const raw = await response.text().catch(() => "");
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  const msg = Array.isArray(data?.message)
    ? data.message.join(", ")
    : data?.message || data?.error;

  throw new Error(msg || raw.trim() || response.statusText || fallbackMessage);
};