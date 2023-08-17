export async function getSynchronizer() {
  /* DEV_ONLY_START */
  if (process.env.MONOKLE_VSC_ENV === 'TEST') {
    const {Synchronizer, StorageHandlerPolicy, ApiHandler, GitHandler} = await import('@monokle/synchronizer');
    const gitHandler = new GitHandler();

    (gitHandler as any).getRepoRemoteData = () => {
        return {
          provider: 'github',
          remote: 'origin',
          owner: 'kubeshop',
          name: 'monokle-demo'
        };
    };

    return new Synchronizer(
      new StorageHandlerPolicy(process.env.MONOKLE_TEST_CONFIG_PATH),
      new ApiHandler(),
      gitHandler
    );
  }
  /* DEV_ONLY_END */

  const {createDefaultMonokleSynchronizer} = await import('@monokle/synchronizer');
  return createDefaultMonokleSynchronizer();
}
