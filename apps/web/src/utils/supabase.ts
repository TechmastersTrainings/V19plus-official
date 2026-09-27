/**
 * Supabase has been removed from this project.
 * Google OAuth is now handled entirely by the backend Passport.js strategy.
 * This stub prevents any remaining import statements from causing build errors.
 */
export const supabase = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: async () => ({ error: new Error('Supabase auth has been removed. Use Google OAuth via the backend.') }),
    signOut: async () => ({}),
    getSession: async () => ({ data: { session: null }, error: null }),
  },
};
