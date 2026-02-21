import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: '4fef6af9-58a3-4022-8f2c-85bb70e68f31' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ example: 'medico@pericias.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Senha@1234' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ASSISTANT })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({ example: 'Dr. João Perito' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;
}

export class LoginDto {
  @ApiProperty({ example: '4fef6af9-58a3-4022-8f2c-85bb70e68f31' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ example: 'medico@pericias.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Senha@1234' })
  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty({ example: '4fef6af9-58a3-4022-8f2c-85bb70e68f31' })
  @IsUUID()
  userId!: string;
}

export class MfaTotpDto {
  @ApiProperty({ example: '4fef6af9-58a3-4022-8f2c-85bb70e68f31' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ description: 'Código TOTP de 6 dígitos para confirmação' })
  @IsOptional()
  @IsString()
  code?: string;
}
