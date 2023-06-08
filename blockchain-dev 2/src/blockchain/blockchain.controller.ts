import { Controller, OnModuleInit } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Logger } from '@nestjs/common'; // supports 'log', 'error', 'warn', 'debug', and 'verbose'

import { join } from 'path';
import { readFileSync } from 'fs';

import * as Blockchain from './v1/blockchain.interface';

import { BigNumber, Wallet, providers } from 'ethers';

import { BlockchainService } from './blockchain.service';
import { TokensService } from '../tokens/tokens.service';

import { AppService } from '../app.service';

@Controller('Blockchain')
export class BlockchainController implements OnModuleInit {
  private logger: Logger;
  private SUPERADMIN: Wallet; // granted SUPERADMIN role
  private provider: providers.Provider;

  constructor() {
    this.logger = new Logger('BlockchainController');
    this.logger.log('BlockchainController created');
  }

  async onModuleInit() {
    this.logger.log('BlockchainController onModuleInit()');

    let chainId = AppService?.chainId ? AppService.chainId : '31337';

    const content = readFileSync(
      join(__dirname, `../../../deployment.config.${chainId}.json`),
      'utf-8'
    );
    let data = JSON.parse(content);

    const m: string | undefined = process.env.SUPERADMIN_MNEMONIC;
    if (!m) {
      this.logger.error('Could not find process.env.SUPERADMIN_MNEMONIC');
      throw new Error('Please set SUPERADMIN_MNEMONIC in the .env file');
    }

    let provider = new providers.JsonRpcProvider(data.url, data.chainId);
    try {
      let blockNumber = await provider.getBlockNumber();
      this.logger.log(`EVM chain id ${AppService.chainId} is at block #${blockNumber}`);
    } catch (error) {
      this.logger.error('Error with provider connection: ', error);
    }

    this.SUPERADMIN = Wallet.fromMnemonic(m, `m/44'/60'/0'/0/0`).connect(provider);
    this.provider = this.SUPERADMIN.provider;

    try {
      let balance = await this.SUPERADMIN.getBalance();
      this.logger.log(`Hot wallet balance is ${balance} GAS`);
    } catch (error) {
      this.logger.error('Error with getting hot wallet balance: ', error);
    }

    // these are used in the above service calls
    BlockchainService.recoverGas = this.recoverGas;
    BlockchainService.getUserWallet = this.getUserWallet;
    // these are used in the above service calls
    BlockchainService.SUPERADMIN = this.SUPERADMIN;
    BlockchainService.logger = new Logger('BlockchainService');
    BlockchainService.provider = this.SUPERADMIN.provider;
  }

  private getUserWallet(id: number): Wallet {
    const m: string | undefined = process.env.USERS_MNEMONIC;
    if (!m) {
      BlockchainService.logger.error('Could not find process.env.USERS_MNEMONIC');
      throw new Error('Please set USERS_MNEMONIC in the .env file');
    }
    if (!id) {
      BlockchainService.logger.error(`getUserWallet failed for provided id = ${id}`);
      throw new Error(`getUserWallet failed for provided id = ${id}`);
    }
    return Wallet.fromMnemonic(m, `m/44'/60'/0'/0/${id}`).connect(BlockchainService.provider);
  }

  private async recoverGas(id: number) {
    let USER = BlockchainService.getUserWallet(id);

    let userGas = await USER.getBalance();
    BlockchainService.logger.verbose(`user ${id} has ${userGas} residual gas`);

    if (userGas.gt(0)) {
      let gasPrice = Math.round((await USER.provider.getGasPrice()).toNumber() * 1.02);
      BlockchainService.logger.verbose(`using a gasPrice of ${gasPrice / 1000000000} nGAS`);

      let txFee = BigNumber.from(21000);
      let gasToReturn = userGas.sub(txFee.mul(gasPrice));

      if (gasToReturn.gt(0)) {
        BlockchainService.logger.error('recovering ${gasToReturn} unused gas');

        let tx = await USER.sendTransaction({
          to: BlockchainService.SUPERADMIN.address,
          value: gasToReturn,
          gasPrice: gasPrice,
          gasLimit: txFee, // 21,000
        });
        await tx.wait();

        BlockchainService.logger.log(`sendTransaction ${AppService.snowtrace}${tx.hash}`);
      } else {
        BlockchainService.logger.error(`balance is too low to recover gas`);
      }

      userGas = await USER.getBalance();
      BlockchainService.logger.error(`user wallet now has ${userGas} gas (ideally zero!)`);
    }
  }

  @GrpcMethod('BlockchainService', 'RecoverUserGas')
  async recoverUserGas(
    req: Blockchain.RecoverUserGasRequest
  ): Promise<Blockchain.RecoverUserGasResponse> {
    this.logger.verbose(
      `entering recoverUserGas at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    this.recoverGas(req.userId);
    let USER = this.getUserWallet(req.userId);
    return {
      userAddress: USER.address,
    };
  }

  @GrpcMethod('BlockchainService', 'GetUserInfo')
  async GetUserInfo(req: Blockchain.GetUserInfoRequest): Promise<Blockchain.GetUserInfoResponse> {
    this.logger.verbose(
      `entering getUserInfo at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let network = await TokensService.tokens.provider.getNetwork();
    let userWallet = this.getUserWallet(req.userId);
    this.logger.log(
      `GRPC: getUserInfo([${req.userId}]) => ${userWallet.address}) on chain ${network.chainId}`
    );
    return {
      userAddress: userWallet.address,
      chainId: network.chainId.toString(),
    };
  }

  @GrpcMethod('BlockchainService', 'GetChainInfo')
  async getChainInfo(
    _req: Blockchain.GetChainInfoRequest
  ): Promise<Blockchain.GetChainInfoResponse> {
    this.logger.verbose(
      `entering getChainInfo at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );

    let network = await this.provider.getNetwork();
    let lastBlock = await this.provider.getBlockNumber();
    let timestamp = (await this.provider.getBlock(lastBlock)).timestamp;
    let gas = await this.SUPERADMIN.getBalance();
    this.logger.log(`GRPC: getChainInfo found chainId ${network.chainId} at block ${lastBlock}`);
    return {
      chainId: network.chainId.toString(),
      lastBlock: lastBlock.toString(),
      blockTimestampSec: `${timestamp}`,
    };
  }

  @GrpcMethod('BlockchainService', 'GetSuperadminInfo')
  async getSuperadminInfo(
    _req: Blockchain.GetSuperadminInfoRequest
  ): Promise<Blockchain.GetSuperadminInfoResponse> {
    this.logger.verbose(
      `entering getChainInfo at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );

    let network = await TokensService.tokens.provider.getNetwork();
    let lastBlock = await TokensService.tokens.provider.getBlockNumber();
    let timestamp = (await TokensService.tokens.provider.getBlock(lastBlock)).timestamp;
    let gas = await this.SUPERADMIN.getBalance();
    this.logger.log(`GRPC: getChainInfo found chainId ${network.chainId} at block ${lastBlock}`);
    return {
      hotWalletAddress: this.SUPERADMIN.address,
      hotWalletBalanceAttoGas: gas.toString(),
    };
  }

  @GrpcMethod('BlockchainService', 'GetTxStatus')
  async getTxStatus(req: Blockchain.GetTxStatusRequest): Promise<Blockchain.GetTxStatusResponse> {
    this.logger.verbose(
      `Entering getTxStatus at block ${await TokensService.tokens.provider.getBlockNumber()}`
    );
    const transaction = await TokensService.tokens.provider.getTransaction(req.txHash);

    const receipt = await TokensService.tokens.provider.getTransactionReceipt(req.txHash);

    this.logger.log(`GRPC: GetTxStatus for tx hash = #${req.txHash}`);

    const status = !transaction
      ? Blockchain.GetTxStatusResponse_TxStatus.TX_STATUS_UNSPECIFIED
      : !receipt
      ? Blockchain.GetTxStatusResponse_TxStatus.TX_STATUS_PENDING
      : receipt.status
      ? Blockchain.GetTxStatusResponse_TxStatus.TX_STATUS_SUCCESS
      : Blockchain.GetTxStatusResponse_TxStatus.TX_STATUS_FAILED;

    const timestampInSeconds = transaction?.blockNumber
      ? (await TokensService.tokens.provider.getBlock(transaction.blockNumber)).timestamp
      : 0;

    return {
      status,
      blockHash: receipt?.blockHash || '',
      blockNumber: receipt?.blockNumber?.toString() || '0',
      costAttoGas: receipt?.gasUsed?.toString() || '0',
      gasPriceAttoGas: transaction?.gasPrice?.toString() || '0',
      fromAddress: transaction?.from || '',
      toAddress: transaction?.to || '',
      contractAddress: receipt?.contractAddress || '',
      nonce: transaction?.nonce?.toString() || '0',
      valueAttoGas: transaction?.value?.toString() || '0',
      inputData: transaction?.data ? Buffer.from(transaction.data) : new Uint8Array(),
      errorMessage: receipt?.status ? '' : 'Transaction failed',
      blockTimestampSec: timestampInSeconds
        ? new Date(timestampInSeconds * 1000).toISOString()
        : '',
    };
  }
}
