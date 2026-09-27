import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '../firebase/firebase.service';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private firebase: FirebaseService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async signup(email: string, passwordPlain: string, name?: string) {
    const snap = await this.firebase.firestore.collection('users').where('email', '==', email).limit(1).get();
    if (!snap.empty) throw new ConflictException('Email already exists');

    const adminEmails = (process.env.ADMIN_EMAILS || 'v19plus04@gmail.com').toLowerCase().split(',').map(e => e.trim());
    const role = adminEmails.includes(email.toLowerCase()) ? 'ADMIN' : 'USER';

    const hashedPassword = await bcrypt.hash(passwordPlain, 10);
    const docRef = this.firebase.firestore.collection('users').doc();
    const user = {
      id: docRef.id,
      email,
      passwordHash: hashedPassword,
      name: name || 'User',
      role,
      createdAt: new Date(),
    };
    await docRef.set(user);

    return user;
  }

  async login(email: string, passwordPlain: string, deviceId: string) {
    const snap = await this.firebase.firestore.collection('users').where('email', '==', email).limit(1).get();
    if (snap.empty) throw new UnauthorizedException('Invalid credentials');
    
    const user = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    // Auto-promote configured admin email
    const adminEmails = (process.env.ADMIN_EMAILS || 'v19plus04@gmail.com').toLowerCase().split(',').map(e => e.trim());
    if (adminEmails.includes(email.toLowerCase()) && user.role !== 'ADMIN') {
      user.role = 'ADMIN';
      await this.firebase.firestore.collection('users').doc(user.id).update({ role: 'ADMIN' });
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'secret',
      expiresIn: '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      expiresIn: '7d',
    });

    // Store refresh token in Redis for device management and global signout
    await this.redisService.set(`refresh_token:${user.id}:${deviceId}`, refreshToken, 60 * 60 * 24 * 7);

    return { user, accessToken, refreshToken };
  }

  async refresh(oldRefreshToken: string, deviceId: string) {
    try {
      const payload = this.jwtService.verify(oldRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      });
      
      const storedToken = await this.redisService.get(`refresh_token:${payload.sub}:${deviceId}`);
      if (!storedToken || storedToken !== oldRefreshToken) {
        throw new UnauthorizedException('Session revoked or invalid');
      }

      const newPayload = { sub: payload.sub, role: payload.role };
      const newAccessToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_ACCESS_SECRET || 'secret',
        expiresIn: '15m',
      });
      
      return { accessToken: newAccessToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, deviceId: string) {
    await this.redisService.del(`refresh_token:${userId}:${deviceId}`);
  }

  setCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  clearCookies(res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
  }

  async getMe(userId: string) {
    const doc = await this.firebase.firestore.collection('users').doc(userId).get();
    if (!doc.exists) throw new UnauthorizedException('User not found');
    
    const subQuery = await this.firebase.firestore.collection('subscriptions').where('userId', '==', userId).limit(1).get();
    const subscription = subQuery.empty ? null : { id: subQuery.docs[0].id, ...subQuery.docs[0].data() };

    const user = { id: doc.id, ...doc.data() } as any;
    const { passwordHash, ...safeUser } = user;
    safeUser.subscription = subscription;
    return safeUser;
  }

  async checkEmail(email: string) {
    const snap = await this.firebase.firestore.collection('users').where('email', '==', email).limit(1).get();
    return { exists: !snap.empty };
  }

  async validateFirebaseToken(idToken: string) {
    try {
      const decoded = await this.firebase.firebaseAuth.verifyIdToken(idToken);
      const email = decoded.email || null;
      const phoneNumber = (decoded as any).phone_number || (decoded as any).phoneNumber || null;
      const firebaseUid = decoded.uid;

      const adminEmails = (process.env.ADMIN_EMAILS || 'v19plus04@gmail.com').toLowerCase().split(',').map(e => e.trim());
      const isAdminEmail = email ? adminEmails.includes(email.toLowerCase()) : false;

      // Try finding user by firebaseUid, email, or phoneNumber
      let snap = await this.firebase.firestore.collection('users').where('firebaseUid', '==', firebaseUid).limit(1).get();
      if (snap.empty && email) {
        snap = await this.firebase.firestore.collection('users').where('email', '==', email).limit(1).get();
      }
      if (snap.empty && phoneNumber) {
        snap = await this.firebase.firestore.collection('users').where('phoneNumber', '==', phoneNumber).limit(1).get();
      }

      let user: any;
      if (snap.empty) {
        const docRef = this.firebase.firestore.collection('users').doc(firebaseUid);
        user = {
          id: firebaseUid,
          email,
          phoneNumber,
          name: decoded.name || (email ? email.split('@')[0] : (phoneNumber ? `User ${phoneNumber.slice(-4)}` : 'User')),
          avatarUrl: decoded.picture || undefined,
          firebaseUid,
          role: isAdminEmail ? 'ADMIN' : 'USER',
          isVerified: true,
          createdAt: new Date(),
        };
        await docRef.set(user);
      } else {
        user = { id: snap.docs[0].id, ...snap.docs[0].data() };
        const updates: any = {};
        if (!user.firebaseUid) updates.firebaseUid = firebaseUid;
        if (!user.phoneNumber && phoneNumber) updates.phoneNumber = phoneNumber;
        if (!user.email && email) updates.email = email;
        if (isAdminEmail && user.role !== 'ADMIN') {
          updates.role = 'ADMIN';
          user.role = 'ADMIN';
        }
        if (Object.keys(updates).length > 0) {
          updates.isVerified = true;
          await this.firebase.firestore.collection('users').doc(user.id).update(updates);
        }
      }

      const payload = { sub: user.id, role: user.role };
      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_ACCESS_SECRET || 'secret',
        expiresIn: '15m',
      });
      const refreshToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
        expiresIn: '7d',
      });

      await this.redisService.set(`refresh_token:${user.id}:firebase-login`, refreshToken, 60 * 60 * 24 * 7);

      const { passwordHash, ...safeUser } = user;
      return { user: safeUser, accessToken, refreshToken };
    } catch (e: any) {
      throw new UnauthorizedException(e?.message || 'Invalid Firebase token');
    }
  }

  async validateGoogleUser(profile: { email: string; name: string; googleId: string; avatarUrl?: string }) {
    const adminEmails = (process.env.ADMIN_EMAILS || 'v19plus04@gmail.com').toLowerCase().split(',').map(e => e.trim());
    const isAdminEmail = adminEmails.includes(profile.email.toLowerCase());

    const snap = await this.firebase.firestore.collection('users').where('email', '==', profile.email.toLowerCase()).limit(1).get();
    
    if (snap.empty) {
      const docRef = this.firebase.firestore.collection('users').doc();
      const user = {
        id: docRef.id,
        email: profile.email.toLowerCase(),
        name: profile.name,
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl || null,
        role: isAdminEmail ? 'ADMIN' : 'USER',
        isVerified: true,
        authProvider: 'google',
        createdAt: new Date(),
      };
      await docRef.set(user);
      return user;
    } else {
      let user = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
      const updates: any = {};
      if (!user.googleId) updates.googleId = profile.googleId;
      if (profile.avatarUrl && !user.avatarUrl) updates.avatarUrl = profile.avatarUrl;
      if (!user.isVerified) updates.isVerified = true;
      if (isAdminEmail && user.role !== 'ADMIN') {
        updates.role = 'ADMIN';
        user.role = 'ADMIN';
      }
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        await this.firebase.firestore.collection('users').doc(user.id).update(updates);
      }
      return { ...user, ...updates };
    }
  }
}
