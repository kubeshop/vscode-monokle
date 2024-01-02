import { getClientConfig } from '../client-config';

export type Authenticator = Awaited<ReturnType<typeof getAuthenticator>>;

export const AUTH_CLIENT_ID = 'mc-cli';

export async function getAuthenticator(origin?: string) {
  /* DEV_ONLY_START */
  if (process.env.MONOKLE_VSC_ENV === 'TEST') {
    const {Authenticator, StorageHandlerAuth, ApiHandler, DeviceFlowHandler} = await import('@monokle/synchronizer');
    return new Authenticator(
      new StorageHandlerAuth(process.env.MONOKLE_TEST_CONFIG_PATH),
      new ApiHandler(),
      new DeviceFlowHandler()
    );
  }
  /* DEV_ONLY_END */

  const {createMonokleAuthenticatorFromOrigin} = await import('@monokle/synchronizer');

  try {
    const authenticator = await createMonokleAuthenticatorFromOrigin(AUTH_CLIENT_ID, getClientConfig(), origin);
    return authenticator;
  } catch (err: any) {
    // Without this entire extension can run only in local mode. Needs to be obvious to users what went wrong and how to fix.
    throw err;
  }
}
