import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

export const config = getDefaultConfig({
  appName: 'APTUS dApp',
  projectId: 'ef93a5b8cb41b80ac29c0f6aa2aced7c',
  chains: [sepolia],
  transports: {
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/alch_GygqA3SV8Pv78juGfWnKJ')
  },
  ssr: true,
});
