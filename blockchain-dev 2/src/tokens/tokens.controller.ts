import { Controller, OnModuleInit } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Logger } from '@nestjs/common'; // supports 'log', 'error', 'warn', 'debug', and 'verbose'

import hre from 'hardhat';
import { BigNumberish, BigNumber, Wallet, Contract, providers, utils } from 'ethers';

import { join } from 'path';
import { readFileSync } from 'fs';
import * as Tokens from './v1/tokens.interface';

// @ts-ignore
import type { Tokens as Tokens__contract } from '../../types/contracts/Tokens';
// @ts-ignore
import { Tokens__factory } from '../../types/factories/contracts/Tokens__factory';

import { TokensService } from './tokens.service';
import { ListingsService } from '../listings/listings.service';
import { OffersService } from '../offers/offers.service';
import { BlockchainService } from '../blockchain/blockchain.service';

import { AppService, loggerVerboseWithBlockNumber, loggerLogWithBlockNumber } from '../app.service';
import { Observable, Subject } from 'rxjs';

function bn(value: BigNumberish) {
  return BigNumber.from(value);
}

function scale(attoSCI: BigNumberish) {
  let scale = bn(10).pow(12);
  return bn(attoSCI).div(scale).toNumber() / 1000000;
}

@Controller('Token')
export class TokensController implements OnModuleInit {
  private logger: Logger;

  // roles used by our contracts
  private SUPERADMIN: Wallet; // granted SUPERADMIN role

  private CID: any; // lots of problems with ECMAScript module

  constructor() {
    this.logger = new Logger('TokensController');
    this.logger.log('TokensController created');
  }

  async onModuleInit() {
    this.logger.log('TokensController onModuleInit()');

    const multiformats: any = await import('multiformats' as any);
    this.CID = multiformats.CID;

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

    let tokensFactory: Tokens__factory = <Tokens__factory>(
      await (hre as any).ethers.getContractFactory('Tokens', this.SUPERADMIN)
    );
    TokensService.tokens = <Tokens__contract>(
      new Contract(data.tokensAddress, tokensFactory.interface, this.SUPERADMIN)
    );

    try {
      let code = await provider.getCode(data.tokensAddress);
      this.logger.log(
        `Contract bytecode has length is ${code.length} : ${code.substring(0, 10)}...`
      );
      if (code.length == 2) {
        this.logger.error('Are you sure you have run the deployment scripts?');
      }
    } catch (error) {
      this.logger.error('Error with getting contract code: ', error);
    }

    try {
      let totalSupply = await TokensService.tokens.totalSupply();
      this.logger.log(`Total supply of SCI tokens is ${totalSupply}`);
    } catch (error) {
      this.logger.error('Error with calling tokens.totalSupply: ', error);
    }

    this.logger.log(`tokens.controller created for tokens @ ${TokensService.tokens.address}`);

    // export for other contracts
    TokensService.hasPermissionsFor = this.hasPermissionsFor;
    TokensService.setApprovals = this.setApprovals;

    // these are used in the above service calls
    TokensService.SUPERADMIN = this.SUPERADMIN;
    TokensService.logger = new Logger('TokensService');
  }

  public toHexHash(contentCidV1: string): string {
    try {
      const cid = this.CID.parse(contentCidV1);
      const digest = cid.multihash.digest;
      let sha256hex = digest.reduce(
        (hex: any, byte: any) => hex + byte.toString(16).padStart(2, '0'),
        ''
      );
      this.logger.verbose(`toHexHash: ${contentCidV1} --> 0x${sha256hex}`);
      return '0x' + sha256hex; // convert to ethers HexString type
    } catch (error) {
      this.logger.error(error);
      throw new Error(`Invalid CID: ${contentCidV1}`);
    }
  }

  public toCIDv1(hashHexString: string): string {
    let sha256hex = hashHexString.substring(2); // drop "0x"
    if (!/^[0-9a-fA-F]+$/.test(sha256hex) || sha256hex.length !== 64) {
      throw new Error(`Invalid hex hash: ${sha256hex}`);
    }
    const digest = Uint8Array.from(
      sha256hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const multihashDigest = {
      code: 0x12, // sha2-256
      digest,
      size: digest.length,
      bytes: new Uint8Array([0x12, digest.length, ...digest]),
    };

    const contentCidV1 = this.CID.create(1, 0x55, multihashDigest).toString();
    this.logger.verbose(`toCIDv1: ${hashHexString} --> ${contentCidV1}`);
    return contentCidV1;
  }

  public async hasPermissionsFor(address: string): Promise<boolean> {
    TokensService.logger.verbose(
      `entering hasPermissionsFor at block ${await TokensService.SUPERADMIN.provider.getBlockNumber()}`
    );
    let addressRepeated = [address, address, address];
    let operators = [
      TokensService.SUPERADMIN.address,
      ListingsService.listings.address,
      OffersService.offers.address,
    ];
    let approvals = await Promise.all(
      await TokensService.tokens.isApprovedForAllBatch(addressRepeated, operators)
    );
    operators.forEach((o, i) => {
      TokensService.logger.verbose(`${o} ${approvals[i] ? 'is' : 'is NOT'} approved`);
    });
    return approvals.every((a: boolean) => a) ? true : false;
  }

  async setApprovals(id: number): Promise<BigNumber> {
    TokensService.logger.verbose(
      `entering setApprovals at block ${await TokensService.SUPERADMIN.provider.getBlockNumber()}`
    );

    let USER = BlockchainService.getUserWallet(id);

    if (!(await this.hasPermissionsFor(USER.address))) {
      TokensService.logger.verbose(`setting approvals for [${id}] = ${USER.address}`);
      let operators = [
        TokensService.SUPERADMIN.address,
        ListingsService.listings.address,
        OffersService.offers.address,
      ];

      let gasPrice = Math.round((await USER.provider.getGasPrice()).toNumber() * 1.02);
      TokensService.logger.verbose(
        `using a gasPrice of ${gasPrice / 1000000000} n${AppService.GAS}`
      );

      let gasBefore = await TokensService.SUPERADMIN.getBalance();
      TokensService.logger.verbose(`hot wallet gas before ${scale(gasBefore)} ${AppService.GAS}`);

      let gasLimit = BigNumber.from(98597);
      let approvalGas = gasLimit.mul(gasPrice);
      TokensService.logger.verbose(
        `funding user to grant approvals with ${scale(approvalGas)} ${AppService.GAS}`
      );

      let tx = await TokensService.SUPERADMIN.sendTransaction({
        to: USER.address,
        value: approvalGas,
        gasPrice: gasPrice,
        gasLimit: 21000,
      });
      await tx.wait();
      TokensService.logger.log(`sendTransaction ${AppService.snowtrace}${tx.hash}`);

      tx = await TokensService.tokens
        .connect(USER)
        .setApprovalForAllBatch(operators, [true, true, true], {
          gasPrice: gasPrice,
          gasLimit: gasLimit,
        });
      await tx.wait();
      TokensService.logger.log(`tokens.setApprovalForAllBatch ${AppService.snowtrace}${tx.hash}`);

      await BlockchainService.recoverGas(id);

      let gasAfter = await TokensService.SUPERADMIN.getBalance();
      TokensService.logger.verbose(`hot wallet gas after ${scale(gasAfter)} ${AppService.GAS}`);
      let costAttoGas = gasBefore.sub(gasAfter);

      TokensService.logger.log(
        `[${id}]:${USER.address} is now approved [Gas Used: ${costAttoGas}]`
      );
      return costAttoGas;
    } else {
      TokensService.logger.verbose(`[${id}]:${USER.address} has already set approvals`);
      return bn(0);
    }
  }

  @GrpcMethod('TokensService', 'GetAddressBalance')
  async getAddressBalance(
    req: Tokens.GetAddressBalanceRequest
  ): Promise<Tokens.GetAddressBalanceResponse> {
    this.logger.verbose(
      `entering getAddressBalance at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let balance = await TokensService.tokens['balanceOf(address,uint256)'](req.userAddress, 0);
    let amount = balance.toString();
    this.logger.log(`GRPC: GetAddressBalance(${req.userAddress}) => ${amount}`);
    return { amountAttoSci: amount };
  }

  @GrpcMethod('TokensService', 'GetUserBalance')
  async getUserBalance(req: Tokens.GetUserBalanceRequest): Promise<Tokens.GetUserBalanceResponse> {
    this.logger.verbose(
      `entering getUserBalance at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let userWallet = BlockchainService.getUserWallet(req.userId);
    let balance = await TokensService.tokens['balanceOf(address,uint256)'](userWallet.address, 0);
    let amount = balance.toString();
    this.logger.log(`GRPC: GetUserBalance([${req.userId}] = ${userWallet.address}) => ${amount}`);
    return { amountAttoSci: amount, userAddress: userWallet.address };
  }

  @GrpcMethod('TokensService', 'CreditUser')
  async creditUser(req: Tokens.CreditUserRequest): Promise<Tokens.CreditUserResponse> {
    this.logger.verbose(
      `entering creditUser at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let userWallet = BlockchainService.getUserWallet(req.userId);
    let gasBefore = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas before ${scale(gasBefore)} ${AppService.GAS}`);
    let hotWalletSci = await TokensService.tokens['balanceOf(address,uint256)'](
      this.SUPERADMIN.address,
      0
    );
    this.logger.verbose(`hot wallet sci balance is ${scale(hotWalletSci)} SCI`);
    this.logger.verbose(
      `now transfering ${scale(bn(req.amountAttoSci))} SCI to ${userWallet.address}`
    );
    let tx = await TokensService.tokens.transfer(userWallet.address, bn(req.amountAttoSci), {
      gasLimit: 100000,
    });
    this.logger.log(`tokens.transfer ${AppService.snowtrace}${tx.hash}`);
    //await tx.wait();
    let gasAfter = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas after ${scale(gasAfter)} ${AppService.GAS}`);
    let costAttoGas = gasBefore.sub(gasAfter).toString();

    this.logger.log(
      `GRPC: CreditUser([${req.userId}] = ${userWallet.address}, ${req.amountAttoSci}) [Gas Used: ${costAttoGas}]`
    );
    return { userAddress: userWallet.address, costAttoGas: costAttoGas, txHash: tx.hash };
  }

  @GrpcMethod('TokensService', 'TransferSCI')
  async transferSCI(req: Tokens.TransferSCIRequest): Promise<Tokens.TransferSCIResponse> {
    this.logger.verbose(
      `entering transferSCI at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let FROM = BlockchainService.getUserWallet(req.fromId);
    let TO = BlockchainService.getUserWallet(req.toId);
    let gasBefore = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas before ${scale(gasBefore)} ${AppService.GAS}`);

    // set approval for hot wallet to manage assets
    await this.setApprovals(req.fromId);

    // transfer funds using ERC1155
    let abiCoder = new utils.AbiCoder();
    let IGNORED_DATA = abiCoder.encode([], []);
    let tx = await TokensService.tokens.safeTransferFrom(
      FROM.address,
      TO.address,
      0 /* SCI */,
      bn(req.amountAttoSci),
      IGNORED_DATA,
      { gasLimit: 100000 } // 60,134
    );
    this.logger.log(`tokens.safeTransferFrom ${AppService.snowtrace}${tx.hash}`);
    //await tx.wait();

    let gasAfter = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas after ${scale(gasAfter)} ${AppService.GAS}`);
    let costAttoGas = gasBefore.sub(gasAfter).toString();

    this.logger.log(
      `GRPC: TransferSCI([${req.fromId}] = ${FROM.address}, [${req.toId}] = ${TO.address}, ${req.amountAttoSci}) [Gas Used: ${costAttoGas}]`
    );
    return {
      fromAddress: FROM.address,
      toAddress: TO.address,
      costAttoGas: costAttoGas,
      txHash: tx.hash,
    };
  }

  @GrpcMethod('TokensService', 'MintNFT')
  async mintNFT(req: Tokens.MintNFTRequest): Promise<Tokens.MintNFTResponse> {
    this.logger.verbose(
      `entering mintNFT at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );

    let OWNER = BlockchainService.getUserWallet(req.ownerId);
    let ADMIN = BlockchainService.getUserWallet(req.adminId);
    let BENEFICIARY = BlockchainService.getUserWallet(req.beneficiaryId);

    let gasBefore = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas before ${scale(gasBefore)} ${AppService.GAS}`);

    let createdAt = Date.now();
    let status =
      (await TokensService.tokens.UNSET_FULL_BENEFIT_FLAG()) |
      (await TokensService.tokens.FULL_BENEFIT_FLAG()); // uint192

    // mint the new NFT
    let tx = await TokensService.tokens.superadminMintNFT(
      this.toHexHash(req.contentCidV1),
      createdAt,
      status,
      OWNER.address,
      ADMIN.address,
      BENEFICIARY.address,
      { gasLimit: 200000 } // 176,649
    );
    this.logger.log(`tokens.superadminMintNFT ${AppService.snowtrace}${tx.hash}`);
    //await tx.wait();

    let gasAfter = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas after ${scale(gasAfter)} ${AppService.GAS}`);
    let costAttoGas = gasBefore.sub(gasAfter).toString();

    this.logger.log(
      `GRPC: MintNFT for OWNER [${req.ownerId}] = ${OWNER.address}) [Gas Used: ${costAttoGas}]`
    );
    return {
      ownerAddress: OWNER.address,
      adminAddress: ADMIN.address,
      beneficiaryAddress: BENEFICIARY.address,
      costAttoGas: costAttoGas,
      txHash: tx.hash,
    };
  }

  @GrpcMethod('TokensService', 'EnhanceNFT')
  async enhanceNFT(req: Tokens.EnhanceNFTRequest): Promise<Tokens.EnhanceNFTResponse> {
    this.logger.verbose(
      `entering enhanceNFT at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let contentType: number;
    if (req.contentType == TokensService.PROTO_CONTENT_TYPE_ADMIN) {
      contentType = TokensService.CONTRACT_CONTENT_TYPE_ADMIN;
    } else if (req.contentType == TokensService.PROTO_CONTENT_TYPE_OWNER) {
      contentType = TokensService.CONTRACT_CONTENT_TYPE_OWNER;
    } else {
      throw new Error('Invalid content type');
    }

    let gasBefore = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas before ${scale(gasBefore)} ${AppService.GAS}`);

    let createdAt = Date.now();

    // enhance the NFT
    let tx = await TokensService.tokens.superadminAppendContent(
      req.tokenId,
      this.toHexHash(req.newContentCidV1),
      contentType,
      createdAt,
      { gasLimit: 200000 } // Adjust gas limit as needed
    );
    // await tx.wait();
    this.logger.log(`tokens.superadminAppendContent ${AppService.snowtrace}${tx.hash}`);

    let gasAfter = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas after ${scale(gasAfter)} ${AppService.GAS}`);
    let costAttoGas = gasBefore.sub(gasAfter).toString();

    this.logger.log(`GRPC: EnhanceNFT for token id [${req.tokenId}] [Gas Used: ${costAttoGas}]`);
    return {
      costAttoGas: costAttoGas,
      txHash: tx.hash,
    };
  }

  @GrpcMethod('TokensService', 'GetNFT')
  async getNFT(req: Tokens.GetNFTRequest): Promise<Tokens.GetNFTResponse> {
    this.logger.verbose(
      `entering getNFT at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );

    const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
    let NFT = await TokensService.tokens.scienceNFTs(req.tokenId);

    let adminKey = await TokensService.tokens.getContentNodeKey(
      req.tokenId,
      NFT.adminHash,
      TokensService.CONTRACT_CONTENT_TYPE_ADMIN
    );
    let node = await TokensService.tokens.contentNodes(adminKey);
    let adminContent: string[] = [this.toCIDv1(NFT.adminHash)];
    let adminCreatedAt: string[] = [NFT.createdAt.toString()];
    // traverse admin content list
    while (node.contentHash != ZERO_HASH) {
      adminContent.push(this.toCIDv1(node.contentHash));
      adminCreatedAt.push(node.createdAt.toString());
      adminKey = await TokensService.tokens.getContentNodeKey(
        req.tokenId,
        node.contentHash,
        TokensService.CONTRACT_CONTENT_TYPE_ADMIN
      );
      node = await TokensService.tokens.contentNodes(adminKey);
    }

    let ownerKey = await TokensService.tokens.getContentNodeKey(
      req.tokenId,
      NFT.adminHash,
      TokensService.CONTRACT_CONTENT_TYPE_OWNER
    );
    node = await TokensService.tokens.contentNodes(ownerKey);
    let ownerContent: string[] = [];
    let ownerCreatedAt: string[] = [];
    // traverse owner content list
    while (node.contentHash != ZERO_HASH) {
      ownerContent.push(this.toCIDv1(node.contentHash));
      ownerCreatedAt.push(node.createdAt.toString());
      ownerKey = await TokensService.tokens.getContentNodeKey(
        req.tokenId,
        node.contentHash,
        TokensService.CONTRACT_CONTENT_TYPE_OWNER
      );
      node = await TokensService.tokens.contentNodes(ownerKey);
    }

    this.logger.verbose(`adminCreatedAt[${req.tokenId}] = ${NFT.createdAt.toString()}`);

    this.logger.log(`GRPC: GetNFT #${req.tokenId}`);
    return {
      tokenId: req.tokenId,
      ownerContentCidV1: ownerContent,
      adminContentCidV1: adminContent,
      ownerCreatedAtSec: ownerCreatedAt,
      adminCreatedAtSec: adminCreatedAt,
      status: NFT.status.toString(),
      ownerAddress: await TokensService.tokens.ownerOf(req.tokenId),
      adminAddress: await TokensService.tokens.adminOf(req.tokenId),
      beneficiaryAddress: await TokensService.tokens.beneficiaryOf(req.tokenId),
    };
  }

  @GrpcMethod('TokensService', 'GetNFTUpdatedEvents')
  async getNFTUpdatedEvents(
    req: Tokens.GetNFTUpdatedEventsRequest
  ): Promise<Tokens.GetNFTUpdatedEventsResponse> {
    this.logger.verbose(
      `entering getNFTUpdatedEvents at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );

    let abi = [
      'event NFTUpdated(uint64 indexed tokenId, uint192 status, address indexed owner, address admin, address indexed beneficiary)',
    ];
    const eventInterface = new utils.Interface(abi);
    const eventSignature: string = 'NFTUpdated(uint64,uint192,address,address,address)';
    const eventTopic: string = utils.id(eventSignature); // Get the data hex string

    let rawEvents = await TokensService.tokens.provider.getLogs({
      address: TokensService.tokens.address,
      topics: [eventTopic],
      fromBlock: req.fromBlock,
      toBlock: req.toBlock,
    });

    let events = rawEvents.map((raw: providers.Log) => {
      let description = eventInterface.parseLog(raw);
      let event = {} as Tokens.NFTUpdatedEvent;
      event.blockNumber = raw.blockNumber.toString();
      event.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      event.status = description.args[1].toString(); // uint192 status
      event.ownerAddress = description.args[2]; // address indexed owner
      event.adminAddress = description.args[3]; // address admin
      event.beneficiaryAddress = description.args[4]; // address indexed beneficiary
      event.txHash = raw.transactionHash;
      return event;
    });

    this.logger.log(
      `GRPC: GetNFTUpdatedEvents for blocks ${req.fromBlock} to ${req.toBlock} found ${events.length} events`
    );
    return {
      events: events,
    };
  }

  @GrpcMethod('TokensService', 'GetOwnerContentNodeCreatedEvents')
  async getOwnerContentNodeCreatedEvents(
    req: Tokens.GetOwnerContentNodeCreatedEventsRequest
  ): Promise<Tokens.GetOwnerContentNodeCreatedEventsResponse> {
    this.logger.verbose(
      `entering getOwnerContentNodeCreatedEvents at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );

    let abi = [
      'event OwnerContentNodeCreated(uint64 indexed tokenId, bytes32 indexed data, bytes32 indexed prev)',
    ];
    const eventInterface = new utils.Interface(abi);
    const eventSignature: string = 'OwnerContentNodeCreated(uint64,bytes32,bytes32)';
    const eventTopic: string = utils.id(eventSignature); // Get the data hex string

    let rawEvents = await TokensService.tokens.provider.getLogs({
      address: TokensService.tokens.address,
      topics: [eventTopic],
      fromBlock: req.fromBlock,
      toBlock: req.toBlock,
    });

    let events = rawEvents.map((raw: providers.Log) => {
      let description = eventInterface.parseLog(raw);
      let event = {} as Tokens.OwnerContentNodeCreatedEvent;
      event.blockNumber = raw.blockNumber.toString();
      event.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      event.contentCidV1 = this.toCIDv1(description.args[1].toString()); // bytes32 data
      event.previousCidV1 = this.toCIDv1(description.args[2].toString()); // bytes32 prev
      event.txHash = raw.transactionHash;
      return event;
    });

    this.logger.log(
      `GRPC: GetOwnerContentNodeCreatedEvents for blocks ${req.fromBlock} to ${req.toBlock} found ${events.length} events`
    );
    return {
      events: events,
    };
  }

  @GrpcMethod('TokensService', 'GetAdminContentNodeCreatedEvents')
  async getAdminContentNodeCreatedEvents(
    req: Tokens.GetAdminContentNodeCreatedEventsRequest
  ): Promise<Tokens.GetAdminContentNodeCreatedEventsResponse> {
    this.logger.verbose(
      `entering getAdminContentNodeCreatedEvents at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );

    let abi = [
      'event AdminContentNodeCreated(uint64 indexed tokenId, bytes32 indexed data, bytes32 indexed prev)',
    ];

    const eventInterface = new utils.Interface(abi);
    const eventSignature: string = 'AdminContentNodeCreated(uint64,bytes32,bytes32)';
    const eventTopic: string = utils.id(eventSignature); // Get the data hex string

    let rawEvents = await TokensService.tokens.provider.getLogs({
      address: TokensService.tokens.address,
      topics: [eventTopic],
      fromBlock: req.fromBlock,
      toBlock: req.toBlock,
    });

    let events = rawEvents.map((raw: providers.Log) => {
      let description = eventInterface.parseLog(raw);
      let event = {} as Tokens.AdminContentNodeCreatedEvent;
      event.blockNumber = raw.blockNumber.toString();
      event.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      event.contentCidV1 = this.toCIDv1(description.args[1].toString()); // bytes32 data
      event.previousCidV1 = this.toCIDv1(description.args[2].toString()); // bytes32 prev
      event.txHash = raw.transactionHash;
      return event;
    });

    this.logger.log(
      `GRPC: GetAdminContentNodeCreatedEvents for blocks ${req.fromBlock} to ${req.toBlock} found ${events.length} events`
    );
    return {
      events: events,
    };
  }

  @GrpcMethod('TokensService', 'GetTransferEvents')
  async getTransferEvents(
    req: Tokens.GetTransferEventsRequest
  ): Promise<Tokens.GetTransferEventsResponse> {
    this.logger.verbose(
      `entering getTransferEvents at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );

    // ERC20 transfer
    let transferEventABI = [
      `event Transfer(address indexed _from, address indexed _to, uint256 _value)`,
    ];
    const transferEventInterface = new utils.Interface(transferEventABI);
    const transferEventSignature: string = 'Transfer(address,address,uint256)';
    const transferEventTopic: string = utils.id(transferEventSignature);
    let rawTransferEvents = await TokensService.tokens.provider.getLogs({
      address: TokensService.tokens.address,
      topics: [transferEventTopic],
      fromBlock: req.fromBlock,
      toBlock: req.toBlock,
    });

    let transferEvents = rawTransferEvents.map((raw: providers.Log) => {
      let description = transferEventInterface.parseLog(raw);
      let event = {} as Tokens.TransferEvent;
      event.blockNumber = raw.blockNumber.toString();
      event.operatorAddress = '0x' + '0'.repeat(32); // address -- not present in ERC Transfer
      event.fromAddress = description.args[0]; // address
      event.toAddress = description.args[1]; // address
      event.tokenId = '0'; // uint256 -- not present in ERC Transfer
      event.amount = description.args[2].toString(); // uint256
      event.txHash = raw.transactionHash;
      return event;
    });

    // ERC1155 safeTransfer
    let transferSingleEventABI = [
      `event TransferSingle(address indexed _operator, address indexed _from, address indexed _to, uint256 _id, uint256 _value)`,
    ];
    const transferSingleEventInterface = new utils.Interface(transferSingleEventABI);
    const transferSingleEventSignature: string =
      'TransferSingle(address,address,address,uint256,uint256)';
    const transferSingleEventTopic: string = utils.id(transferSingleEventSignature);
    let rawTransferSingleEvents = await TokensService.tokens.provider.getLogs({
      address: TokensService.tokens.address,
      topics: [transferSingleEventTopic],
      fromBlock: req.fromBlock,
      toBlock: req.toBlock,
    });
    let transferSingleEvents = rawTransferSingleEvents.map((raw: providers.Log) => {
      let description = transferSingleEventInterface.parseLog(raw);
      let event = {} as Tokens.TransferEvent;
      event.blockNumber = raw.blockNumber.toString();
      event.operatorAddress = description.args[0]; // address
      event.fromAddress = description.args[1]; // address
      event.toAddress = description.args[2]; // address
      event.tokenId = description.args[3].toString(); // uint256
      event.amount = description.args[4].toString(); // uint256
      event.txHash = raw.transactionHash;
      return event;
    });

    // ERC1155 safeBatchTransfer
    let transferBatchEventABI = [
      `event TransferBatch(address indexed _operator, address indexed _from, address indexed _to, uint256[] _ids, uint256[] _values)`,
    ];
    const transferBatchEventInterface = new utils.Interface(transferBatchEventABI);
    const transferBatchEventSignature: string =
      'TransferBatch(address,address,address,uint256[],uint256[])';
    const transferBatchEventTopic: string = utils.id(transferBatchEventSignature);
    let rawTransferBatchEvents = await TokensService.tokens.provider.getLogs({
      address: TokensService.tokens.address,
      topics: [transferBatchEventTopic],
      fromBlock: req.fromBlock,
      toBlock: req.toBlock,
    });
    let transferBatchEvents = rawTransferBatchEvents.flatMap((raw: providers.Log) => {
      let description = transferBatchEventInterface.parseLog(raw);
      let tokenIds: BigNumber[] = description.args[3];
      let events = tokenIds.map((tokenId, i) => {
        let event = {} as Tokens.TransferEvent;
        event.blockNumber = raw.blockNumber.toString();
        event.operatorAddress = description.args[0]; // address
        event.fromAddress = description.args[1]; // address
        event.toAddress = description.args[2]; // address
        event.tokenId = tokenId.toString(); // uint256!
        event.amount = description.args[4][i].toString(); // uint256
        event.txHash = raw.transactionHash;
        return event;
      });
      return events;
    });

    let events = transferEvents.concat(transferSingleEvents).concat(transferBatchEvents);

    this.logger.log(
      `GRPC: GetTransferEvents for blocks ${req.fromBlock} to ${req.toBlock} found ${events.length} events`
    );
    return {
      events: events,
    };
  }

  @GrpcMethod('TokensService', 'GetMarketplaceSaleEvents')
  async getMarketplaceSaleEvents(
    req: Tokens.GetMarketplaceSaleEventsRequest
  ): Promise<Tokens.GetMarketplaceSaleEventsResponse> {
    this.logger.verbose(
      `entering getMarketplaceSaleEvents at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );

    let abi = [
      'event MarketplaceSale(uint64 indexed tokenId, uint64 soldAt, address indexed buyer, uint256 price, address seller, address indexed beneficiary, uint256 royalty)',
    ];
    const eventInterface = new utils.Interface(abi);
    const eventSignature: string =
      'MarketplaceSale(uint64,uint64,address,uint256,address,address,uint256)';
    const eventTopic: string = utils.id(eventSignature); // Get the data hex string

    let rawEvents = await TokensService.tokens.provider.getLogs({
      address: TokensService.tokens.address,
      topics: [eventTopic],
      fromBlock: req.fromBlock,
      toBlock: req.toBlock,
    });

    let events = rawEvents.map((raw: providers.Log) => {
      let description = eventInterface.parseLog(raw);
      let event = {} as Tokens.MarketplaceSaleEvent;
      event.blockNumber = raw.blockNumber.toString();
      event.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      event.buyerAddress = description.args[2]; // address indexed buyer
      event.priceAttoSci = description.args[3]; // uint256 price
      event.sellerAddress = description.args[4].toString(); // address seller
      event.beneficiaryAddress = description.args[5].toString(); // address indexed beneficiary
      event.royaltyAttoSci = description.args[6]; // uint256 royalty
      event.soldAtSec = description.args[1]; //uint64 soldAt
      event.txHash = raw.transactionHash;
      return event;
    });

    this.logger.log(
      `GRPC: GetMarketplaceSaleEvents for blocks ${req.fromBlock} to ${req.toBlock} found ${events.length} events`
    );
    return {
      events: events,
    };
  }

  @GrpcMethod('TokensService', 'StreamNFTUpdatedEvents')
  streamNFTUpdatedEvents(
    req: Tokens.StreamNFTUpdatedEventsRequest
  ): Observable<Tokens.StreamNFTUpdatedEventsResponse> {
    loggerVerboseWithBlockNumber(
      this.logger,
      'entering streamNFTUpdatedEvents at block',
      this.SUPERADMIN.provider
    );

    let abi = [
      'event NFTUpdated(uint64 indexed tokenId, uint192 status, address indexed owner, address admin, address indexed beneficiary)',
    ];
    const eventInterface = new utils.Interface(abi);
    const eventSignature: string = 'NFTUpdated(uint64,uint192,address,address,address)';
    const eventTopic: string = utils.id(eventSignature); // Get the data hex string

    let filter = {
      address: TokensService.tokens.address,
      topics: [eventTopic],
    };

    // Create a Subject that we can use to publish events
    let eventSubject = new Subject<Tokens.StreamNFTUpdatedEventsResponse>();

    // It doesn't seem like we are able to tell the difference between different client sessions
    // so this is the best I could come up with for now... it could be that multiple runs of the
    // end to end tests are properly detected as reconnections by the same client
    TokensService.tokens.provider.removeAllListeners(filter);

    TokensService.tokens.provider.on(filter, (raw: providers.Log) => {
      let description = eventInterface.parseLog(raw);
      let eventObject = {} as Tokens.NFTUpdatedEvent;
      eventObject.blockNumber = raw.blockNumber.toString();
      eventObject.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      eventObject.status = description.args[1].toString(); // uint192 status
      eventObject.ownerAddress = description.args[2]; // address indexed owner
      eventObject.adminAddress = description.args[3]; // address admin
      eventObject.beneficiaryAddress = description.args[4]; // address indexed beneficiary
      eventObject.txHash = raw.transactionHash;

      this.logger.verbose(`forwarding NFTUpdated event from ${eventObject.blockNumber}`);

      // Emit the event
      eventSubject.next({ event: eventObject });
    });

    loggerLogWithBlockNumber(
      this.logger,
      'GRPC: StreamNFTUpdatedEvents for blocks starting at',
      this.SUPERADMIN.provider
    );

    let observable = eventSubject.asObservable();

    return observable;
  }

  @GrpcMethod('TokensService', 'StreamOwnerContentNodeCreatedEvents')
  streamOwnerContentNodeCreatedEvents(
    req: Tokens.StreamOwnerContentNodeCreatedEventsRequest
  ): Observable<Tokens.StreamOwnerContentNodeCreatedEventsResponse> {
    loggerVerboseWithBlockNumber(
      this.logger,
      'entering streamOwnerContentNodeCreatedEvents at block',
      this.SUPERADMIN.provider
    );

    let abi = [
      'event OwnerContentNodeCreated(uint64 indexed tokenId, bytes32 indexed data, bytes32 indexed prev)',
    ];
    const eventInterface = new utils.Interface(abi);
    const eventSignature: string = 'OwnerContentNodeCreated(uint64,bytes32,bytes32)';
    const eventTopic: string = utils.id(eventSignature); // Get the data hex string

    let filter = {
      address: TokensService.tokens.address,
      topics: [eventTopic],
    };

    // Create a Subject that we can use to publish events
    let eventSubject = new Subject<Tokens.StreamOwnerContentNodeCreatedEventsResponse>();

    TokensService.tokens.provider.removeAllListeners(filter);

    TokensService.tokens.provider.on(filter, (raw: providers.Log) => {
      let description = eventInterface.parseLog(raw);
      let eventObject = {} as Tokens.OwnerContentNodeCreatedEvent;
      eventObject.blockNumber = raw.blockNumber.toString();
      eventObject.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      eventObject.contentCidV1 = this.toCIDv1(description.args[1].toString()); // bytes32 data
      eventObject.previousCidV1 = this.toCIDv1(description.args[2].toString()); // bytes32 prev
      eventObject.txHash = raw.transactionHash;

      this.logger.verbose(
        `forwarding OwnerContentNodeCreated event from ${eventObject.blockNumber}`
      );

      // Emit the event
      eventSubject.next({ event: eventObject });
    });

    loggerLogWithBlockNumber(
      this.logger,
      'GRPC: StreamOwnerContentNodeCreatedEvents for blocks starting at',
      this.SUPERADMIN.provider
    );

    let observable = eventSubject.asObservable();

    return observable;
  }

  @GrpcMethod('TokensService', 'StreamAdminContentNodeCreatedEvents')
  streamAdminContentNodeCreatedEvents(
    req: Tokens.StreamAdminContentNodeCreatedEventsRequest
  ): Observable<Tokens.StreamAdminContentNodeCreatedEventsResponse> {
    loggerVerboseWithBlockNumber(
      this.logger,
      'entering streamAdminContentNodeCreatedEvents at block',
      this.SUPERADMIN.provider
    );

    let abi = [
      'event AdminContentNodeCreated(uint64 indexed tokenId, bytes32 indexed data, bytes32 indexed prev)',
    ];
    const eventInterface = new utils.Interface(abi);
    const eventSignature: string = 'AdminContentNodeCreated(uint64,bytes32,bytes32)';
    const eventTopic: string = utils.id(eventSignature); // Get the data hex string

    let filter = {
      address: TokensService.tokens.address,
      topics: [eventTopic],
    };

    // Create a Subject that we can use to publish events
    let eventSubject = new Subject<Tokens.StreamAdminContentNodeCreatedEventsResponse>();

    TokensService.tokens.provider.removeAllListeners(filter);

    TokensService.tokens.provider.on(filter, (raw: providers.Log) => {
      let description = eventInterface.parseLog(raw);
      let eventObject = {} as Tokens.AdminContentNodeCreatedEvent;
      eventObject.blockNumber = raw.blockNumber.toString();
      eventObject.tokenId = description.args[0].toString(); // uint256 indexed tokenId
      eventObject.contentCidV1 = this.toCIDv1(description.args[1].toString()); // bytes32 data
      eventObject.previousCidV1 = this.toCIDv1(description.args[2].toString()); // bytes32 prev
      eventObject.txHash = raw.transactionHash;

      this.logger.verbose(
        `forwarding AdminContentNodeCreated event from ${eventObject.blockNumber}`
      );

      // Emit the event
      eventSubject.next({ event: eventObject });
    });

    loggerLogWithBlockNumber(
      this.logger,
      'GRPC: StreamAdminContentNodeCreatedEvents for blocks starting at',
      this.SUPERADMIN.provider
    );

    let observable = eventSubject.asObservable();

    return observable;
  }

  @GrpcMethod('TokensService', 'StreamMarketplaceSaleEvents')
  streamMarketplaceSaleEvents(
    req: Tokens.StreamMarketplaceSaleEventsRequest
  ): Observable<Tokens.StreamMarketplaceSaleEventsResponse> {
    loggerVerboseWithBlockNumber(
      this.logger,
      'entering streamMarketplaceSaleEvents at block',
      this.SUPERADMIN.provider
    );

    let abi = [
      'event MarketplaceSale(uint64 indexed tokenId, uint64 soldAt, address indexed buyer, uint256 price, address seller, address indexed beneficiary, uint256 royalty)',
    ];
    const eventInterface = new utils.Interface(abi);
    const eventSignature: string =
      'MarketplaceSale(uint64,uint64,address,uint256,address,address,uint256)';
    const eventTopic: string = utils.id(eventSignature); // Get the data hex string

    let filter = {
      address: TokensService.tokens.address,
      topics: [eventTopic],
    };

    // Create a Subject that we can use to publish events
    let eventSubject = new Subject<Tokens.StreamMarketplaceSaleEventsResponse>();

    TokensService.tokens.provider.removeAllListeners(filter);

    TokensService.tokens.provider.on(filter, (raw: providers.Log) => {
      let description = eventInterface.parseLog(raw);
      let eventObject = {} as Tokens.MarketplaceSaleEvent;
      eventObject.blockNumber = raw.blockNumber.toString();
      eventObject.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      eventObject.soldAtSec = description.args[1]; // uint64 soldAt
      eventObject.buyerAddress = description.args[2]; // address indexed buyer
      eventObject.priceAttoSci = description.args[3]; // uint256 price
      eventObject.sellerAddress = description.args[4].toString(); // address seller
      eventObject.beneficiaryAddress = description.args[5].toString(); // address indexed beneficiary
      eventObject.royaltyAttoSci = description.args[6]; // uint256 royalty
      eventObject.txHash = raw.transactionHash;

      this.logger.verbose(`forwarding MarketplaceSale event from ${eventObject.blockNumber}`);

      // Emit the event
      eventSubject.next({ event: eventObject });
    });

    loggerLogWithBlockNumber(
      this.logger,
      'GRPC: StreamMarketplaceSaleEvents for blocks starting at',
      this.SUPERADMIN.provider
    );

    let observable = eventSubject.asObservable();

    return observable;
  }

  @GrpcMethod('TokensService', 'StreamTransferEvents')
  streamTransferEvents(
    req: Tokens.StreamTransferEventsRequest
  ): Observable<Tokens.StreamTransferEventsResponse> {
    loggerVerboseWithBlockNumber(
      this.logger,
      'entering streamTransferEvents at block',
      this.SUPERADMIN.provider
    );

    let transferEventABI = [
      'event Transfer(address indexed _from, address indexed _to, uint256 _value)',
    ];
    const transferEventInterface = new utils.Interface(transferEventABI);
    const transferEventSignature: string = 'Transfer(address,address,uint256)';
    const transferEventTopic: string = utils.id(transferEventSignature);

    let transferSingleEventABI = [
      'event TransferSingle(address indexed _operator, address indexed _from, address indexed _to, uint256 _id, uint256 _value)',
    ];
    const transferSingleEventInterface = new utils.Interface(transferSingleEventABI);
    const transferSingleEventSignature: string =
      'TransferSingle(address,address,address,uint256,uint256)';
    const transferSingleEventTopic: string = utils.id(transferSingleEventSignature);

    let transferBatchEventABI = [
      'event TransferBatch(address indexed _operator, address indexed _from, address indexed _to, uint256[] _ids, uint256[] _values)',
    ];
    const transferBatchEventInterface = new utils.Interface(transferBatchEventABI);
    const transferBatchEventSignature: string =
      'TransferBatch(address,address,address,uint256[],uint256[])';
    const transferBatchEventTopic: string = utils.id(transferBatchEventSignature);

    let filters = [
      {
        address: TokensService.tokens.address,
        topics: [transferEventTopic],
        interface: transferEventInterface,
        type: 'Transfer',
      },
      {
        address: TokensService.tokens.address,
        topics: [transferSingleEventTopic],
        interface: transferSingleEventInterface,
        type: 'TransferSingle',
      },
      {
        address: TokensService.tokens.address,
        topics: [transferBatchEventTopic],
        interface: transferBatchEventInterface,
        type: 'TransferBatch',
      },
    ];

    let eventSubject = new Subject<Tokens.StreamTransferEventsResponse>();

    filters.forEach((filter) => {
      TokensService.tokens.provider.removeAllListeners(filter);

      TokensService.tokens.provider.on(filter, (raw: providers.Log) => {
        let description = filter.interface.parseLog(raw);
        let events: Tokens.TransferEvent[] = [];

        if (filter.type === 'Transfer') {
          let event = {} as Tokens.TransferEvent;
          event.blockNumber = raw.blockNumber.toString();
          event.operatorAddress = '0x' + '0'.repeat(32); // address -- not present in ERC Transfer
          event.fromAddress = description.args[0]; // address
          event.toAddress = description.args[1]; // address
          event.tokenId = '0'; // uint256 -- not present in ERC Transfer
          event.amount = description.args[2].toString(); // uint256
          event.txHash = raw.transactionHash;
          events.push(event);
        } else if (filter.type === 'TransferSingle') {
          let event = {} as Tokens.TransferEvent;
          event.blockNumber = raw.blockNumber.toString();
          event.operatorAddress = description.args[0]; // address
          event.fromAddress = description.args[1]; // address
          event.toAddress = description.args[2]; // address
          event.tokenId = description.args[3].toString(); // uint256
          event.amount = description.args[4].toString(); // uint256
          event.txHash = raw.transactionHash;
          events.push(event);
        } else if (filter.type === 'TransferBatch') {
          let tokenIds: BigNumber[] = description.args[3];
          this.logger.verbose(tokenIds);
          let ERC1155Batchevents: Tokens.TransferEvent[] = tokenIds.map((tokenId, i) => {
            let event = {} as Tokens.TransferEvent;
            event.blockNumber = raw.blockNumber.toString();
            event.operatorAddress = description.args[0]; // address
            event.fromAddress = description.args[1]; // address
            event.toAddress = description.args[2]; // address
            event.tokenId = tokenId.toString(); // uint64
            event.amount = description.args[4][i].toString(); // uint256
            event.txHash = raw.transactionHash;
            return event;
          });
          events = events.concat(ERC1155Batchevents);
        } else {
          this.logger.error('Unrecognized filter type ?!?');
        }

        events.forEach((event: Tokens.TransferEvent) => {
          this.logger.verbose(`forwarding TransferEvent from ${event.blockNumber}`);
          eventSubject.next({ event: event });
        });
      });
    });

    loggerLogWithBlockNumber(
      this.logger,
      'GRPC: StreamTransferEvents for blocks starting at',
      this.SUPERADMIN.provider
    );

    return eventSubject.asObservable();
  }

  @GrpcMethod('TokensService', 'GetNFTUpdatedEventsFromTxHash')
  async getNFTUpdatedEventsFromTxHash(
    req: Tokens.GetNFTUpdatedEventsFromTxHashRequest
  ): Promise<Tokens.GetNFTUpdatedEventsFromTxHashResponse> {
    this.logger.verbose(`Entering getNFTUpdatedEventsFromTxHash for tx hash #${req.txHash}`);

    const receipt = await TokensService.tokens.provider.getTransactionReceipt(req.txHash);

    let abi = [
      'event NFTUpdated(uint64 indexed tokenId, uint192 status, address indexed owner, address admin, address indexed beneficiary)',
    ];
    const eventInterface = new utils.Interface(abi);

    let events: Tokens.NFTUpdatedEvent[] = receipt.logs.flatMap((raw: providers.Log) => {
      // Filter out logs that do not match our event.
      if (
        raw.address !== TokensService.tokens.address ||
        raw.topics[0] !== eventInterface.getEventTopic('NFTUpdated')
      ) {
        return [];
      }

      this.logger.error(raw);

      let description = eventInterface.parseLog(raw);
      let event = {} as Tokens.NFTUpdatedEvent;

      this.logger.error(raw.blockNumber);
      event.blockNumber = raw.blockNumber.toString();
      event.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      event.status = description.args[1].toString(); // uint192 status
      event.ownerAddress = description.args[2]; // address indexed owner
      event.adminAddress = description.args[3]; // address admin
      event.beneficiaryAddress = description.args[4]; // address indexed beneficiary
      event.txHash = raw.transactionHash;
      return event;
    }) as Tokens.NFTUpdatedEvent[]; // This will discard any null values from the list

    this.logger.log(
      `GRPC: GetNFTUpdatedEventsFromTxHash for tx hash = #${req.txHash} found ${events.length} events`
    );
    return {
      events: events,
    };
  }

  @GrpcMethod('TokensService', 'GetAdminContentNodeCreatedEventsFromTxHash')
  async getAdminContentNodeCreatedEventsFromTxHash(
    req: Tokens.GetAdminContentNodeCreatedEventsFromTxHashRequest
  ): Promise<Tokens.GetAdminContentNodeCreatedEventsFromTxHashResponse> {
    this.logger.verbose(
      `Entering getAdminContentNodeCreatedEventsFromTxHash for tx hash #${req.txHash}`
    );

    const receipt = await TokensService.tokens.provider.getTransactionReceipt(req.txHash);

    let abi = [
      'event AdminContentNodeCreated(uint64 indexed tokenId, bytes32 indexed data, bytes32 indexed prev)',
    ];
    const eventInterface = new utils.Interface(abi);

    let events: Tokens.AdminContentNodeCreatedEvent[] = receipt.logs.flatMap(
      (raw: providers.Log) => {
        // Filter out logs that do not match our event.
        if (
          raw.address !== TokensService.tokens.address ||
          raw.topics[0] !== eventInterface.getEventTopic('AdminContentNodeCreated')
        ) {
          return [];
        }

        let description = eventInterface.parseLog(raw);
        let event = {} as Tokens.AdminContentNodeCreatedEvent;
        event.blockNumber = raw.blockNumber.toString();
        event.tokenId = description.args[0].toString(); // uint64 indexed tokenId
        event.contentCidV1 = this.toCIDv1(description.args[1].toString()); // bytes32 data
        event.previousCidV1 = this.toCIDv1(description.args[2].toString()); // bytes32 prev
        event.txHash = raw.transactionHash;
        return event;
      }
    ) as Tokens.AdminContentNodeCreatedEvent[]; // This will discard any null values from the list

    this.logger.log(
      `GRPC: GetAdminContentNodeCreatedEventsFromTxHash for tx hash = #${req.txHash} found ${events.length} events`
    );
    return {
      events: events,
    };
  }

  @GrpcMethod('TokensService', 'GetOwnerContentNodeCreatedEventsFromTxHash')
  async getOwnerContentNodeCreatedEventsFromTxHash(
    req: Tokens.GetOwnerContentNodeCreatedEventsFromTxHashRequest
  ): Promise<Tokens.GetOwnerContentNodeCreatedEventsFromTxHashResponse> {
    this.logger.verbose(
      `Entering getOwnerContentNodeCreatedEventsFromTxHash for tx hash #${req.txHash}`
    );

    const receipt = await TokensService.tokens.provider.getTransactionReceipt(req.txHash);

    let abi = [
      'event OwnerContentNodeCreated(uint64 indexed tokenId, bytes32 indexed data, bytes32 indexed prev)',
    ];
    const eventInterface = new utils.Interface(abi);

    let events: Tokens.OwnerContentNodeCreatedEvent[] = receipt.logs.flatMap(
      (raw: providers.Log) => {
        // Filter out logs that do not match our event.
        if (
          raw.address !== TokensService.tokens.address ||
          raw.topics[0] !== eventInterface.getEventTopic('OwnerContentNodeCreated')
        ) {
          return [];
        }

        let description = eventInterface.parseLog(raw);
        let event = {} as Tokens.OwnerContentNodeCreatedEvent;
        event.blockNumber = raw.blockNumber.toString();
        event.tokenId = description.args[0].toString(); // uint64 indexed tokenId
        event.contentCidV1 = this.toCIDv1(description.args[1].toString()); // bytes32 data
        event.previousCidV1 = this.toCIDv1(description.args[2].toString()); // bytes32 prev
        event.txHash = raw.transactionHash;
        return event;
      }
    );

    this.logger.log(
      `GRPC: GetOwnerContentNodeCreatedEventsFromTxHash for tx hash = #${req.txHash} found ${events.length} events`
    );
    return {
      events: events,
    };
  }

  @GrpcMethod('TokensService', 'GetTransferEventsFromTxHash')
  async getTransferEventsFromTxHash(
    req: Tokens.GetTransferEventsFromTxHashRequest
  ): Promise<Tokens.GetTransferEventsFromTxHashResponse> {
    this.logger.verbose(`Entering getTransferEventsFromTxHash for tx hash #${req.txHash}`);

    const receipt = await TokensService.tokens.provider.getTransactionReceipt(req.txHash);

    let events: Tokens.TransferEvent[] = [];

    // ERC20 transfer
    let transferEventABI = [
      `event Transfer(address indexed _from, address indexed _to, uint256 _value)`,
    ];
    const transferEventInterface = new utils.Interface(transferEventABI);
    let transferEvents = receipt.logs.flatMap((raw: providers.Log) => {
      // Filter out logs that do not match our event.
      if (
        raw.address !== TokensService.tokens.address ||
        raw.topics[0] !== transferEventInterface.getEventTopic('Transfer')
      ) {
        return [];
      }

      let description = transferEventInterface.parseLog(raw);
      let event = {} as Tokens.TransferEvent;
      event.blockNumber = raw.blockNumber.toString();
      event.operatorAddress = '0x' + '0'.repeat(32); // address -- not present in ERC Transfer
      event.fromAddress = description.args[0]; // address
      event.toAddress = description.args[1]; // address
      event.tokenId = '0'; // uint256 -- not present in ERC Transfer
      event.amount = description.args[2].toString(); // uint256
      event.txHash = raw.transactionHash;
      return [event];
    });

    // ERC1155 safeTransfer
    let transferSingleEventABI = [
      `event TransferSingle(address indexed _operator, address indexed _from, address indexed _to, uint256 _id, uint256 _value)`,
    ];
    const transferSingleEventInterface = new utils.Interface(transferSingleEventABI);
    let transferSingleEvents = receipt.logs.flatMap((raw: providers.Log) => {
      // Filter out logs that do not match our event.
      if (
        raw.address !== TokensService.tokens.address ||
        raw.topics[0] !== transferSingleEventInterface.getEventTopic('TransferSingle')
      ) {
        return [];
      }

      let description = transferSingleEventInterface.parseLog(raw);
      let event = {} as Tokens.TransferEvent;
      event.blockNumber = raw.blockNumber.toString();
      event.operatorAddress = description.args[0]; // address
      event.fromAddress = description.args[1]; // address
      event.toAddress = description.args[2]; // address
      event.tokenId = description.args[3].toString(); // uint256
      event.amount = description.args[4].toString(); // uint256
      event.txHash = raw.transactionHash;
      return [event];
    });

    // ERC1155 safeBatchTransfer
    let transferBatchEventABI = [
      `event TransferBatch(address indexed _operator, address indexed _from, address indexed _to, uint256[] _ids, uint256[] _values)`,
    ];
    const transferBatchEventInterface = new utils.Interface(transferBatchEventABI);
    let transferBatchEvents = receipt.logs.flatMap((raw: providers.Log) => {
      // Filter out logs that do not match our event.
      if (
        raw.address !== TokensService.tokens.address ||
        raw.topics[0] !== transferBatchEventInterface.getEventTopic('TransferBatch')
      ) {
        return [];
      }

      let description = transferBatchEventInterface.parseLog(raw);
      let tokenIds: BigNumber[] = description.args[3];
      let events = tokenIds.map((tokenId, i) => {
        let event = {} as Tokens.TransferEvent;
        event.blockNumber = raw.blockNumber.toString();
        event.operatorAddress = description.args[0]; // address
        event.fromAddress = description.args[1]; // address
        event.toAddress = description.args[2]; // address
        event.tokenId = tokenId.toString(); // uint256!
        event.amount = description.args[4][i].toString(); // uint256
        event.txHash = raw.transactionHash;
        return event;
      });
      return events;
    });

    events = transferEvents.concat(transferSingleEvents).concat(transferBatchEvents);

    this.logger.log(
      `GRPC: GetTransferEventsFromTxHash for tx hash = #${req.txHash} found ${events.length} events`
    );
    return {
      events: events,
    };
  }

  @GrpcMethod('TokensService', 'GetMarketplaceSaleEventsFromTxHash')
  async getMarketplaceSaleEventsFromTxHash(
    req: Tokens.GetMarketplaceSaleEventsFromTxHashRequest
  ): Promise<Tokens.GetMarketplaceSaleEventsFromTxHashResponse> {
    this.logger.verbose(`Entering getMarketplaceSaleEventsFromTxHash for tx hash #${req.txHash}`);

    const receipt = await TokensService.tokens.provider.getTransactionReceipt(req.txHash);

    let abi = [
      'event MarketplaceSale(uint64 indexed tokenId, uint64 soldAt, address indexed buyer, uint256 price, address seller, address indexed beneficiary, uint256 royalty)',
    ];
    const eventInterface = new utils.Interface(abi);

    let events: Tokens.MarketplaceSaleEvent[] = receipt.logs.flatMap((raw: providers.Log) => {
      // Filter out logs that do not match our event.
      if (
        raw.address !== TokensService.tokens.address ||
        raw.topics[0] !== eventInterface.getEventTopic('MarketplaceSale')
      ) {
        return [];
      }

      let description = eventInterface.parseLog(raw);
      let event = {} as Tokens.MarketplaceSaleEvent;
      event.blockNumber = raw.blockNumber.toString();
      event.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      event.buyerAddress = description.args[2]; // address indexed buyer
      event.priceAttoSci = description.args[3]; // uint256 price
      event.sellerAddress = description.args[4].toString(); // address seller
      event.beneficiaryAddress = description.args[5].toString(); // address indexed beneficiary
      event.royaltyAttoSci = description.args[6]; // uint256 royalty
      event.soldAtSec = description.args[1]; //uint64 soldAt
      event.txHash = raw.transactionHash;
      return event;
    });

    this.logger.log(
      `GRPC: GetMarketplaceSaleEventsFromTxHash for tx hash = #${req.txHash} found ${events.length} events`
    );
    return {
      events: events,
    };
  }
}
