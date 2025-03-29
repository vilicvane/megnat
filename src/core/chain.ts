export type CustomChain = {
  /** eip155:* */
  id: string;
  name: string | undefined;
  rpc: string;
};

export type ListedChain = {
  /** eip155:* */
  id: string;
  name: string;
  explorer: string | undefined;
  rpc: string[] | undefined;
};
