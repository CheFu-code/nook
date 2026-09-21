export function authErrorMessage(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error &&
      ['ERR_REQUEST_CANCELED', 'ERR_CANCELED', 'SIGN_IN_CANCELLED'].includes(String(error.code))) {
    return null;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'We couldn’t connect to sign-in. Check your connection and try again.';
}
