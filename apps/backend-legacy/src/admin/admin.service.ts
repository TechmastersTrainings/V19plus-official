import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { SettingsService } from '../settings/settings.service';
import { ContentService } from '../content/content.service';
import { CreateContentDto } from '../content/dto/create-content.dto';
import { UpdateContentDto } from '../content/dto/update-content.dto';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

@Injectable()
export class AdminService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly settingsService: SettingsService,
    private readonly contentService: ContentService,
  ) {}

  async getDashboard() {
    const [usersSnap, contentSnap, categoriesSnap, watchHistorySnap] = await Promise.all([
      this.firebase.firestore.collection('users').count().get(),
      this.firebase.firestore.collection('content').count().get(),
      this.firebase.firestore.collection('categories').count().get(),
      this.firebase.firestore.collection('watchHistory').count().get(),
    ]);
    return { 
      users: usersSnap.data().count, 
      content: contentSnap.data().count, 
      categories: categoriesSnap.data().count, 
      watchHistory: watchHistorySnap.data().count 
    };
  }

  getSettings() {
    return this.settingsService.getSettings();
  }

  updateSettings(data: Parameters<SettingsService['updateSettings']>[0]) {
    return this.settingsService.updateSettings(data);
  }

  async listCategories() {
    const snap = await this.firebase.firestore.collection('categories').orderBy('sortOrder', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async createCategory(data: { name: string; icon?: string; sortOrder?: number; isActive?: boolean }) {
    const slug = slugify(data.name);
    
    const snap1 = await this.firebase.firestore.collection('categories').where('name', '==', data.name).limit(1).get();
    const snap2 = await this.firebase.firestore.collection('categories').where('slug', '==', slug).limit(1).get();
    
    if (!snap1.empty || !snap2.empty) throw new ConflictException('Category already exists');

    const docRef = this.firebase.firestore.collection('categories').doc();
    const cat = {
      id: docRef.id,
      name: data.name,
      slug,
      icon: data.icon || 'movie',
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
    };
    await docRef.set(cat);
    return cat;
  }

  async updateCategory(
    id: string,
    data: { name?: string; icon?: string; sortOrder?: number; isActive?: boolean },
  ) {
    const docRef = this.firebase.firestore.collection('categories').doc(id);
    const cat = await docRef.get();
    if (!cat.exists) throw new NotFoundException('Category not found');

    const updateData: Record<string, unknown> = { ...data };
    if (data.name) updateData.slug = slugify(data.name);

    await docRef.update(updateData);
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  }

  async removeCategory(id: string) {
    const docRef = this.firebase.firestore.collection('categories').doc(id);
    const cat = await docRef.get();
    if (!cat.exists) throw new NotFoundException('Category not found');
    await docRef.delete();
    return { message: 'Category deleted' };
  }

  async listUsers() {
    const snap = await this.firebase.firestore.collection('users').orderBy('createdAt', 'desc').get();
    let users = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    
    for (let u of users) {
      const subSnap = await this.firebase.firestore.collection('subscriptions').where('userId', '==', u.id).limit(1).get();
      if (!subSnap.empty) {
        u.subscription = subSnap.docs[0].data();
      }
    }
    
    return users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt?.toDate(),
      subscription: u.subscription ? { plan: u.subscription.plan, status: u.subscription.status } : null,
    }));
  }

  async updateUserRole(userId: string, role: string) {
    if (!['USER', 'ADMIN'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }
    const docRef = this.firebase.firestore.collection('users').doc(userId);
    await docRef.update({ role });
    const u = await docRef.get();
    return { id: u.id, email: u.data()!.email, role: u.data()!.role };
  }

  async listContent() {
    const snap = await this.firebase.firestore.collection('content').orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => {
      const c = d.data() as any;
      return {
        id: d.id,
        ...c,
        genre: c.genres || c.genre || [],
        genres: undefined,
        _count: { seasons: c.seasons?.length || 0 }
      };
    });
  }

  createContent(data: CreateContentDto) {
    return this.contentService.createContent(data);
  }

  updateContent(id: string, data: UpdateContentDto) {
    return this.contentService.updateContent(id, data);
  }

  deleteContent(id: string) {
    return this.contentService.deleteContent(id);
  }
}
