import { Logger } from '@nestjs/common';
import { providers } from 'ethers';

export class AppService {
  static chainId: string;
  static snowtrace: string;
  static GAS: string;
}

export async function loggerVerboseWithBlockNumber(
  logger: Logger,
  prefix: string,
  provider: providers.Provider
) {
  logger.verbose(`${prefix} ${await provider.getBlockNumber()}`);
}

export async function loggerLogWithBlockNumber(
  logger: Logger,
  prefix: string,
  provider: providers.Provider
) {
  logger.log(`${prefix} ${await provider.getBlockNumber()}`);
}
