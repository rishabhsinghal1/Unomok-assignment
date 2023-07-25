import fs from "fs";
import path from "path";

type LogEntry = {
  timestamp: Date;
  endpoint?: string;
  statusCode?: number;
};

const logFilePath = path.join(__dirname, "data", "prod-api-prod-out.log");

function parseLogEntry(line: string): LogEntry | null {
  const regex =
    /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2} \+\d{2}:\d{2}):.*?:\s*(\d{3})|(\w+)\s*(\S*)/;

  const match = line.match(regex);
  if (!match) return null;

  const [, timestamp, statusCode, endpoint] = match;

  // Check if timestamp is undefined or null before proceeding
  if (!timestamp) return null;

  const parsedTimestamp = new Date(timestamp);

  // Check if parsedTimestamp is a valid date
  if (isNaN(parsedTimestamp.getTime())) return null;

  const parsedStatusCode = statusCode ? parseInt(statusCode, 10) : undefined;

  return {
    timestamp: parsedTimestamp,
    statusCode: parsedStatusCode,
    endpoint: endpoint || undefined,
  };
}

function countAPIEndpoints(logEntries: LogEntry[]): Record<string, number> {
  const endpointCounts: Record<string, number> = {};

  for (const entry of logEntries) {
    if (entry.endpoint) {
      endpointCounts[entry.endpoint] =
        (endpointCounts[entry.endpoint] || 0) + 1;
    }
  }

  return endpointCounts;
}

function countAPICallsPerMinute(
  logEntries: LogEntry[]
): Record<string, number> {
  const callsPerMinute: Record<string, number> = {};

  for (const entry of logEntries) {
    const minute = entry.timestamp.toISOString().slice(0, 16);
    callsPerMinute[minute] = (callsPerMinute[minute] || 0) + 1;
  }

  return callsPerMinute;
}

function countAPICallsByStatusCode(
  logEntries: LogEntry[]
): Record<string, number> {
  const callsByStatusCode: Record<string, number> = {};

  for (const entry of logEntries) {
    if (entry.statusCode) {
      const statusText =
        entry.statusCode === 404
          ? "Not found"
          : entry.statusCode === 500
          ? "Server Error"
          : "OK";
      callsByStatusCode[statusText] = (callsByStatusCode[statusText] || 0) + 1;
    }
  }

  return callsByStatusCode;
}

async function readLogData(filePath: string): Promise<LogEntry[]> {
  const logData = await fs.promises.readFile(filePath, "utf8");
  const logLines = logData.split("\n").filter((line) => line.trim() !== "");

  const logEntries: LogEntry[] = logLines
    .map(parseLogEntry)
    .filter((entry) => entry !== null) as LogEntry[];
  return logEntries;
}

function formatTable(data: Record<string, any>) {
  const tableData = Object.entries(data).map(([key, value]) => ({
    Endpoint: key,
    Count: value,
  }));
  console.table(tableData);
}

async function main() {
  try {
    const logEntries = await readLogData(logFilePath);

    const endpointCounts = countAPIEndpoints(logEntries);
    const callsPerMinute = countAPICallsPerMinute(logEntries);
    const callsByStatusCode = countAPICallsByStatusCode(logEntries);

    console.log("Endpoint Counts:");
    formatTable(endpointCounts);

    console.log("\nAPI Calls per Minute:");
    formatTable(callsPerMinute);

    console.log("\nAPI Calls by Status Code:");
    formatTable(callsByStatusCode);
  } catch (err) {
    console.error("Error occurred:", err);
  }
}

main();
