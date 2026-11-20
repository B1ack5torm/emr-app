import { Buffer } from "node:buffer";

const eventLevels = {
  public_booking_transaction_failed: "error",
  staff_invite_email_failed: "error",
  imaging_endpoint_unconfigured: "error",
  imaging_transmission_rejected: "warn",
  imaging_transmission_failed: "error",
  grafana_connection_test: "info",
} as const;

const pushPath = "/loki/api/v1/push";

type OperationalEvent = keyof typeof eventLevels;
type DeliveryStatus = "sent" | "disabled" | "failed";

export async function logOperationalEvent(event: OperationalEvent): Promise<DeliveryStatus> {
  // Only predefined events leave the app. This function accepts no request data or error details.
  const level = eventLevels[event];
  const line = JSON.stringify({ event, level });
  console[level](line);

  const url = process.env.GRAFANA_LOKI_URL?.trim();
  const user = process.env.GRAFANA_LOKI_USER?.trim();
  const token = process.env.GRAFANA_LOKI_TOKEN?.trim();
  if (!url && !user && !token) return "disabled";
  if (!url || !user || !token) {
    console.warn("Grafana log delivery requires GRAFANA_LOKI_URL, GRAFANA_LOKI_USER, and GRAFANA_LOKI_TOKEN.");
    return "failed";
  }

  let endpoint: URL;
  try {
    endpoint = new URL(url);
    const path = endpoint.pathname.replace(/\/+$/, "");
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || (path && path !== pushPath)) {
      throw new Error("Invalid Loki endpoint");
    }
    endpoint.pathname = pushPath;
  } catch {
    console.warn("GRAFANA_LOKI_URL must be an HTTPS Loki base URL or push endpoint.");
    return "failed";
  }

  try {
    const authorization = Buffer.from(`${user}:${token}`, "utf8").toString("base64");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Basic ${authorization}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        streams: [{
          stream: { service_name: "carechart-emr", environment: process.env.NODE_ENV || "development" },
          values: [[`${Date.now()}000000`, line]],
        }],
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(1_000),
    });
    await response.body?.cancel();
    if (response.ok) return "sent";
    console.warn(`Grafana log delivery failed (HTTP ${response.status}).`);
  } catch {
    console.warn("Grafana log delivery could not reach Loki or timed out.");
  }
  return "failed";
}
