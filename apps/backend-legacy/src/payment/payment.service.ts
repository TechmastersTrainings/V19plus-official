import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class PaymentService {
  constructor(private readonly firebase: FirebaseService) {}

  async listPayments(userId: string) {
    const snap = await this.firebase.firestore.collection('payments')
      .where('userId', '==', userId)
      .get();
      
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return list.sort((a: any, b: any) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  }

  async getRevenueAnalytics() {
    const snap = await this.firebase.firestore.collection('payments')
      .where('status', '==', 'SUCCESS')
      .get();

    const payments = snap.docs.map(d => {
      const data = d.data();
      return { amount: data.amount || 0, createdAt: data.createdAt?.toDate() || new Date() };
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalRevenue,
      paymentCount: payments.length,
      history: payments,
    };
  }
}

