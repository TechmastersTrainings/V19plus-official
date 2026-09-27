import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'MISSING_GOOGLE_CLIENT_ID',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'MISSING_GOOGLE_CLIENT_SECRET',
      callbackURL: process.env.GOOGLE_REDIRECT_URI ||
        `${(process.env.BACKEND_URL || 'https://v19plus-api.onrender.com').replace(/\/$/, '')}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { name, emails, photos, id } = profile;
    const email = emails[0].value;
    const displayName = name.givenName + ' ' + name.familyName;
    const avatarUrl = photos[0].value;
    
    // Pass it to the auth service to find or create the user
    const user = await this.authService.validateGoogleUser({
      email,
      name: displayName,
      googleId: id,
      avatarUrl
    });

    done(null, user);
  }
}
