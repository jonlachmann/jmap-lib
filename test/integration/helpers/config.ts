import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface IntegrationUserConfig {
  label: string;
  baseUrl: string;
  username: string;
  password: string;
  accountId?: string;
}

export interface TwoUserIntegrationConfig {
  user1: IntegrationUserConfig;
  user2: IntegrationUserConfig;
}

const SINGLE_USER_ENV = {
  baseUrl: "JMAP_BASE_URL",
  username: "JMAP_USERNAME",
  password: "JMAP_PASSWORD",
  accountId: "JMAP_ACCOUNT_ID",
} as const;

const TWO_USER_ENV = {
  user1: {
    baseUrl: "JMAP_USER1_BASE_URL",
    username: "JMAP_USER1_USERNAME",
    password: "JMAP_USER1_PASSWORD",
    accountId: "JMAP_USER1_ACCOUNT_ID",
  },
  user2: {
    baseUrl: "JMAP_USER2_BASE_URL",
    username: "JMAP_USER2_USERNAME",
    password: "JMAP_USER2_PASSWORD",
    accountId: "JMAP_USER2_ACCOUNT_ID",
  },
} as const;

loadIntegrationEnvFile();

export function hasSingleUserIntegrationConfig(): boolean {
  return getSingleUserIntegrationSkipReason() === undefined;
}

export function getSingleUserIntegrationSkipReason(): string | undefined {
  const missing = getMissingEnvVars(SINGLE_USER_ENV);
  if (missing.length === 0) {
    return undefined;
  }

  return `integration config missing: ${missing.join(", ")}`;
}

export function loadSingleUserIntegrationConfig(): IntegrationUserConfig {
  return loadUserConfig("single-user", SINGLE_USER_ENV);
}

export function hasTwoUserIntegrationConfig(): boolean {
  return getTwoUserIntegrationSkipReason() === undefined;
}

export function getTwoUserIntegrationSkipReason(): string | undefined {
  const missing = [
    ...getMissingEnvVars(TWO_USER_ENV.user1),
    ...getMissingEnvVars(TWO_USER_ENV.user2),
  ];

  if (missing.length === 0) {
    return undefined;
  }

  return `two-user integration config missing: ${missing.join(", ")}`;
}

export function loadTwoUserIntegrationConfig(): TwoUserIntegrationConfig {
  return {
    user1: loadUserConfig("user1", TWO_USER_ENV.user1),
    user2: loadUserConfig("user2", TWO_USER_ENV.user2),
  };
}

function loadUserConfig(
  label: string,
  envKeys: {
    baseUrl: string;
    username: string;
    password: string;
    accountId: string;
  },
): IntegrationUserConfig {
  const missing = getMissingEnvVars(envKeys);
  if (missing.length > 0) {
    throw new Error(`${label} integration config is incomplete: missing ${missing.join(", ")}`);
  }

  return {
    label,
    baseUrl: readRequiredEnv(envKeys.baseUrl),
    username: readRequiredEnv(envKeys.username),
    password: readRequiredEnv(envKeys.password),
    accountId: readOptionalEnv(envKeys.accountId),
  };
}

function getMissingEnvVars(envKeys: {
  baseUrl: string;
  username: string;
  password: string;
  accountId: string;
}): string[] {
  return [envKeys.baseUrl, envKeys.username, envKeys.password].filter((key) => !readOptionalEnv(key));
}

function readRequiredEnv(name: string): string {
  const value = readOptionalEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function loadIntegrationEnvFile(): void {
  const envFilePath = resolve(process.cwd(), ".env.integration");
  if (!existsSync(envFilePath)) {
    return;
  }

  const source = readFileSync(envFilePath, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry) {
      continue;
    }

    if (process.env[entry.key] === undefined) {
      process.env[entry.key] = entry.value;
    }
  }
}

function parseEnvLine(line: string): { key: string; value: string } | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return undefined;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex <= 0) {
    return undefined;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (!key) {
    return undefined;
  }

  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}
