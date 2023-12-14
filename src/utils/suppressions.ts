import { FingerprintSuppression } from '@monokle/types';
import globals from './globals';

export async function getSuppressions(path: string) {
  const user = await globals.getUser();

  if (!user.isAuthenticated) {
    return { suppressions: [] };
  }

  await globals.forceRefreshToken();

  const suppressions = await globals.getSuppressions(path, user.tokenInfo);
  const fingerprintSuppressions = suppressions.map((suppression) => {
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
