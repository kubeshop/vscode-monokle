
import { Issuer, DeviceFlowHandle, BaseClient, TokenSet } from 'openid-client';
import { DEVICE_FLOW_CLIENT_ID } from '../constants';
import logger from './logger';

const IDP_URL = 'https://api.dev.monokle.com/identity'; // @TODO Should later use 'globals.remotePolicyUrl'.

export async function initializeAuthFlow(): Promise<DeviceFlowHandle<BaseClient>> {
  const client = await getClient();
  const handle = await client.deviceAuthorization({
      scope: 'openid profile offline_access',
  });

  logger.log('DeviceFlow: User Code: ', handle.user_code);
  logger.log('DeviceFlow: Verification URI: ', handle.verification_uri);
  logger.log('DeviceFlow: Verification URI (complete): ', handle.verification_uri_complete);

  return handle;
}

export async function pollAuthFlow(handle: DeviceFlowHandle<BaseClient>) {
  const token = await handle.poll();

  logger.log('DeviceFlow: Token', token);

  return token;
}

export async function refreshAuthFlow(token: TokenSet) {
  const client = await getClient();
  return client.refresh(token);
}

let currentClient: BaseClient | null = null;

async function getClient(): Promise<BaseClient> {
  if (!currentClient) {
    const monokleIssuer = await Issuer.discover(IDP_URL);

    currentClient = new monokleIssuer.Client({
      client_id: DEVICE_FLOW_CLIENT_ID,
      client_secret: '',
    });
  }

  return currentClient;
}
