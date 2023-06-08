import { Controller, OnModuleInit } from '@nestjs/common';

import { GrpcMethod } from '@nestjs/microservices';
import { Logger } from '@nestjs/common'; // supports 'log', 'error', 'warn', 'debug', and 'verbose'

import hre from 'hardhat';
import { BigNumberish, BigNumber, Wallet, Contract, providers, utils, constants } from 'ethers';

import { TokensService } from '../tokens/tokens.service';
import { OffersService } from './offers.service';
import { BlockchainService } from '../blockchain/blockchain.service';

import * as Offers from './v1/offers.interface';
// @ts-ignore
import type { Offers as Offers__contract } from '../../types/contracts/Offers';
// @ts-ignore
import { Offers__factory } from '../../types/factories/contracts/Offers__factory';

import { join } from 'path';
import { readFileSync } from 'fs';

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
export class OffersController implements OnModuleInit {
  private logger: Logger;

  // roles used by our contracts
  private SUPERADMIN: Wallet;

  constructor() {
    this.logger = new Logger('OffersController');
    this.logger.log('OffersController created');
  }

  async onModuleInit() {
    this.logger.log('OffersController onModuleInit()');
    const config = hre.network.config;
    const content = readFileSync(
      join(__dirname, `../../../deployment.config.${AppService.chainId}.json`),
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
    let offersFactory: Offers__factory = <Offers__factory>(
      await (hre as any).ethers.getContractFactory('Offers', this.SUPERADMIN)
    );
    OffersService.offers = <Offers__contract>(
      new Contract(data.offersAddress, offersFactory.interface, this.SUPERADMIN)
    );

    this.logger.log(`offers.controller created for offers @ ${OffersService.offers.address}`);
  }

  @GrpcMethod('OffersService', 'GetOffer')
  async getOffer(req: Offers.GetOfferRequest): Promise<Offers.GetOfferResponse> {
    this.logger.verbose(
      `entering getOffer at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let BUYER = BlockchainService.getUserWallet(req.buyerId);
    let key = await OffersService.offers.encodeKey(BUYER.address, req.tokenId);
    let offer = await OffersService.offers.buyerOffers(key);

    // get some information from Tokens for convenience
    let sellerAddress = await TokensService.tokens.ownerOf(req.tokenId);
    let beneficiaryAddress = await TokensService.tokens.beneficiaryOf(req.tokenId);
    let royaltyNumerator = await OffersService.offers.royaltyNumerator();
    let royalty = offer.price.mul(royaltyNumerator).div(256);
    let fullBenefit = await TokensService.tokens.isFullBenefit(req.tokenId);

    let result =
      offer.buyer == constants.AddressZero
        ? ' not found! '
        : `${offer.price} before ${offer.endTimeSec}`;
    this.logger.log(`GRPC: GetOffer [${req.buyerId}:${req.tokenId}] => ${result}`);
    return {
      buyerAddress: offer.buyer,
      priceAttoSci: offer.price.toString(),
      sellerAddress: sellerAddress,
      beneficiaryAddress: beneficiaryAddress,
      royaltyAttoSci: fullBenefit ? offer.price.toString() : royalty.toString(),
      endTimeSec: offer.endTimeSec.toString(),
    };
  }

  @GrpcMethod('OffersService', 'SetOffer')
  async setOffer(req: Offers.SetOfferRequest): Promise<Offers.SetOfferResponse> {
    this.logger.verbose(
      `entering setOffer at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let BUYER = BlockchainService.getUserWallet(req.buyerId);
    let gasBefore = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas before ${scale(gasBefore)} ${AppService.GAS}`);
    await TokensService.setApprovals(req.buyerId);
    let tx = await OffersService.offers.setOffer(
      req.tokenId,
      BUYER.address,
      req.endTimeSec,
      req.priceAttoSci,
      {
        gasLimit: 300000,
      }
    );
    this.logger.log(`offers.setOffer ${AppService.snowtrace}${tx.hash}`);
    //await tx.wait();
    let gasAfter = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas after ${scale(gasAfter)} ${AppService.GAS}`);
    let costAttoGas = gasBefore.sub(gasAfter);

    this.logger.log(
      `GRPC: SetOffer [${req.buyerId}:${req.tokenId}] => ${req.priceAttoSci} before ${req.endTimeSec} - [Gas Used: ${costAttoGas}]`
    );
    return {
      buyerAddress: BUYER.address,
      costAttoGas: costAttoGas.toString(),
      txHash: tx.hash,
    };
  }

  @GrpcMethod('OffersService', 'CancelOffer')
  async cancelOffer(req: Offers.CancelOfferRequest): Promise<Offers.CancelOfferResponse> {
    this.logger.verbose(
      `entering cancelOffer at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let BUYER = BlockchainService.getUserWallet(req.buyerId);
    let gasBefore = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas before ${scale(gasBefore)} ${AppService.GAS}`);
    let tx = await OffersService.offers.cancelOffer(BUYER.address, req.tokenId, {
      gasLimit: 100000, // measured 62,743
    });
    this.logger.log(`offers.cancelOffer ${AppService.snowtrace}${tx.hash}`);
    //await tx.wait();
    let gasAfter = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas after ${scale(gasAfter)} ${AppService.GAS}`);
    let costAttoGas = gasBefore.sub(gasAfter);
    this.logger.log(
      `GRPC: CancelOffer [${req.buyerId}:${req.tokenId}] - [Gas Used: ${costAttoGas}]`
    );
    return {
      buyerAddress: BUYER.address,
      costAttoGas: costAttoGas.toString(),
      txHash: tx.hash,
    };
  }

  @GrpcMethod('OffersService', 'AcceptOffer')
  async acceptOffer(req: Offers.AcceptOfferRequest): Promise<Offers.AcceptOfferResponse> {
    this.logger.verbose(
      `entering acceptOffer at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let BUYER = BlockchainService.getUserWallet(req.buyerId);
    let SELLER = BlockchainService.getUserWallet(req.sellerId);
    let gasBefore = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas before ${scale(gasBefore)} ${AppService.GAS}`);
    await TokensService.setApprovals(req.sellerId);
    let tx = await OffersService.offers.acceptOffer(
      SELLER.address,
      req.tokenId,
      BUYER.address,
      req.priceAttoSci,
      {
        gasLimit: 300000,
      }
    );
    this.logger.log(`offers.acceptOffer ${AppService.snowtrace}${tx.hash}`);
    //await tx.wait();
    let gasAfter = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas after ${scale(gasAfter)} ${AppService.GAS}`);
    let costAttoGas = gasBefore.sub(gasAfter);
    this.logger.log(
      `GRPC: AcceptOffer [${req.buyerId}:${req.tokenId}] - [Gas Used: ${costAttoGas}]`
    );
    return {
      sellerAddress: SELLER.address,
      buyerAddress: BUYER.address,
      costAttoGas: costAttoGas.toString(),
      txHash: tx.hash,
    };
  }

  @GrpcMethod('OffersService', 'GetOfferUpdatedEvents')
  async getOfferUpdatedEvents(
    req: Offers.GetOfferUpdatedEventsRequest
  ): Promise<Offers.GetOfferUpdatedEventsResponse> {
    this.logger.verbose(
      `entering getOfferUpdatedEvents at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );

    let abi = [
      'event OfferUpdated(uint64 indexed tokenId, address indexed buyer, uint256 endTimeSec, uint256 indexed price)',
    ];

    const eventInterface = new utils.Interface(abi);
    const eventSignature: string = 'OfferUpdated(uint64,address,uint256,uint256)';
    const eventTopic: string = utils.id(eventSignature); // Get the data hex string

    let rawEvents = await OffersService.offers.provider.getLogs({
      address: OffersService.offers.address,
      topics: [eventTopic],
      fromBlock: req.fromBlock,
      toBlock: req.toBlock,
    });

    let events = rawEvents.map((raw: providers.Log) => {
      let description = eventInterface.parseLog(raw);
      let event = {} as Offers.OfferUpdatedEvent;
      event.blockNumber = raw.blockNumber.toString();
      event.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      event.buyerAddress = description.args[1]; // address indexed buyer
      event.endTimeSec = description.args[2]; // uint256 endTimeSec
      event.priceAttoSci = description.args[3].toString(); // uint256 indexed price
      event.txHash = raw.transactionHash;
      return event;
    });

    this.logger.log(
      `GRPC: GetOfferUpdatedEvents for blocks ${req.fromBlock} to ${req.toBlock} found ${events.length} events`
    );
    return {
      events: events,
    };
  }

  @GrpcMethod('OffersService', 'StreamOfferUpdatedEvents')
  streamOfferUpdatedEvents(
    req: Offers.StreamOfferUpdatedEventsRequest
  ): Observable<Offers.StreamOfferUpdatedEventsResponse> {
    loggerVerboseWithBlockNumber(
      this.logger,
      'entering streamOfferUpdatedEvents at block',
      this.SUPERADMIN.provider
    );

    let abi = [
      'event OfferUpdated(uint64 indexed tokenId, address indexed buyer, uint256 endTimeSec, uint256 indexed price)',
    ];
    const eventInterface = new utils.Interface(abi);
    const eventSignature: string = 'OfferUpdated(uint64,address,uint256,uint256)';
    const eventTopic: string = utils.id(eventSignature); // Get the data hex string

    let filter = {
      address: OffersService.offers.address,
      topics: [eventTopic],
    };

    // Create a Subject that we can use to publish events
    let eventSubject = new Subject<Offers.StreamOfferUpdatedEventsResponse>();

    // It doesn't seem like we are able to tell the difference between different client sessions
    // so this is the best I could come up with for now... it could be that multiple runs of the
    // end to end tests are properly detected as reconnections by the same client
    // this.logger.error(OffersService.offers.provider.listenerCount(filter));
    OffersService.offers.provider.removeAllListeners(filter);

    OffersService.offers.provider.on(filter, (raw: providers.Log) => {
      let description = eventInterface.parseLog(raw);
      let eventObject = {} as Offers.OfferUpdatedEvent;
      eventObject.blockNumber = raw.blockNumber.toString();
      eventObject.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      eventObject.buyerAddress = description.args[1]; // address indexed buyer
      eventObject.endTimeSec = description.args[2]; // uint256 endTimeSec
      eventObject.priceAttoSci = description.args[3].toString(); // uint256 indexed price
      eventObject.txHash = raw.transactionHash;

      this.logger.verbose(`forwarding OfferUpdated event from ${eventObject.blockNumber}`);

      // Emit the event
      eventSubject.next({ event: eventObject });
    });

    loggerLogWithBlockNumber(
      this.logger,
      'GRPC: StreamOfferUpdatedEvents for blocks starting at',
      this.SUPERADMIN.provider
    );
    let observable = eventSubject.asObservable();

    return observable;
  }

  @GrpcMethod('OffersService', 'GetOfferUpdatedEventsFromTxHash')
  async getOfferUpdatedEventsFromTxHash(
    req: Offers.GetOfferUpdatedEventsFromTxHashRequest
  ): Promise<Offers.GetOfferUpdatedEventsFromTxHashResponse> {
    this.logger.verbose(`Entering getOfferUpdatedEventsFromTxHash for tx hash #${req.txHash}`);

    const receipt = await OffersService.offers.provider.getTransactionReceipt(req.txHash);

    let abi = [
      'event OfferUpdated(uint64 indexed tokenId, address indexed buyer, uint256 endTimeSec, uint256 indexed price)',
    ];
    const eventInterface = new utils.Interface(abi);

    let events: Offers.OfferUpdatedEvent[] = receipt.logs.flatMap((raw: providers.Log) => {
      // Filter out logs that do not match our event.
      if (
        raw.address !== OffersService.offers.address ||
        raw.topics[0] !== eventInterface.getEventTopic('OfferUpdated')
      ) {
        return [];
      }

      let description = eventInterface.parseLog(raw);
      let event = {} as Offers.OfferUpdatedEvent;
      event.blockNumber = raw.blockNumber.toString();
      event.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      event.buyerAddress = description.args[1]; // address indexed buyer
      event.endTimeSec = description.args[2].toNumber(); // uint256 endTimeSec
      event.priceAttoSci = description.args[3].toString(); // uint256 indexed price
      event.txHash = raw.transactionHash;
      return event;
    });

    this.logger.log(
      `GRPC: GetOfferUpdatedEventsFromTxHash for tx hash = #${req.txHash} found ${events.length} events`
    );
    return {
      events: events,
    };
  }
}
