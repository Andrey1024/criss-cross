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
  get adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },
};
