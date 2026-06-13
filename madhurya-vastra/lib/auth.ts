import { CognitoUserPool, CognitoUser, CognitoUserSession } from 'amazon-cognito-identity-js';

export type UserRole = 'owner' | 'seller';

export interface AppUser {
  id: string;
  cognitoSub: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

// Lazy — only instantiates when Cognito env vars are properly configured.
// During development with placeholder values, all Cognito calls are no-ops.
let _userPool: CognitoUserPool | null = null;

function getUserPool(): CognitoUserPool | null {
  if (_userPool) return _userPool;

  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

  // Cognito User Pool IDs have the format: region_xxxxxxxxx
  const isConfigured =
    userPoolId &&
    clientId &&
    /^[\w-]+_\w+$/.test(userPoolId);

  if (!isConfigured) return null;

  try {
    _userPool = new CognitoUserPool({ UserPoolId: userPoolId!, ClientId: clientId! });
  } catch {
    // Invalid config — stay null
  }
  return _userPool;
}

export const signInWithGoogle = async (): Promise<void> => {
  console.log('Google sign in triggered');
};

export const signInWithPhone = async (phone: string): Promise<void> => {
  console.log('OTP requested for', phone);
};

export const confirmOTP = async (phone: string, otp: string): Promise<void> => {
  console.log('OTP confirmed for', phone, otp);
};

export const signOut = (): void => {
  const pool = getUserPool();
  if (!pool) return;
  const user = pool.getCurrentUser();
  if (user) user.signOut();
};

export const getCurrentCognitoUser = (): CognitoUser | null => {
  return getUserPool()?.getCurrentUser() ?? null;
};

export const getSession = async (): Promise<CognitoUserSession | null> => {
  const pool = getUserPool();
  if (!pool) return null;

  const user = pool.getCurrentUser();
  if (!user) return null;

  return new Promise((resolve, reject) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err) reject(err);
      else resolve(session);
    });
  });
};
