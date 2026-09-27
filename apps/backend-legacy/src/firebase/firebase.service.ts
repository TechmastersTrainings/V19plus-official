import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private db!: admin.firestore.Firestore;
  private auth!: admin.auth.Auth;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    // Only initialize if not already initialized
    if (!admin.apps.length) {
      const base64ServiceAccount = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_BASE64');
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID') || 'v19-plus';
      const storageBucket = this.configService.get<string>('FIREBASE_STORAGE_BUCKET') || `${projectId}.firebasestorage.app`;

      if (base64ServiceAccount) {
        try {
          const serviceAccount = JSON.parse(
            Buffer.from(base64ServiceAccount, 'base64').toString('utf8'),
          );

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: projectId,
            storageBucket: storageBucket,
          });
        } catch (error) {
          console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64', error);
        }
      } else {
        console.warn('Initializing Firebase Admin SDK without explicit credentials. (Assuming default credentials)');
        admin.initializeApp({
          projectId: projectId,
          storageBucket: storageBucket,
        });
      }
    }

    this.db = getFirestore(admin.app(), 'v19plusdb');
    this.auth = admin.auth();
  }

  get firestore(): admin.firestore.Firestore {
    return this.db;
  }

  get firebaseAuth(): admin.auth.Auth {
    return this.auth;
  }

  get storage(): admin.storage.Storage {
    return admin.storage();
  }
}
