'use client';

import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CreditCard, Loader2 } from 'lucide-react';

export interface RazorpayCheckoutButtonProps {
  amount: number; // in paise (e.g., 29900 for ₹299.00)
  currency?: string;
  name?: string;
  description?: string;
  receipt?: string;
  notes?: Record<string, string>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  buttonText?: string;
  className?: string;
  disabled?: boolean;
  onSuccess?: (verificationResult: {
    order_id: string;
    payment_id: string;
    status: string;
    message: string;
  }) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
}

export function RazorpayCheckoutButton({
  amount,
  currency = 'INR',
  name = 'V19PLUS',
  description = 'Standard Razorpay Payment',
  receipt,
  notes,
  prefill,
  buttonText = 'Pay with Razorpay',
  className = '',
  disabled = false,
  onSuccess,
  onError,
  onCancel,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    if (disabled || loading) return;

    if (amount < 100) {
      toast.error('Minimum payment amount is ₹1.00 (100 paise).');
      return;
    }

    setLoading(true);

    try {
      // 1. Load Razorpay Checkout Script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // 2. Step 1: Backend - Create Order (POST /api/create-order)
      const orderRes = await axios.post('/api/create-order', {
        amount,
        currency,
        receipt,
        notes,
      });

      const orderData = orderRes.data;
      if (!orderData || !orderData.order_id) {
        throw new Error('Failed to retrieve order ID from server.');
      }

      const keyId =
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        orderData.key_id ||
        'rzp_test_TlZexudG496RM2';

      // 3. Step 2: Frontend - Launch Razorpay Modal with order_id
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || currency,
        name,
        description,
        order_id: orderData.order_id,
        prefill: {
          name: prefill?.name || '',
          email: prefill?.email || '',
          contact: prefill?.contact || '',
        },
        notes: notes || {},
        theme: {
          color: '#E50914',
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            toast.loading('Verifying payment signature...');

            // 4. Step 3: Backend - Verify Signature (POST /api/verify-payment)
            const verifyRes = await axios.post('/api/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.dismiss();
            toast.success('Payment verified successfully!');
            setLoading(false);

            if (onSuccess) {
              onSuccess(verifyRes.data);
            }
          } catch (verifyErr: any) {
            toast.dismiss();
            setLoading(false);
            const errorMsg =
              verifyErr.response?.data?.detail ||
              verifyErr.message ||
              'Payment signature verification failed.';
            toast.error(errorMsg);
            if (onError) onError(verifyErr);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast('Payment cancelled by user.', { icon: 'ℹ️' });
            if (onCancel) onCancel();
          },
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);

      rzpInstance.on('payment.failed', (failedResponse: any) => {
        setLoading(false);
        const failDescription =
          failedResponse.error?.description || 'Transaction declined by payment gateway.';
        toast.error(`Payment failed: ${failDescription}`);
        if (onError) onError(failedResponse);
      });

      rzpInstance.open();
    } catch (err: any) {
      setLoading(false);
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Could not initiate Razorpay checkout.';
      toast.error(msg);
      if (onError) onError(err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={disabled || loading}
      className={
        className ||
        'inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#E50914] hover:bg-[#B80710] disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98]'
      }
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5" />
          <span>{buttonText}</span>
        </>
      )}
    </button>
  );
}
export default RazorpayCheckoutButton;
