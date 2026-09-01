import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppChannelService } from './app-channel.service';
import { AppChannelInterceptor } from './app-channel.interceptor';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'dev-secret',
        signOptions: { expiresIn: config.get('JWT_ACCESS_EXPIRES') || '15m' },
      }),
    }),
  ],
  providers: [AppChannelService, { provide: APP_INTERCEPTOR, useClass: AppChannelInterceptor }],
  exports: [AppChannelService, JwtModule],
})
export class AppChannelModule {}
