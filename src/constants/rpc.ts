export function RPC_METHOD_DISPLAY_NAME(method: string): string {
  switch (method) {
    case 'eth_sendTransaction':
      return 'Send transaction';
    case 'eth_sign':
      return 'Sign message';
    case 'eth_signTypedData':
      return 'Sign typed data';
    case 'eth_signTypedData_v4':
      return 'Sign typed data (v4)';
    case 'personal_sign':
      return 'Sign personal message';
    default:
      return method;
  }
}

export const CHAIN_LIST_INFURA_KEY_TEMPLATE = '${INFURA_API_KEY}';
