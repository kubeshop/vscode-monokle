export async function getAuthenticator() {
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

  const {createDefaultMonokleAuthenticator} = await import('@monokle/synchronizer');
  return createDefaultMonokleAuthenticator();
}
