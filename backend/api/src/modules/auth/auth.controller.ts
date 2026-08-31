import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/guards';
import { AppChannelService } from '../../common/app-channel.service';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class OtpSendDto {
  @IsString()
  phone: string;
}

class OtpVerifyDto {
  @IsString()
  phone: string;

  @IsString()
  otp: string;
}

class EmailOtpSendDto {
  @IsEmail()
  email: string;
}

class EmailOtpVerifyDto {
  @IsString()
  sessionId: string;

  @IsString()
  otp: string;
}

class EmailOtpResendDto {
  @IsString()
  sessionId: string;
}

class GoogleAuthDto {
  @IsString()
  idToken: string;
}

class RefreshDto {
  @IsString()
  refreshToken: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private appChannel: AppChannelService,
  ) {}

  @Public()
  @SkipThrottle()
  @Get('otp/status')
  otpStatus() {
    return this.authService.getOtpStatus();
  }

  @Public()
  @SkipThrottle()
  @Get('methods')
  authMethods() {
    return this.authService.getAuthMethods();
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('otp/send')
  sendOtp(@Body() dto: OtpSendDto) {
    return this.authService.sendOtp(dto.phone);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('otp/verify')
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto.phone, dto.otp);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('otp/email/send')
  sendEmailOtp(@Body() dto: EmailOtpSendDto, @Req() req: { ip?: string }) {
    return this.authService.sendCustomerEmailOtp(dto.email, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('otp/email/verify')
  verifyEmailOtp(@Body() dto: EmailOtpVerifyDto) {
    return this.authService.verifyCustomerEmailOtp(dto.sessionId, dto.otp);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('otp/email/resend')
  resendEmailOtp(@Body() dto: EmailOtpResendDto, @Req() req: { ip?: string }) {
    return this.authService.resendCustomerEmailOtp(dto.sessionId, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('google')
  googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto.idToken);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('app-channel')
  issueAppChannel(@Req() req: Request) {
    return this.appChannel.issueAppToken(req);
  }
}
