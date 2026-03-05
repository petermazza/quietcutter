import { logger } from '../lib/logger';

export function validateAuth0Config() {
  const auth0Domain = process.env.AUTH0_DOMAIN;
  const auth0ClientId = process.env.AUTH0_CLIENT_ID;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check if Auth0 is configured
  if (!auth0Domain || !auth0ClientId) {
    logger.warn('Auth0 not configured - missing environment variables', 'auth0', {
      hasDomain: !!auth0Domain,
      hasClientId: !!auth0ClientId
    });
    return { isValid: false, reason: 'Missing configuration' };
  }
  
  // Check for development keys in production
  const isUsingDevKeys = auth0Domain.includes('dev-') || 
                        (auth0Domain.includes('-auth0.com') && auth0Domain.startsWith('dev-'));
  
  if (isProduction && isUsingDevKeys) {
    logger.error('SECURITY CRITICAL: Using Auth0 development keys in production!', 'auth0', {
      domain: auth0Domain,
      environment: process.env.NODE_ENV
    });
    
    // In production, we should fail fast if dev keys are detected
    throw new Error(
      'CRITICAL: Auth0 development keys detected in production environment. ' +
      'Please configure production Auth0 credentials immediately.'
    );
  }
  
  // Log configuration status (without sensitive data)
  logger.info('Auth0 configuration validated', 'auth0', {
    isProduction,
    isUsingDevKeys,
    domainPrefix: auth0Domain.split('.')[0] // Only log the prefix, not full domain
  });
  
  return { 
    isValid: true, 
    isProduction, 
    isUsingDevKeys,
    domain: auth0Domain 
  };
}

export function getClientAuth0Config() {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  
  if (!domain || !clientId) {
    return null;
  }
  
  return {
    domain,
    clientId,
    audience: `https://${domain}/api/v2/`
  };
}
