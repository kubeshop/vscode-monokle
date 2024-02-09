import { FingerprintSuppression } from '@monokle/types';
import globals from '../../utils/globals';
import { ValidationResult } from '../../utils/validation';
import { ValidationResultExtended } from '../code-actions/base-code-actions-provider';

export type SuppressionPermissions = 'ADD' | 'REQUEST' | 'NONE';
export type SuppressionsStatus = {
  permissions: SuppressionPermissions;
  allowed: boolean;
};

export function getSuppressions(path: string) {
  const fingerprintSuppressions: FingerprintSuppression[] = globals.getSuppressions(path).map((suppression) => {
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

export function generateSuppression(fingerprint: string, permissions: SuppressionPermissions) {
  return {
    guid: `sup-${Date.now()}`,
    kind: 'external',
    status: toSuppressionStatus(permissions === 'ADD' ? 'accepted' : 'underReview'),
    fingerprint: fingerprint,
  } as FingerprintSuppression;
}

export function shouldUseFingerprintSuppressions(repoRootPath: string): SuppressionsStatus {
  const projectPermissions = globals.getProjectPermissions(repoRootPath);

  return {
    permissions: projectPermissions,
    allowed: projectPermissions !== 'NONE',
  };
}

export function isUnderReview(result: ValidationResult | ValidationResultExtended) {
  return result.suppressions.length > 0 && result.suppressions.every(s => s.status === 'underReview');
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
