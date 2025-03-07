export type Chain = {
  id: string;
  name: string;
  rpc: string;
  explorer: string;
};

export function RPC_METHOD_DISPLAY_NAME(method: string) {
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
