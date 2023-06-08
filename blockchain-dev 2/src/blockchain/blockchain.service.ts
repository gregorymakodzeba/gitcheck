// @ts-ignore
import { Logger } from '@nestjs/common'; // supports 'log', 'error', 'warn', 'debug', and 'verbose'
import { Wallet, providers } from 'ethers';

export class BlockchainService {
  static logger: Logger;
  static SUPERADMIN: Wallet;
  static provider: providers.Provider;

  static recoverGas: (id: number) => Promise<void>;
  static getUserWallet: (id: number) => Wallet;
}
