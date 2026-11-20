import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { logOperationalEvent } from "../src/lib/operational-logging";

const settings = {
  GRAFANA_LOG_ENVIRONMENT: "local",
  GRAFANA_LOKI_URL: "https://logs.example.test/",
  GRAFANA_LOKI_USER: "123456",
  GRAFANA_LOKI_TOKEN: "test-write-token",
  VERCEL_ENV: "",
};

function configureLoki(context: TestContext, url?: string) {
  const keys = Object.keys(settings);
  const previous = keys.map((key) => process.env[key]);
  context.after(() => {
    keys.forEach((key, index) => {
      const value = previous[index];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  });
  if (url) Object.assign(process.env, settings, { GRAFANA_LOKI_URL: url });
  else keys.forEach((key) => { delete process.env[key]; });
}

test("sends only the predefined event and severity to the Loki push endpoint", async (context) => {
  configureLoki(context, settings.GRAFANA_LOKI_URL);
  context.mock.method(console, "error", () => {});
  const send = context.mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));

  assert.equal(await logOperationalEvent("imaging_transmission_failed"), "sent");
  assert.equal(send.mock.callCount(), 1);
  const [url, request] = send.mock.calls[0].arguments;
  assert.equal(String(url), "https://logs.example.test/loki/api/v1/push");
  assert.equal(request?.method, "POST");
  assert.equal(request?.redirect, "error");
  assert.equal(new Headers(request?.headers).get("authorization"), `Basic ${Buffer.from("123456:test-write-token").toString("base64")}`);
  const { streams } = JSON.parse(String(request?.body));
  assert.equal(streams.length, 1);
  assert.deepEqual(streams[0].stream, { service_name: "carechart-emr", environment: "local" });
  assert.equal(streams[0].values.length, 1);
  const [timestamp, line] = streams[0].values[0];
  assert.match(timestamp, /^\d{19}$/);
  assert.deepEqual(JSON.parse(line), { event: "imaging_transmission_failed", level: "error" });
});

test("uses the Vercel deployment environment even when a local label is configured", async (context) => {
  configureLoki(context, settings.GRAFANA_LOKI_URL);
  process.env.VERCEL_ENV = "production";
  context.mock.method(console, "info", () => {});
  const send = context.mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));

  assert.equal(await logOperationalEvent("grafana_connection_test"), "sent");
  const [, request] = send.mock.calls[0].arguments;
  const { streams } = JSON.parse(String(request?.body));
  assert.equal(streams[0].stream.environment, "production");
});

test("writes to the console without making an HTTP request when Loki is disabled", async (context) => {
  configureLoki(context);
  const log = context.mock.method(console, "info", () => {});
  const send = context.mock.method(globalThis, "fetch");

  assert.equal(await logOperationalEvent("grafana_connection_test"), "disabled");
  assert.deepEqual(log.mock.calls[0].arguments, ['{"event":"grafana_connection_test","level":"info"}']);
  assert.equal(send.mock.callCount(), 0);
});

test("reports only the HTTP status when Loki rejects an event", async (context) => {
  configureLoki(context, "https://logs.example.test/loki/api/v1/push");
  context.mock.method(console, "error", () => {});
  const warn = context.mock.method(console, "warn", () => {});
  context.mock.method(globalThis, "fetch", async () => new Response("private response details", { status: 403 }));

  assert.equal(await logOperationalEvent("staff_invite_email_failed"), "failed");
  assert.deepEqual(warn.mock.calls[0].arguments, ["Grafana log delivery failed (HTTP 403)."]);
});
