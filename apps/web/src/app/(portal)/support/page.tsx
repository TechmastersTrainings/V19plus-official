'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { HelpCircle, Mail, MessageSquare, ArrowLeft, Send, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQItem[] = [
  {
    category: 'Account & Subscription',
    question: 'How do I cancel my V19Plus subscription?',
    answer: 'V19Plus is currently operating on a free tier, meaning all registered accounts can stream without active paid subscriptions. If we introduce premium plans in the future, you will be able to cancel at any time from your Account Settings page under "Billing".'
  },
  {
    category: 'Account & Subscription',
    question: 'How can I permanently delete my account and data?',
    answer: 'You can request account deletion by navigating to the "Delete Account" option in your settings menu, or by emailing our legal team at support@v19plus.app. Deletion requests are processed within 7 business days.'
  },
  {
    category: 'Streaming & Playback',
    question: 'Why is the video buffering or load times slow?',
    answer: 'Streaming speeds depend on your internet connection. We recommend an active download speed of at least 5 Mbps for HD quality. If buffering persists, try lowering the video quality on the player, restarting your internet router, or clearing your browser/app cache.'
  },
  {
    category: 'Streaming & Playback',
    question: 'Which devices are supported by V19Plus?',
    answer: 'V19Plus can be accessed on any modern desktop or mobile browser. We also provide a native Android app (.apk) that can be installed on Android devices. iOS support is currently in development.'
  },
  {
    category: 'Troubleshooting',
    question: 'The Android APK won\'t open or keeps stopping, what do I do?',
    answer: 'This is usually caused by installing the new APK over an older conflicting package. Please completely uninstall the V19+ app from your phone first, download the latest version (v1.0.5 or newer) from Google Play Store or your workspace, and install it fresh.'
  },
  {
    category: 'Troubleshooting',
    question: 'I cannot log in, how do I reset my password?',
    answer: 'On the Sign In page, click "Forgot Password" to receive a password reset link at your registered email address. If you logged in using Google authentication, please verify your login state directly on the Google portal.'
  }
];

export default function SupportPage() {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categories = ['All', 'Account & Subscription', 'Streaming & Playback', 'Troubleshooting'];

  const filteredFAQs = activeCategory === 'All' 
    ? FAQS 
    : FAQS.filter(faq => faq.category === activeCategory);

  const handleToggleFAQ = (index: number) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    // Simulate API request to backend support ticketing system
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast.success('Your message has been sent successfully! 📨');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0A0806] pt-28 pb-20 px-4 md:px-8 relative overflow-hidden">
      {/* Background radial glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-n-red/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#FF5C00]/5 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">Help Center & Support</h1>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
            Find answers to frequently asked questions or get in touch directly with our technical support team.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* FAQ/Help Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#FF5C00]/10 border border-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00]">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold text-white">Frequently Asked Questions</h2>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => { setActiveCategory(category); setOpenFAQIndex(null); }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    activeCategory === category
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* FAQ Accordions */}
            <div className="space-y-3">
              {filteredFAQs.map((faq, index) => {
                const isOpen = openFAQIndex === index;
                return (
                  <div 
                    key={index} 
                    className="border border-white/10 bg-[#12100E] rounded-2xl overflow-hidden transition-all duration-300"
                  >
                    <button
                      onClick={() => handleToggleFAQ(index)}
                      className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 font-semibold text-white hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm sm:text-base">{faq.question}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 text-sm text-gray-400 border-t border-white/5 leading-relaxed bg-[#161412]/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact Us Form */}
          <div className="bg-[#12100E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Contact Us</h2>
                <p className="text-2xs text-gray-400">Send a message to our support desk</p>
              </div>
            </div>

            {submitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Ticket Submitted</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Thank you for reaching out! A ticket has been created and our support agents will respond to you shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/10 transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-2xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00] transition-colors"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00] transition-colors"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00] transition-colors"
                    placeholder="What is your issue?"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Message</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00] transition-colors resize-none"
                    placeholder="Describe your request in detail..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#FF5C00] hover:bg-[#FF7A00] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/25"
                >
                  {isSubmitting ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
