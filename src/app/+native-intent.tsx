export function redirectSystemPath(event: {
  path: string;
  initial: boolean;
}): string {
  console.log('redirectSystemPath', event);

  if (event.path === 'megnat://credential-provider/create-passkey') {
    return '/about';
  }

  return '/index';
}
