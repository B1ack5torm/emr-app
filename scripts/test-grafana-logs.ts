import { logOperationalEvent } from "../src/lib/operational-logging";

async function main() {
  const delivery = await logOperationalEvent("grafana_connection_test");
  if (delivery === "sent") {
    console.info('Loki accepted the test event. In Grafana Explore, run {service_name="carechart-emr"} | json | event="grafana_connection_test"');
    return;
  }
  if (delivery === "disabled") {
    console.error("Set GRAFANA_LOKI_URL, GRAFANA_LOKI_USER, and GRAFANA_LOKI_TOKEN in .env first.");
  }
  process.exitCode = 1;
}

void main();
