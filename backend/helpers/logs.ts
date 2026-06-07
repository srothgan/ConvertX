type LogLevel = "log" | "info" | "warn" | "error";

type LogEntry = {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: string;
};

const maxLogEntries = 300;
const logEntries: LogEntry[] = [];
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

const stringifyLogPart = (part: unknown) => {
  if (part instanceof Error) {
    return part.stack ?? part.message;
  }

  if (typeof part === "string") {
    return part;
  }

  try {
    return JSON.stringify(part);
  } catch {
    return String(part);
  }
};

const pushLogEntry = (level: LogLevel, parts: unknown[]) => {
  logEntries.unshift({
    id: crypto.randomUUID(),
    level,
    message: parts.map(stringifyLogPart).join(" "),
    timestamp: new Date().toISOString(),
  });

  if (logEntries.length > maxLogEntries) {
    logEntries.length = maxLogEntries;
  }
};

const capture = (level: LogLevel, original: (...args: unknown[]) => void) => {
  return (...parts: unknown[]) => {
    pushLogEntry(level, parts);
    original(...parts);
  };
};

console.log = capture("log", originalConsole.log);
console.info = capture("info", originalConsole.info);
console.warn = capture("warn", originalConsole.warn);
console.error = capture("error", originalConsole.error);

export const getLogEntries = () => logEntries;
