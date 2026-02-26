const DATABASE_URL_CANDIDATES = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
  'NEON_DATABASE_URL',
] as const;

const shouldForceSsl = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();
  return !['localhost', '127.0.0.1', '::1'].includes(normalized);
};

const withSslModeIfNeeded = (value: string): string => {
  if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (shouldForceSsl(parsed.hostname) && !parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'require');
    }

    return parsed.toString();
  } catch {
    return value;
  }
};

export const resolveDatabaseUrl = (): string | null => {
  const selected = DATABASE_URL_CANDIDATES.map((key) => process.env[key]).find((value) => Boolean(value?.trim()));
  if (!selected) {
    return null;
  }

  const normalized = withSslModeIfNeeded(selected);
  process.env.DATABASE_URL = normalized;
  return normalized;
};

export const getPrismaClientOptions = () => {
  const url = resolveDatabaseUrl();
  if (!url) {
    return undefined;
  }

  return {
    datasources: {
      db: {
        url,
      },
    },
  };
};
