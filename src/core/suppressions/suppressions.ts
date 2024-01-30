import globals from '../../utils/globals';

export type SuppressionPermissions = 'ADD' | 'REQUEST' | 'NONE';
export type SuppressionsStatus = {
  permissions: SuppressionPermissions;
  allowed: boolean;
};

export async function shouldUseFingerprintSuppressions(repoRootPath: string): Promise<SuppressionsStatus> {
  const isAuthenticated = (await globals.getUser()).isAuthenticated;

  if (!isAuthenticated) {
      return {
        permissions: 'NONE',
        allowed: false,
      };
  }

  const projectPermissions = await globals.getSuppressionPermissions(repoRootPath);
  return {
    permissions: projectPermissions,
    allowed: projectPermissions !== 'NONE',
  };
}
