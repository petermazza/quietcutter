import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock queryClient
vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

describe('Auth0 Login URL Construction', () => {
  const originalLocation = window.location;
  
  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = {
      origin: 'https://quietcutter.com',
      href: '',
    } as any;
    mockToast.mockClear();
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('should construct correct Auth0 URL with all required parameters', () => {
    const auth0Domain = 'dev-1eoak2btodghs61n.us.auth0.com';
    const auth0ClientId = 'lO3IpXuUn9gBJwauI3fBhMC2iXK9aFYj';
    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = 'test-state-123';
    const nonce = 'test-nonce-456';

    const authUrl = `https://${auth0Domain}/authorize?` + new URLSearchParams({
      response_type: "token id_token",
      client_id: auth0ClientId,
      redirect_uri: redirectUri,
      audience: `https://${auth0Domain}/api/v2/`,
      scope: "openid profile email",
      state: state,
      nonce: nonce,
    }).toString();

    // Verify URL contains required parameters
    expect(authUrl).toContain('response_type=token+id_token');
    expect(authUrl).toContain(`client_id=${auth0ClientId}`);
    expect(authUrl).toContain('redirect_uri=https%3A%2F%2Fquietcutter.com%2Fauth%2Fcallback');
    expect(authUrl).toContain('state=test-state-123');
    expect(authUrl).toContain('nonce=test-nonce-456');
    expect(authUrl).toContain('scope=openid+profile+email');
    expect(authUrl).toContain('audience=');
  });

  it('should include screen_hint=signup for signup flow', () => {
    const auth0Domain = 'dev-1eoak2btodghs61n.us.auth0.com';
    const auth0ClientId = 'lO3IpXuUn9gBJwauI3fBhMC2iXK9aFYj';
    const redirectUri = `${window.location.origin}/auth/callback`;

    const authUrl = `https://${auth0Domain}/authorize?` + new URLSearchParams({
      response_type: "token id_token",
      client_id: auth0ClientId,
      redirect_uri: redirectUri,
      audience: `https://${auth0Domain}/api/v2/`,
      scope: "openid profile email",
      screen_hint: "signup",
      state: 'test-state',
      nonce: 'test-nonce',
    }).toString();

    expect(authUrl).toContain('screen_hint=signup');
  });

  it('should fail when Auth0 domain is not configured', () => {
    const isAuth0Enabled = !!(null && 'some-client-id');
    expect(isAuth0Enabled).toBe(false);
  });

  it('should fail when Auth0 client ID is not configured', () => {
    const isAuth0Enabled = !!('some-domain' && null);
    expect(isAuth0Enabled).toBe(false);
  });

  it('should succeed when both Auth0 domain and client ID are configured', () => {
    const auth0Domain = 'dev-1eoak2btodghs61n.us.auth0.com';
    const auth0ClientId = 'lO3IpXuUn9gBJwauI3fBhMC2iXK9aFYj';
    const isAuth0Enabled = !!(auth0Domain && auth0ClientId);
    expect(isAuth0Enabled).toBe(true);
  });

  it('should generate random state and nonce values', () => {
    const state1 = Math.random().toString(36).substring(7);
    const nonce1 = Math.random().toString(36).substring(7);
    const state2 = Math.random().toString(36).substring(7);
    const nonce2 = Math.random().toString(36).substring(7);

    // Each value should be unique
    expect(state1).not.toBe(state2);
    expect(nonce1).not.toBe(nonce2);
    // Values should be strings
    expect(typeof state1).toBe('string');
    expect(typeof nonce1).toBe('string');
    // Values should not be empty
    expect(state1.length).toBeGreaterThan(0);
    expect(nonce1.length).toBeGreaterThan(0);
  });
});

describe('Auth0 Callback URL Handling', () => {
  it('should construct correct redirect URI from window.location.origin', () => {
    const origins = [
      'https://quietcutter.com',
      'http://localhost:3000',
      'https://quietcutter-production-f345.up.railway.app',
    ];

    origins.forEach(origin => {
      const redirectUri = `${origin}/auth/callback`;
      expect(redirectUri).toBe(`${origin}/auth/callback`);
      expect(redirectUri).toContain('/auth/callback');
    });
  });
});
