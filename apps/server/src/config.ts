function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env variable ${name}`);
  return value;
}

export const config = {
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },
  get jwtSecret() {
    return required('JWT_SECRET');
  },
  get googleClientId() {
    return process.env.GOOGLE_CLIENT_ID || null;
  },
  get devLogin() {
    return !this.isProduction && process.env.DEV_LOGIN === 'true';
  },
  /** Public host the site lives on, e.g. playfiveinarow.com. */
  get canonicalHost() {
    return process.env.CANONICAL_HOST?.trim().toLowerCase() || null;
  },
  /** Old domains that should permanently redirect to the canonical host. */
  get redirectFromHosts(): string[] {
    return (process.env.REDIRECT_FROM_HOSTS ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
  },
  get adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },
};
