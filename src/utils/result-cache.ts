export function getResultCache<T_KEY, T_VALUE>() {
    /* DEV_ONLY_START */
    if (process.env.MONOKLE_VSC_ENV === 'TEST' && process.env.MONOKLE_TEST_SKIP_RESULT_CACHE === 'Y') {
      const map = new Map<T_KEY, T_VALUE>();
      (map as any).set = function() {};
      return map;
    }
    /* DEV_ONLY_END */

    return new Map<T_KEY, T_VALUE>();
  }
