import { Controller, Post, Body, Res, Req, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('check-email')
  async checkEmail(@Body('email') email: string) {
    return this.authService.checkEmail(email);
  }

  @Post('firebase')
  async firebaseAuth(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const token = body.accessToken || body.idToken;
    const { user, accessToken, refreshToken } = await this.authService.validateFirebaseToken(token);
    this.authService.setCookies(res, accessToken, refreshToken);
    return { user, accessToken, refreshToken };
  }

  @Post('signup')
  async signup(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.signup(body.email, body.password, body.name);
    const { accessToken, refreshToken } = await this.authService.login(body.email, body.password, body.deviceId || 'unknown');
    this.authService.setCookies(res, accessToken, refreshToken);
    return { user, accessToken, refreshToken };
  }

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken, refreshToken } = await this.authService.login(body.email, body.password, body.deviceId || 'unknown');
    this.authService.setCookies(res, accessToken, refreshToken);
    return { user, accessToken, refreshToken };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: any) {
    const refreshToken = req.cookies?.['refreshToken'] || body?.refreshToken;
    if (!refreshToken) {
      return { success: false };
    }
    const { accessToken } = await this.authService.refresh(refreshToken, body?.deviceId || 'unknown');
    
    // Set the new access token cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    return { success: true, accessToken };
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@CurrentUser('userId') userId: string, @Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: any) {
    await this.authService.logout(userId, body?.deviceId || 'unknown');
    this.authService.clearCookies(res);
    return { success: true };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@CurrentUser('userId') userId: string) {
    // Return full user detail from DB
    return this.authService.getMe(userId);
  }

  @Get('google')
  @UseGuards(PassportAuthGuard('google'))
  async googleAuth(@Req() req: Request) {}

  @Get('google/callback')
  @UseGuards(PassportAuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const frontendBase = (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://v19plus-web.vercel.app').replace(/\/$/, '');
    
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.redirect(`${frontendBase}/login?error=google_auth_failed`);
      }

      const payload = { sub: user.id, role: user.role };
      const accessToken = this.authService['jwtService'].sign(payload, {
        secret: process.env.JWT_ACCESS_SECRET || 'secret',
        expiresIn: '15m',
      });
      const refreshToken = this.authService['jwtService'].sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
        expiresIn: '7d',
      });

      const deviceId = 'google-oauth-login';
      await this.authService['redisService'].set(`refresh_token:${user.id}:${deviceId}`, refreshToken, 60 * 60 * 24 * 7);

      this.authService.setCookies(res, accessToken, refreshToken);
      
      return res.redirect(`${frontendBase}/browse`);
    } catch (err) {
      return res.redirect(`${frontendBase}/login?error=google_auth_error`);
    }
  }
}
