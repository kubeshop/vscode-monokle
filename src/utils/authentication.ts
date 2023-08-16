export async function getAuthenticator() {
  const {createDefaultMonokleAuthenticator} = await import('@monokle/synchronizer');
  return createDefaultMonokleAuthenticator();
}
