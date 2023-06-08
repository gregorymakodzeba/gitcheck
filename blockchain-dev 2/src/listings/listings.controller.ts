import { Controller, OnModuleInit } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Logger } from '@nestjs/common'; // supports 'log', 'error', 'warn', 'debug', and 'verbose'

import hre from 'hardhat';
import { BigNumberish, BigNumber, Wallet, Contract, providers, utils, constants } from 'ethers';

import { TokensService } from '../tokens/tokens.service';
import { ListingsService } from './listings.service';
import { BlockchainService } from '../blockchain/blockchain.service';

import * as Listings from './v1/listings.interface';
// @ts-ignore
import type { Listings as Listings__contract } from '../../types/contracts/Listings';
// @ts-ignore
import { Listings__factory } from '../../types/factories/contracts/Listings__factory';

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
export class ListingsController implements OnModuleInit {
  private logger: Logger;
  private SUPERADMIN: Wallet;

  constructor() {
    this.logger = new Logger('ListingsController');
    this.logger.log('ListingsController created');
  }

  async onModuleInit() {
    this.logger.log('ListingsController onModuleInit()');
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
    let listingsFactory: Listings__factory = <Listings__factory>(
      await (hre as any).ethers.getContractFactory('Listings', this.SUPERADMIN)
    );
    ListingsService.listings = <Listings__contract>(
      new Contract(data.listingsAddress, listingsFactory.interface, this.SUPERADMIN)
    );
    this.logger.log(
      `listings.controller created for listings @ ${ListingsService.listings.address}`
    );
  }

  @GrpcMethod('ListingsService', 'GetListing')
  async getListing(req: Listings.GetListingRequest): Promise<Listings.GetListingResponse> {
    this.logger.verbose(
      `entering getListing at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let listing = await ListingsService.listings.sellerListings(bn(req.tokenId));

    // get some information from Tokens for convenience
    let sellerAddress = listing.seller;
    let beneficiaryAddress = await TokensService.tokens.beneficiaryOf(req.tokenId);
    let royaltyNumerator = await ListingsService.listings.royaltyNumerator();
    let fullBenefit = await TokensService.tokens.isFullBenefit(req.tokenId);
    let price = await ListingsService.listings[
      'getListingPrice(uint64,uint64,uint256,bool,uint256)'
    ](
      Date.now(),
      listing.startTimeSec,
      listing.startPriceAttoSci,
      listing.priceIncreases,
      listing.priceSlopeNumerator
    );
    let royalty = price.mul(royaltyNumerator).div(256);
    let endless = bn(listing.endTimeSec).eq(0);
    let endPriceAttoSci = await ListingsService.listings[
      'getListingPrice(uint64,uint64,uint256,bool,uint256)'
    ](
      endless ? listing.startTimeSec : listing.endTimeSec,
      listing.startTimeSec,
      listing.startPriceAttoSci,
      listing.priceIncreases,
      listing.priceSlopeNumerator
    );
    this.logger.log(
      `GRPC: GetListing [${req.tokenId}] => from ${price} now to ${endPriceAttoSci} at ${listing.endTimeSec}`
    );
    return {
      sellerAddress: sellerAddress,
      priceAttoSci: price.toString(),
      beneficiaryAddress: beneficiaryAddress,
      royaltyAttoSci: fullBenefit ? price.toString() : royalty.toString(),
      endTimeSec: listing.endTimeSec.toString(),
      endPriceAttoSci: endPriceAttoSci.toString(),
    };
  }

  @GrpcMethod('ListingsService', 'SetListing')
  async setListing(req: Listings.SetListingRequest): Promise<Listings.SetListingResponse> {
    this.logger.verbose(
      `entering setListing at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let listing = await ListingsService.listings.sellerListings(bn(req.tokenId));
    let sellerAddress = listing.seller;
    if (sellerAddress == constants.AddressZero) {
      sellerAddress = await TokensService.tokens.ownerOf(req.tokenId);
      this.logger.verbose(`creating a new listing of NFT [${req.tokenId}] for ${sellerAddress}`);
    } else {
      this.logger.verbose(`updating a listing of NFT [${req.tokenId}] for ${sellerAddress}`);
    }

    let endless = bn(req.endTimeSec).eq(0);
    let priceIncreases = endless ? false : bn(req.endPriceAttoSci).gt(bn(req.startPriceAttoSci));

    let deltaPrice;
    if (priceIncreases) {
      deltaPrice = bn(req.endPriceAttoSci).sub(bn(req.startPriceAttoSci));
    } else {
      deltaPrice = bn(req.startPriceAttoSci).sub(bn(req.endPriceAttoSci));
    }
    let deltaTime = endless ? bn(1) : bn(req.endTimeSec).sub(bn(req.startTimeSec));
    let denom = bn(2).pow(64);

    let priceSlopeNumerator = endless ? bn(0) : bn(deltaPrice).mul(denom).div(deltaTime);

    let endPriceAttoSci = endless ? bn(req.startPriceAttoSci) : bn(req.endPriceAttoSci);
    let endTimeSec = endless ? bn('0') : bn(req.endTimeSec);

    let gasBefore = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas before ${scale(gasBefore)} ${AppService.GAS}`);

    await TokensService.setApprovals(req.sellerId);
    this.logger.verbose(
      `listings.setListings at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let tx = await ListingsService.listings.setListing(
      req.tokenId,
      sellerAddress,
      req.startTimeSec,
      req.endTimeSec,
      req.startPriceAttoSci,
      priceIncreases,
      priceSlopeNumerator,
      { gasLimit: 300000 } // 198,786
    );
    this.logger.log(`listings.setListing ${AppService.snowtrace}${tx.hash}`);
    //await tx.wait();
    let gasAfter = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas after ${scale(gasAfter)} gas`);
    let costAttoGas = gasBefore.sub(gasAfter);
    this.logger.log(
      `GRPC: SetListing [${req.tokenId}] => from ${req.startPriceAttoSci} at ${req.startTimeSec} to ${endPriceAttoSci} at ${endTimeSec}`
    );
    return {
      sellerAddress: sellerAddress,
      costAttoGas: costAttoGas.toString(),
      txHash: tx.hash,
    };
  }

  @GrpcMethod('ListingsService', 'CancelListing')
  async cancelListing(req: Listings.CancelListingRequest): Promise<Listings.CancelListingResponse> {
    this.logger.verbose(
      `entering cancelListing at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let listing = await ListingsService.listings.sellerListings(bn(req.tokenId));
    let sellerAddress = listing.seller;
    if (sellerAddress == constants.AddressZero) {
      throw 'Invalid listing';
    } else {
      this.logger.verbose(`canceling the listing of NFT [${req.tokenId}] for ${sellerAddress}`);
    }
    let gasBefore = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas before ${scale(gasBefore)} ${AppService.GAS}`);
    await TokensService.setApprovals(req.sellerId);
    let tx = await ListingsService.listings.cancelListing(req.tokenId, { gasLimit: 300000 });
    this.logger.log(`listings.cancelListing ${AppService.snowtrace}${tx.hash}`);
    //await tx.wait();
    let gasAfter = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas after ${scale(gasAfter)} gas`);
    let costAttoGas = gasBefore.sub(gasAfter);
    this.logger.log(`GRPC: CancelListing [${req.tokenId}]`);
    return {
      sellerAddress: sellerAddress,
      costAttoGas: costAttoGas.toString(),
      txHash: tx.hash,
    };
  }

  @GrpcMethod('ListingsService', 'AcceptListing')
  async acceptListing(req: Listings.AcceptListingRequest): Promise<Listings.AcceptListingResponse> {
    this.logger.verbose(
      `entering acceptListing at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );
    let listing = await ListingsService.listings.sellerListings(bn(req.tokenId));
    let sellerAddress = listing.seller;
    let BUYER = BlockchainService.getUserWallet(req.buyerId);
    let gasBefore = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas before ${scale(gasBefore)} ${AppService.GAS}`);
    await TokensService.setApprovals(req.buyerId);

    let price = await ListingsService.listings['getListingPrice(uint64)'](req.tokenId);
    let tx = await ListingsService.listings.acceptListing(BUYER.address, req.tokenId, price, {
      gasLimit: 300000, // 160,450
    });
    this.logger.log(`listings.acceptListing ${AppService.snowtrace}${tx.hash}`);
    //await tx.wait();
    let gasAfter = await this.SUPERADMIN.getBalance();
    this.logger.verbose(`hot wallet gas after ${scale(gasAfter)} gas`);
    let costAttoGas = gasBefore.sub(gasAfter);
    this.logger.log(`GRPC: AcceptListing [${req.tokenId}] for ${BUYER.address}`);
    return {
      sellerAddress: sellerAddress,
      buyerAddress: BUYER.address,
      costAttoGas: costAttoGas.toString(),
      txHash: tx.hash,
    };
  }

  @GrpcMethod('ListingsService', 'GetListingUpdatedEvents')
  async getListingUpdatedEvents(
    req: Listings.GetListingUpdatedEventsRequest
  ): Promise<Listings.GetListingUpdatedEventsResponse> {
    this.logger.verbose(
      `entering getListingUpdatedEvents at block ${await this.SUPERADMIN.provider.getBlockNumber()}`
    );

    let abi = [
      'event ListingUpdated(uint64 indexed tokenId, address indexed seller, uint64 startTimeSec, uint64 endTimeSec, uint256 indexed startPriceAttoSci, bool priceIncreases, uint256 priceSlopeNumerator)',
    ];
    const eventInterface = new utils.Interface(abi);
    const eventSignature: string =
      'ListingUpdated(uint64,address,uint64,uint64,uint256,bool,uint256)';
    const eventTopic: string = utils.id(eventSignature); // Get the data hex string

    let rawEvents = await ListingsService.listings.provider.getLogs({
      address: ListingsService.listings.address,
      topics: [eventTopic],
      fromBlock: req.fromBlock,
      toBlock: req.toBlock,
    });
    this.logger.verbose(`found ${rawEvents.length} raw events`);

    let events = await Promise.all(
      rawEvents.map(async (raw: providers.Log, i: number) => {
        let description = eventInterface.parseLog(raw);
        let event = {} as Listings.ListingUpdatedEvent;

        event.blockNumber = raw.blockNumber.toString();
        event.tokenId = description.args[0].toString(); // uint64 indexed tokenId
        event.sellerAddress = description.args[1]; // address indexed seller
        event.startTimeSec = description.args[2]; // uint256 startTimeSec
        event.endTimeSec = description.args[3].toString(); // uint256 endTimeSec
        event.startPriceAttoSci = description.args[4].toString(); // uint256 indexed startPriceAttoSci
        let priceIncreases = description.args[5]; // bool priceIncreases
        let priceSlopeNumerator = description.args[6]; // uint256 priceSlopeNumerator
        this.logger.verbose(
          `[${i}] calling price for ${event.endTimeSec}, ${event.startTimeSec}, ${event.startPriceAttoSci}, ${priceIncreases}, ${priceSlopeNumerator}`
        );

        let endless = bn(event.endTimeSec).eq(0);
        if (endless) {
          event.endPriceAttoSci = event.startPriceAttoSci;
        } else {
          event.endPriceAttoSci = (
            await ListingsService.listings['getListingPrice(uint64,uint64,uint256,bool,uint256)'](
              event.endTimeSec,
              event.startTimeSec,
              event.startPriceAttoSci,
              priceIncreases,
              priceSlopeNumerator
            )
          ).toString();
        }

        event.txHash = raw.transactionHash;
        return event;
      })
    );

    this.logger.log(
      `GRPC: GetListingUpdatedEvents for blocks ${req.fromBlock} to ${req.toBlock} found ${events.length} events`
    );

    return {
      events: events,
    };
  }

  @GrpcMethod('ListingsService', 'StreamListingUpdatedEvents')
  streamListingUpdatedEvents(
    req: Listings.StreamListingUpdatedEventsRequest
  ): Observable<Listings.StreamListingUpdatedEventsResponse> {
    loggerVerboseWithBlockNumber(
      this.logger,
      'entering streamListingUpdatedEvents at block',
      this.SUPERADMIN.provider
    );

    let abi = [
      'event ListingUpdated(uint64 indexed tokenId, address indexed seller, uint64 startTimeSec, uint64 endTimeSec, uint256 indexed startPriceAttoSci, bool priceIncreases, uint256 priceSlopeNumerator)',
    ];
    const eventInterface = new utils.Interface(abi);
    const eventSignature: string =
      'ListingUpdated(uint64,address,uint64,uint64,uint256,bool,uint256)';
    const eventTopic: string = utils.id(eventSignature);

    const filter = {
      address: ListingsService.listings.address,
      topics: [eventTopic],
    };

    let eventSubject = new Subject<Listings.StreamListingUpdatedEventsResponse>();

    ListingsService.listings.provider.removeAllListeners(filter);

    ListingsService.listings.provider.on(filter, async (raw: providers.Log) => {
      let description = eventInterface.parseLog(raw);
      let event = {} as Listings.ListingUpdatedEvent;

      event.blockNumber = raw.blockNumber.toString();
      event.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      event.sellerAddress = description.args[1]; // address indexed seller
      event.startTimeSec = description.args[2].toString(); // uint256 startTimeSec
      event.endTimeSec = description.args[3].toString(); // uint256 endTimeSec
      event.startPriceAttoSci = description.args[4].toString(); // uint256 indexed startPriceAttoSci
      let priceIncreases = description.args[5]; // bool priceIncreases
      let priceSlopeNumerator = description.args[6].toString(); // uint256 priceSlopeNumerator

      let endless = bn(event.endTimeSec).eq(0);
      if (endless) {
        event.endPriceAttoSci = event.startPriceAttoSci;
      } else {
        event.endPriceAttoSci = (
          await ListingsService.listings['getListingPrice(uint64,uint64,uint256,bool,uint256)'](
            event.endTimeSec,
            event.startTimeSec,
            event.startPriceAttoSci,
            priceIncreases,
            priceSlopeNumerator
          )
        ).toString();
      }

      event.txHash = raw.transactionHash;
      this.logger.verbose(`forwarding ListingUpdated event from ${event.blockNumber}`);
      eventSubject.next({ event: event });
    });

    loggerLogWithBlockNumber(
      this.logger,
      'GRPC: StreamListingUpdatedEvents for blocks starting at',
      this.SUPERADMIN.provider
    );

    return eventSubject.asObservable();
  }
  @GrpcMethod('ListingsService', 'GetListingUpdatedEventsFromTxHash')
  async getListingUpdatedEventsFromTxHash(
    req: Listings.GetListingUpdatedEventsFromTxHashRequest
  ): Promise<Listings.GetListingUpdatedEventsFromTxHashResponse> {
    this.logger.verbose(`Entering getListingUpdatedEventsFromTxHash for tx hash #${req.txHash}`);

    const receipt = await ListingsService.listings.provider.getTransactionReceipt(req.txHash);

    let abi = [
      'event ListingUpdated(uint64 indexed tokenId, address indexed seller, uint64 startTimeSec, uint64 endTimeSec, uint256 indexed startPriceAttoSci, bool priceIncreases, uint256 priceSlopeNumerator)',
    ];
    const eventInterface = new utils.Interface(abi);

    // use a simple for loop instead of flatmap pattern as in other controllers because of the async call

    let events: Listings.ListingUpdatedEvent[] = [];

    for (let raw of receipt.logs) {
      // Filter out logs that do not match our event.
      if (
        raw.address !== ListingsService.listings.address ||
        raw.topics[0] !== eventInterface.getEventTopic('ListingUpdated')
      ) {
        continue;
      }

      let description = eventInterface.parseLog(raw);
      let event = {} as Listings.ListingUpdatedEvent;
      event.blockNumber = raw.blockNumber.toString();
      event.tokenId = description.args[0].toString(); // uint64 indexed tokenId
      event.sellerAddress = description.args[1]; // address indexed seller
      event.startTimeSec = description.args[2]; // uint256 startTimeSec
      event.endTimeSec = description.args[3].toString(); // uint256 endTimeSec
      event.startPriceAttoSci = description.args[4].toString(); // uint256 indexed startPriceAttoSci
      let priceIncreases = description.args[5]; // bool priceIncreases
      let priceSlopeNumerator = description.args[6]; // uint256 priceSlopeNumerator

      let endless = bn(event.endTimeSec).eq(0);
      if (endless) {
        event.endPriceAttoSci = event.startPriceAttoSci;
      } else {
        event.endPriceAttoSci = (
          await ListingsService.listings['getListingPrice(uint64,uint64,uint256,bool,uint256)'](
            event.endTimeSec,
            event.startTimeSec,
            event.startPriceAttoSci,
            priceIncreases,
            priceSlopeNumerator
          )
        ).toString();
      }

      event.txHash = raw.transactionHash;
      events.push(event);
    }

    this.logger.log(
      `GRPC: GetListingUpdatedEventsFromTxHash for tx hash = #${req.txHash} found ${events.length} events`
    );
    return {
      events: events,
    };
  }
}
