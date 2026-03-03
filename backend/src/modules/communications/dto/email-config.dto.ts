import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class EmailConfigDto {
  @ApiProperty()
  @IsString()
  smtpHost!: string;

  @ApiProperty({ example: 587 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort!: number;

  @ApiProperty({ default: true })
  @Type(() => Boolean)
  @IsBoolean()
  smtpSecure!: boolean;

  @ApiProperty()
  @IsString()
  imapHost!: string;

  @ApiProperty({ example: 993 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  imapPort!: number;

  @ApiProperty({ default: true })
  @Type(() => Boolean)
  @IsBoolean()
  imapSecure!: boolean;

  @ApiProperty()
  @IsString()
  login!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}

export class UpsertUolhostEmailConfigDto extends EmailConfigDto {
  @ApiProperty()
  @IsEmail()
  fromEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromName?: string;
}
