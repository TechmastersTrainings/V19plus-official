import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class UserService {
  constructor(private readonly firebase: FirebaseService) {}

  async getProfile(userId: string) {
    const doc = await this.firebase.firestore.collection('users').doc(userId).get();
    if (!doc.exists) throw new NotFoundException('User not found');
    const data = doc.data()!;
    
    const subQuery = await this.firebase.firestore.collection('subscriptions').where('userId', '==', userId).limit(1).get();
    const subscription = subQuery.empty ? null : subQuery.docs[0].data();

    return {
      id: doc.id,
      email: data.email,
      name: data.name,
      avatarUrl: data.avatarUrl,
      role: data.role,
      isVerified: data.isVerified,
      createdAt: data.createdAt?.toDate(),
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd?.toDate(),
      } : null,
    };
  }

  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string }) {
    await this.firebase.firestore.collection('users').doc(userId).update(data as any);
    const doc = await this.firebase.firestore.collection('users').doc(userId).get();
    const docData = doc.data()!;
    return { id: doc.id, email: docData.email, name: docData.name, avatarUrl: docData.avatarUrl };
  }

  async listProfiles(userId: string) {
    const snap = await this.firebase.firestore.collection('profiles').where('userId', '==', userId).get();
    const list = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }));
    return list.sort((a: any, b: any) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
  }

  async createProfile(userId: string, data: { name: string; avatarColor?: string; isKids?: boolean; pin?: string }) {
    const snap = await this.firebase.firestore.collection('profiles').where('userId', '==', userId).get();
    if (snap.size >= 5) {
      throw new BadRequestException('Maximum 5 profiles allowed');
    }

    const docRef = this.firebase.firestore.collection('profiles').doc();
    const profile = {
      id: docRef.id,
      userId,
      ...data,
      createdAt: new Date(),
    };
    await docRef.set(profile);
    return profile;
  }

  async deleteProfile(userId: string, profileId: string) {
    const docRef = this.firebase.firestore.collection('profiles').doc(profileId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.userId !== userId) throw new NotFoundException('Profile not found');
    await docRef.delete();
    return { message: 'Profile deleted' };
  }

  async listDevices(userId: string) {
    const snap = await this.firebase.firestore.collection('devices').where('userId', '==', userId).get();
    const list = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }));
    return list.sort((a: any, b: any) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async registerDevice(userId: string, data: { deviceName: string; deviceType: string; ipAddress: string }) {
    const docRef = this.firebase.firestore.collection('devices').doc();
    const device = {
      id: docRef.id,
      userId,
      ...data,
      createdAt: new Date(),
    };
    await docRef.set(device);
    return device;
  }

  async deleteDevice(userId: string, deviceId: string) {
    const docRef = this.firebase.firestore.collection('devices').doc(deviceId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.userId !== userId) throw new NotFoundException('Device not found');
    await docRef.delete();
    return { message: 'Device revoked' };
  }
}

