export function isReactNativeError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    Object.keys(error).some(key => key.startsWith('nativeStack'))
  );
}
