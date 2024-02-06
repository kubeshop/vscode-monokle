import { FingerprintSuppression } from '@monokle/types';
import globals from '../../utils/globals';

export type SuppressionPermissions = 'ADD' | 'REQUEST' | 'NONE';
export type SuppressionsStatus = {
  permissions: SuppressionPermissions;
  allowed: boolean;
};

export function getSuppressions(path: string) {
  const fingerprintSuppressions = globals.getSuppressions(path).map((suppression) => {
    return {
      guid: suppression.id,
      kind: 'external',
      status: toSuppressionStatus(suppression.status),
      fingerprint: suppression.fingerprint,
    } as FingerprintSuppression;
  });

  return {
    suppressions: fingerprintSuppressions,
  };
}

export function shouldUseFingerprintSuppressions(repoRootPath: string): SuppressionsStatus {
  const projectPermissions = globals.getProjectPermissions(repoRootPath);

  return {
    permissions: projectPermissions,
    allowed: projectPermissions !== 'NONE',
  };
}

function toSuppressionStatus(status: string) {
  switch (status) {
    case 'ACCEPTED':
    case 'accepted':
      return 'accepted';
    case 'REJECTED':
    case 'rejected':
      return 'rejected';
    case 'UNDER_REVIEW':
    case 'underReview':
      return 'underReview';
    default:
      return status;
  }
}
