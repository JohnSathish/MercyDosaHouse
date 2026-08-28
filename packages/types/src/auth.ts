export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  roles: string[];
  permissions: string[];
  isSuperAdmin?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OtpSendRequest {
  phone: string;
}

export interface OtpVerifyRequest {
  phone: string;
  otp: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface EmailOtpSendRequest {
  email: string;
}

export interface EmailOtpVerifyRequest {
  sessionId: string;
  otp: string;
}

export interface EmailOtpResendRequest {
  sessionId: string;
}

export interface EmailOtpSendResponse {
  sessionId: string;
  maskedEmail: string;
  expiresIn: number;
  cooldownSeconds: number;
}

export interface AuthConfigDto {
  emailOtp: boolean;
  google: boolean;
  mobileOtp: boolean;
  guest: boolean;
  otpExpirySeconds: number;
  resendCooldownSeconds: number;
  maxAttempts: number;
  senderName: string;
  senderEmail: string;
  websiteUrl: string;
  emailStatus?: {
    configured: boolean;
    provider: string;
    message: string;
    missing?: string[];
    fromDisplay?: string;
  };
}

export interface AuthMethodsDto {
  emailOtp: boolean;
  google: boolean;
  mobileOtp: boolean;
  guest: boolean;
  otpExpirySeconds: number;
  resendCooldownSeconds: number;
  googleClientId: string | null;
}
