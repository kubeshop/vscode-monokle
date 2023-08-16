export async function getSynchronizer() {
  const {createDefaultMonokleSynchronizer} = await import('@monokle/synchronizer');
  return createDefaultMonokleSynchronizer();
}
