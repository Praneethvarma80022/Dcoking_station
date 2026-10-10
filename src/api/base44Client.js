const mockUser = {
  id: 'local-operator',
  email: 'operator@local.test',
  full_name: 'Local Operator',
};

const mockBase44 = {
  app: {
    getPublicSettings: async () => ({ id: 'local-app', public_settings: {} }),
  },
  auth: {
    me: async () => mockUser,
    loginViaEmailPassword: async () => mockUser,
    loginWithProvider: (_provider, returnTo = '/') => {
      window.location.href = returnTo;
    },
    register: async () => mockUser,
    verifyOtp: async () => ({ access_token: 'local-token' }),
    resendOtp: async () => undefined,
    resetPasswordRequest: async () => undefined,
    resetPassword: async () => undefined,
    setToken: () => undefined,
    logout: (returnTo) => {
      if (returnTo) window.location.href = '/login';
    },
    redirectToLogin: (returnTo = '/') => {
      window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
    },
  },
};

export const base44 = mockBase44;
