import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, validateSync } from 'class-validator';

const DATABASE_URL_CANDIDATES = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
  'NEON_DATABASE_URL',
] as const;

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsOptional()
  @IsInt()
  PORT?: number;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const selectedDatabaseUrl = DATABASE_URL_CANDIDATES
    .map((key) => config[key])
    .find((value) => typeof value === 'string' && value.trim().length > 0);

  const normalizedConfig = {
    ...config,
    DATABASE_URL: typeof selectedDatabaseUrl === 'string' ? selectedDatabaseUrl : config.DATABASE_URL,
  };

  const validatedConfig = plainToInstance(EnvironmentVariables, normalizedConfig, { enableImplicitConversion: true });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const hasDatabaseUrlError = errors.some((error) => error.property === 'DATABASE_URL');
    if (hasDatabaseUrlError) {
      throw new Error(
        `DATABASE_URL ausente. Defina uma das variáveis aceitas: ${DATABASE_URL_CANDIDATES.join(', ')}.`,
      );
    }

    throw new Error(errors.toString());
  }
  return validatedConfig;
}
