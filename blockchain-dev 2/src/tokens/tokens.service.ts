// @ts-ignore
import type { Tokens as Tokens__contract } from '../../types/contracts/Tokens';
import { Logger } from '@nestjs/common'; // supports 'log', 'error', 'warn', 'debug', and 'verbose'
import { Wallet, BigNumber } from 'ethers';

export class TokensService {
  static tokens: Tokens__contract;
  static hasPermissionsFor: (address: string) => Promise<boolean>;
  static setApprovals: (id: number) => Promise<BigNumber>;
  static logger: Logger;
  static SUPERADMIN: Wallet;

  static readonly PROTO_CONTENT_TYPE_UNSPECIFIED = 0;
  static readonly PROTO_CONTENT_TYPE_OWNER = 1;
  static readonly PROTO_CONTENT_TYPE_ADMIN = 2;

  static readonly CONTRACT_CONTENT_TYPE_OWNER = 0;
  static readonly CONTRACT_CONTENT_TYPE_ADMIN = 1;
}
