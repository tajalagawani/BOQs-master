import "server-only";

import { Durations } from "@azure/monitor-query";
import { logsClient } from "./azure";
import { getPlatformEnv, logAnalyticsConfigured } from "./platform-env";

export interface MetricPoint {
  /** ISO timestamp at the start of the bucket. */
  ts: string;
  /** Numeric value — percent for CPU/mem, count for log counts. */
  value: number;
}

export interface SyslogEntry {
  ts: string;
  facility: string;
  severityLevel: string;
  hostName: string;
  syslogMessage: string;
}

export type MonitoringWindow = "1h" | "24h" | "7d";

function durationFor(w: MonitoringWindow) {
  switch (w) {
    case "1h":
      return Durations.oneHour;
    case "7d":
      return Durations.sevenDays;
    case "24h":
    default:
      return Durations.oneDay;
  }
}

function binFor(w: MonitoringWindow): string {
  switch (w) {
    case "1h":
      return "1m";
    case "7d":
      return "1h";
    case "24h":
    default:
      return "5m";
  }
}

/**
 * Average CPU % over a time window, bucketed for charting.
 * Uses Azure Monitor Agent's `InsightsMetrics` table (namespace Processor,
 * UtilizationPercentage). Falls back to [] when not configured.
 */
export async function getCpuSeries(window: MonitoringWindow = "24h"): Promise<MetricPoint[]> {
  if (!(await logAnalyticsConfigured())) return [];
  const bin = binFor(window);
  const query = `
    InsightsMetrics
    | where Namespace == "Processor" and Name == "UtilizationPercentage"
    | summarize Value = avg(Val) by bin(TimeGenerated, ${bin})
    | order by TimeGenerated asc
    | project ts = TimeGenerated, value = Value
  `;
  return queryMetric(query, window);
}

/**
 * Average memory utilisation % over a time window.
 * Memory.AvailableMB → derive used%.
 */
export async function getMemorySeries(window: MonitoringWindow = "24h"): Promise<MetricPoint[]> {
  if (!(await logAnalyticsConfigured())) return [];
  const bin = binFor(window);
  const query = `
    InsightsMetrics
    | where Namespace == "Memory" and Name == "AvailableMB"
    | summarize AvailMB = avg(Val) by bin(TimeGenerated, ${bin})
    | extend total_mb = 8192.0    // D2s_v3 has 8 GiB RAM
    | extend value = round(100.0 * (total_mb - AvailMB) / total_mb, 1)
    | order by TimeGenerated asc
    | project ts = TimeGenerated, value
  `;
  return queryMetric(query, window);
}

/**
 * Count of Syslog entries with severity Error or higher, bucketed.
 */
export async function getSyslogErrorCountSeries(
  window: MonitoringWindow = "24h",
): Promise<MetricPoint[]> {
  if (!(await logAnalyticsConfigured())) return [];
  const bin = binFor(window);
  const query = `
    Syslog
    | where SeverityLevel in ("err", "crit", "alert", "emerg")
    | summarize value = count() by bin(TimeGenerated, ${bin})
    | order by TimeGenerated asc
    | project ts = TimeGenerated, value
  `;
  return queryMetric(query, window);
}

/**
 * Latest N syslog errors. Useful for the "recent issues" panel.
 */
export async function getRecentSyslogErrors(limit = 20): Promise<SyslogEntry[]> {
  if (!(await logAnalyticsConfigured())) return [];
  const query = `
    Syslog
    | where SeverityLevel in ("err", "crit", "alert", "emerg")
    | order by TimeGenerated desc
    | take ${limit}
    | project TimeGenerated, Facility, SeverityLevel, HostName, SyslogMessage
  `;
  try {
    const env = await getPlatformEnv();
    const client = await logsClient();
    const res = await client.queryWorkspace(
      env.AZURE_LOG_ANALYTICS_WORKSPACE_ID,
      query,
      { duration: Durations.sevenDays },
    );
    const rows: SyslogEntry[] = [];
    for (const table of res.tables ?? []) {
      for (const row of table.rows ?? []) {
        rows.push({
          ts: String(row[0] ?? ""),
          facility: String(row[1] ?? ""),
          severityLevel: String(row[2] ?? ""),
          hostName: String(row[3] ?? ""),
          syslogMessage: String(row[4] ?? ""),
        });
      }
    }
    return rows;
  } catch (err) {
    console.error("[platform/log-analytics] getRecentSyslogErrors failed", err);
    return [];
  }
}

async function queryMetric(query: string, window: MonitoringWindow): Promise<MetricPoint[]> {
  try {
    const env = await getPlatformEnv();
    const client = await logsClient();
    const res = await client.queryWorkspace(
      env.AZURE_LOG_ANALYTICS_WORKSPACE_ID,
      query,
      { duration: durationFor(window) },
    );
    const points: MetricPoint[] = [];
    for (const table of res.tables ?? []) {
      for (const row of table.rows ?? []) {
        points.push({
          ts: String(row[0] ?? ""),
          value: Number(row[1] ?? 0),
        });
      }
    }
    return points;
  } catch (err) {
    console.error("[platform/log-analytics] metric query failed", err);
    return [];
  }
}
