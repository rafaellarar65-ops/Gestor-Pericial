import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, LogoutDto, MfaTotpDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Cadastro de usuário' })
  register(@Body() dto: RegisterDto) {
    return this.service.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login com email/senha' })
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Renova access token com refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.service.refresh(dto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout da sessão atual' })
  logout(@Body() dto: LogoutDto) {
    return this.service.logout(dto.userId);
  }

  @Post('mfa-totp')
  @ApiOperation({ summary: 'Provisiona e confirma MFA por TOTP' })
  mfaTotp(@Body() dto: MfaTotpDto) {
    return this.service.mfaTotp(dto);
  }
}
