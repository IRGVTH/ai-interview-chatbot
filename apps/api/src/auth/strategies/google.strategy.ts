import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
};

type GoogleOauthProfile = {
  id: string;
  displayName?: string;
  emails?: Array<{ value?: string }>;
  photos?: Array<{ value?: string }>;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error(
        'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL is not defined',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleOauthProfile,
  ): GoogleProfile {
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();

    if (!email) {
      throw new UnauthorizedException('Google account has no email');
    }

    return {
      googleId: profile.id,
      email,
      name: profile.displayName?.trim() || email,
      picture: profile.photos?.[0]?.value ?? null,
    };
  }
}
