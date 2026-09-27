import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private firebase: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let token = request.cookies?.['accessToken'];
    if (!token && request.headers.authorization?.startsWith('Bearer ')) {
      token = request.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    // 1. Try verifying as NestJS internal JWT
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'secret'
      });
      request.user = { id: payload.sub, userId: payload.sub, role: payload.role };
      return true;
    } catch {
      // Not a valid NestJS JWT, proceed to try Firebase ID Token
    }

    // 2. Try verifying as Firebase ID Token
    try {
      const decoded = await this.firebase.firebaseAuth.verifyIdToken(token);
      const email = decoded.email || '';
      const adminEmails = (process.env.ADMIN_EMAILS || 'v19plus04@gmail.com').toLowerCase().split(',').map(e => e.trim());
      let role = (email && adminEmails.includes(email.toLowerCase())) ? 'ADMIN' : 'USER';
      
      if (role !== 'ADMIN') {
        try {
          const userDoc = await this.firebase.firestore.collection('users').doc(decoded.uid).get();
          if (userDoc.exists && userDoc.data()?.role === 'ADMIN') {
            role = 'ADMIN';
          }
        } catch (e) {}
      }

      request.user = { id: decoded.uid, userId: decoded.uid, role };
      return true;
    } catch (firebaseErr: any) {
      this.logger.warn(`AuthGuard verification failure: ${firebaseErr?.message || firebaseErr}`);
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
