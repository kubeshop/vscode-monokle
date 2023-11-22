export type Synchronizer = Awaited<ReturnType<typeof getSynchronizer>>;

export async function getSynchronizer(origin?: string) {
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
      new ApiHandler(process.env.MONOKLE_TEST_SERVER_URL),
      gitHandler
    );
  }
  /* DEV_ONLY_END */

  const {createMonokleSynchronizerFromOrigin} = await import('@monokle/synchronizer');

  try {
    const synchronizer = await createMonokleSynchronizerFromOrigin(origin);
    return synchronizer;
  } catch (err: any) {
    // Without this entire extension can run only in local mode. Needs to be obvious to users what went wrong and how to fix.
    throw err;
  }
}
