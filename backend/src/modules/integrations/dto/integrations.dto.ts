import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CalendarSyncMode, CalendarSyncStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class SaveIntegrationSettingsDto {
  @ApiProperty({ example: 'DATAJUD' })
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @ApiProperty({ type: Object })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class DatajudCnjDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cnj!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periciaId?: string;
}

export class DatajudSyncDto {
  @ApiProperty()
  @IsUUID()
  periciaId!: string;
}

export class SisperjudConsultDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  query!: string;
}

export class TjmgUtilsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cnj!: string;
}

export class GoogleOAuthConnectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class GoogleOAuthCallbackDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
}

export class SelectGoogleCalendarDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  calendarId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  calendarName?: string;
}

export class GoogleSyncSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  syncEvents?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  syncTasks?: boolean;

  @ApiPropertyOptional({ enum: CalendarSyncMode })
  @IsOptional()
  @IsEnum(CalendarSyncMode)
  mode?: CalendarSyncMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class GoogleSyncRunDto {
  @ApiProperty({ enum: ['push', 'pull'] })
  @IsIn(['push', 'pull'])
  direction!: 'push' | 'pull';
}

export class ResolveSyncConflictDto {
  @ApiProperty({ enum: ['LOCAL', 'EXTERNAL'] })
  @IsIn(['LOCAL', 'EXTERNAL'])
  resolution!: 'LOCAL' | 'EXTERNAL';
}

export class ListSyncAuditDto {
  @ApiPropertyOptional({ enum: CalendarSyncStatus })
  @IsOptional()
  @IsEnum(CalendarSyncStatus)
  status?: CalendarSyncStatus;
}
