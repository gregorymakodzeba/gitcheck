#!/usr/bin/env node
import { BigNumber, ethers } from 'ethers';
import 'mocha';
import { expect } from 'chai';

import * as Tokens from '../src/tokens/v1/tokens.interface';
import * as Listings from '../src/listings/v1/listings.interface';
import * as Offers from '../src/offers/v1/offers.interface';
import * as Blockchain from '../src/blockchain/v1/blockchain.interface';

import * as API from './client';

const ONE_SCI = ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(18)).toString();
const hotWalletAddress = '0xB86966AaE3144b21d564C1460Ac11d2EA4893793';
const addressZero = '0x0000000000000000000000000000000000000000';

const DATA_CIDv1 = 'bafkreifibcvfo5fubxpcaaz37nq5lpmobbn3eor6omdjzh2x3uyee7utxq';
const ZERO_CIDv1 = 'bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const ADMIN_CIDv1_1 = 'bafkreieppyazcjib7jw5ohtjahtkd7rwp72c2t2htb2v6z2j45cpt66dze';
const OWNER_CIDv1_1 = 'bafkreidrdbelh7nwspicjjf2m5l2d3tuj2rz2kgzn4ngvzdfhy6mqznsdy';
const ADMIN_CIDv1_2 = 'bafkreibk3cb36lyvzxrdd5edfszsdnan7z2xwnugryvf5xsu4brqpns2ea';
const OWNER_CIDv1_2 = 'bafkreigaqyoxu2aho4c4gio6syhchjvwmby43sbdwvnk7tuzxbbrumd4pm';
const ADMIN_CIDv1_3 = 'bafkreidt74ylbysfy4nnopg2oq7ldao764dhtulqtrjkrtkqj325nr2m4y';
const OWNER_CIDv1_3 = 'bafkreidm3avq7bdvu7342p3qfqrflrjrxwenldrlbm6axfuylw3pvvsktm';

const cidToValue = {
  [ADMIN_CIDv1_1]: 'ADMIN_CIDv1_1',
  [OWNER_CIDv1_1]: 'OWNER_CIDv1_1',
  [ADMIN_CIDv1_2]: 'ADMIN_CIDv1_2',
  [OWNER_CIDv1_2]: 'OWNER_CIDv1_2',
  [ADMIN_CIDv1_3]: 'ADMIN_CIDv1_3',
  [OWNER_CIDv1_3]: 'OWNER_CIDv1_3',
  [DATA_CIDv1]: 'DATA_CIDv1',
  [ZERO_CIDv1]: 'ZERO_CIDv1',
};

function lookupCIDv1(cidv1: string): string {
  return cidToValue[cidv1] || 'Unknown cidv1';
}

// these help us assess coverage

const GetAddressBalance = (r) => API.GetAddressBalance(r);
const GetUserBalance = (r) => API.GetUserBalance(r);
const CreditUser = (r) => API.CreditUser(r);
const TransferSCI = (r) => API.TransferSCI(r);
const MintNFT = (r) => API.MintNFT(r);
const EnhanceNFT = (r) => API.EnhanceNFT(r);
const GetNFT = (r) => API.GetNFT(r);
const GetNFTUpdatedEvents = (r) => API.GetNFTUpdatedEvents(r);
const GetAdminContentNodeCreatedEvents = (r) => API.GetAdminContentNodeCreatedEvents(r);
const GetOwnerContentNodeCreatedEvents = (r) => API.GetOwnerContentNodeCreatedEvents(r);
const GetTransferEvents = (r) => API.GetTransferEvents(r);
const GetMarketplaceSaleEvents = (r) => API.GetMarketplaceSaleEvents(r);
const StreamNFTUpdatedEvents = (r) => API.StreamNFTUpdatedEvents(r);
const StreamAdminContentNodeCreatedEvents = (r) => API.StreamAdminContentNodeCreatedEvents(r);
const StreamOwnerContentNodeCreatedEvents = (r) => API.StreamOwnerContentNodeCreatedEvents(r);
const StreamTransferEvents = (r) => API.StreamTransferEvents(r);
const StreamMarketplaceSaleEvents = (r) => API.StreamMarketplaceSaleEvents(r);
const GetNFTUpdatedEventsFromTxHash = (r) => API.GetNFTUpdatedEventsFromTxHash(r);
const GetAdminContentNodeCreatedEventsFromTxHash = (r) =>
  API.GetAdminContentNodeCreatedEventsFromTxHash(r);
const GetOwnerContentNodeCreatedEventsFromTxHash = (r) =>
  API.GetOwnerContentNodeCreatedEventsFromTxHash(r);
const GetTransferEventsFromTxHash = (r) => API.GetTransferEventsFromTxHash(r);
const GetMarketplaceSaleEventsFromTxHash = (r) => API.GetMarketplaceSaleEventsFromTxHash(r);

const GetOffer = (r) => API.GetOffer(r);
const SetOffer = (r) => API.SetOffer(r);
const CancelOffer = (r) => API.CancelOffer(r);
const AcceptOffer = (r) => API.AcceptOffer(r);
const GetOfferUpdatedEvents = (r) => API.GetOfferUpdatedEvents(r);
const StreamOfferUpdatedEvents = (r) => API.StreamOfferUpdatedEvents(r);
const GetOfferUpdatedEventsFromTxHash = (r) => API.GetOfferUpdatedEventsFromTxHash(r);

const GetListing = (r) => API.GetListing(r);
const SetListing = (r) => API.SetListing(r);
const CancelListing = (r) => API.CancelListing(r);
const AcceptListing = (r) => API.AcceptListing(r);
const GetListingUpdatedEvents = (r) => API.GetListingUpdatedEvents(r);
const StreamListingUpdatedEvents = (r) => API.StreamListingUpdatedEvents(r);
const GetListingUpdatedEventsFromTxHash = (r) => API.GetListingUpdatedEventsFromTxHash(r);

const GetChainInfo = (r) => API.GetChainInfo(r);
const GetUserInfo = (r) => API.GetUserInfo(r);
const RecoverUserGas = (r) => API.RecoverUserGas(r);
const GetTxStatus = (r) => API.GetTxStatus(r);
const GetSuperadminInfo = (r) => API.GetSuperadminInfo(r);

function randomUser() {
  let min = 1000000;
  let max = 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function wait(msec: number) {
  let r00: Blockchain.GetChainInfoResponse = await GetChainInfo({});
  if (r00.chainId !== '31337') {
    // no point in waiting if running on hardhat
    await new Promise((r) => setTimeout(r, msec));
  }
  return msec;
}

async function getOneEvent<T extends Object>(
  txBlock: string,
  fn: (r: any) => Promise<T>,
  txHash: string
): Promise<T> {
  // wait a minimum time of one second first
  let waitMsec = await wait(1000);

  while (waitMsec < 10000) {
    let lastBlock = ethers.BigNumber.from((await GetChainInfo({})).lastBlock).toNumber();
    let r: T = await fn({
      fromBlock: parseInt(txBlock) + 1,
      toBlock: lastBlock,
    });

    if ('events' in r) {
      let events = <T[]>r.events;
      if (events.length == 1) {
        return events[0];
      } else if (events.length > 1) {
        // find the event that matches our target txHash
        const matchingEvent = events.find((event) => (event as any).txHash === txHash);
        if (matchingEvent) {
          return matchingEvent;
        } else {
          throw 'No matching event found!';
        }
      }
    }
    waitMsec += await wait(3000);
  }
  return {} as T;
}

async function checkTxHash(txHash: string) {
  let txStatus: Blockchain.GetTxStatusResponse = await GetTxStatus(<Blockchain.GetTxStatusRequest>{
    txHash: txHash,
  });
  expect(txStatus.status).to.be.oneOf([
    Blockchain.GetTxStatusResponse_TxStatus.TX_STATUS_UNSPECIFIED,
    Blockchain.GetTxStatusResponse_TxStatus.TX_STATUS_PENDING,
    Blockchain.GetTxStatusResponse_TxStatus.TX_STATUS_SUCCESS,
    Blockchain.GetTxStatusResponse_TxStatus.TX_STATUS_FAILED,
  ]);

  expect(txStatus.blockHash).to.have.lengthOf(66);

  const blockNumber = ethers.BigNumber.from(txStatus.blockNumber);
  expect(blockNumber.gte(0)).to.be.true;

  const gasUsed = ethers.BigNumber.from(txStatus.costAttoGas);
  expect(gasUsed.gte(0)).to.be.true;

  const gasPrice = ethers.BigNumber.from(txStatus.gasPriceAttoGas);
  expect(gasPrice.gte(0)).to.be.true;

  expect(txStatus.fromAddress).to.match(/^0x[a-fA-F0-9]{40}$/);
  expect(txStatus.toAddress).to.match(/^0x[a-fA-F0-9]{40}$/);

  const nonce = ethers.BigNumber.from(txStatus.nonce);
  expect(nonce.gte(0)).to.be.true;

  const value = ethers.BigNumber.from(txStatus.valueAttoGas);
  expect(value.gte(0)).to.be.true;

  expect(txStatus.inputData).to.be.an.instanceOf(Uint8Array);

  if (txStatus.status === Blockchain.GetTxStatusResponse_TxStatus.TX_STATUS_FAILED) {
    expect(txStatus.errorMessage).to.equal('Transaction failed');
  } else {
    expect(txStatus.errorMessage).to.equal('');
  }

  const blockTimestampSec = new Date(txStatus.blockTimestampSec);
  expect(blockTimestampSec).to.be.an.instanceOf(Date);
  expect(blockTimestampSec.getTime()).to.be.greaterThanOrEqual(0);
}

async function creditUserAndCheckEvents(userId: number, amountAttoSci: string): Promise<void> {
  let initialHotWalletBalance = ethers.BigNumber.from(
    (await GetAddressBalance({ userAddress: hotWalletAddress })).amountAttoSci
  );

  let initialUserBalance = ethers.BigNumber.from(
    (await GetUserBalance({ userId: userId })).amountAttoSci
  );

  let txBlock = (await GetChainInfo({})).lastBlock;
  let r00: Tokens.CreditUserResponse = await CreditUser({
    userId: userId,
    amountAttoSci: amountAttoSci,
  });

  // read the event
  let e00 = await getOneEvent<Tokens.TransferEvent>(txBlock, GetTransferEvents, r00.txHash);

  let toAddress = (await GetUserInfo({ userId: userId })).userAddress;
  expect(e00.amount).to.equal(amountAttoSci);
  expect(e00.txHash).to.equal(r00.txHash);
  expect(parseInt(e00.blockNumber)).to.be.gt(parseInt(txBlock));
  expect(parseInt(e00.amount)).to.be.gte(0);

  // no operator here because the event is of type ERC20.Transfer
  expect(e00.fromAddress).to.equal(hotWalletAddress);
  expect(e00.toAddress).to.equal(toAddress);

  expect((await GetUserBalance({ userId: userId })).amountAttoSci).to.equal(
    initialUserBalance.add(amountAttoSci).toString()
  );

  expect((await GetAddressBalance({ userAddress: hotWalletAddress })).amountAttoSci).to.equal(
    initialHotWalletBalance.sub(amountAttoSci).toString()
  );

  await checkTxHash(e00.txHash);
}

async function transferSCIAndCheckEvents(
  fromUserId: number,
  toUserId: number,
  amountAttoSci: string
): Promise<void> {
  let initialFromUserBalance = ethers.BigNumber.from(
    (await GetUserBalance({ userId: fromUserId })).amountAttoSci
  );
  let initialToUserBalance = ethers.BigNumber.from(
    (await GetUserBalance({ userId: toUserId })).amountAttoSci
  );

  let txBlock = (await GetChainInfo({})).lastBlock;
  let r00: Tokens.TransferSCIResponse = await TransferSCI({
    fromId: fromUserId,
    toId: toUserId,
    amountAttoSci: amountAttoSci,
  });
  let e00 = await getOneEvent<Tokens.TransferEvent>(txBlock, GetTransferEvents, r00.txHash);

  let toAddress = (await GetUserInfo({ userId: toUserId })).userAddress;
  let fromAddress = (await GetUserInfo({ userId: fromUserId })).userAddress;

  expect(e00.txHash).to.equal(r00.txHash);
  expect(e00.amount).to.equal(amountAttoSci);
  expect(parseInt(e00.blockNumber)).to.be.gt(parseInt(txBlock));
  expect(e00.fromAddress).to.equal(fromAddress);
  expect(e00.toAddress).to.equal(toAddress);

  expect((await GetUserBalance({ userId: fromUserId })).amountAttoSci).to.equal(
    initialFromUserBalance.sub(amountAttoSci).toString()
  );
  expect((await GetUserBalance({ userId: toUserId })).amountAttoSci).to.equal(
    initialToUserBalance.add(amountAttoSci).toString()
  );
  await checkTxHash(e00.txHash);
}

async function mintNFTAndCheckEvents(
  contentCidV1: string,
  ownerId: number,
  adminId: number,
  beneficiaryId: number
): Promise<string> {
  let txBlock = (await GetChainInfo({})).lastBlock;
  let r00: Tokens.MintNFTResponse = await MintNFT({
    contentCidV1: contentCidV1,
    ownerId: ownerId,
    adminId: adminId,
    beneficiaryId: beneficiaryId,
  });
  let e00 = await getOneEvent<Tokens.NFTUpdatedEvent>(txBlock, GetNFTUpdatedEvents, r00.txHash);
  let e01 = await getOneEvent<Tokens.AdminContentNodeCreatedEvent>(
    txBlock,
    GetAdminContentNodeCreatedEvents,
    r00.txHash
  );
  let e02 = await getOneEvent<Tokens.TransferEvent>(txBlock, GetTransferEvents, r00.txHash);

  // collect some data for deep equality check
  let ownerAddress = (await GetUserInfo({ userId: ownerId })).userAddress;
  let adminAddress = (await GetUserInfo({ userId: adminId })).userAddress;
  let beneficiaryAddress = (await GetUserInfo({ userId: beneficiaryId })).userAddress;

  expect(e00.status).to.equal(`${parseInt('0011', 2)}`); // UNSET_FULL_BENEFIT_FLAG | FULL_BENEFIT_FLAG
  expect(e00.ownerAddress).to.equal(ownerAddress);
  expect(e00.adminAddress).to.equal(adminAddress);
  expect(e00.beneficiaryAddress).to.equal(beneficiaryAddress);
  expect(e00.txHash).to.equal(r00.txHash);

  expect(e01.txHash).to.equal(r00.txHash);
  expect(e01.tokenId).to.equal(e00.tokenId);
  expect(e01.contentCidV1).to.equal(contentCidV1);
  expect(e01.previousCidV1).to.equal(ZERO_CIDv1);

  expect(e02.txHash).to.equal(r00.txHash);
  expect(e02.tokenId).to.equal(e00.tokenId);
  expect(e02.operatorAddress).to.equal(hotWalletAddress);
  expect(e02.fromAddress).to.equal(addressZero);
  expect(e02.toAddress).to.equal((await GetUserInfo({ userId: ownerId })).userAddress);
  expect(e02.amount).to.equal('1');

  await checkTxHash(e00.txHash);
  return e00.tokenId;
}

async function setListingAndCheckEvents(
  tokenId: string,
  ownerId: number,
  endTimeSec: string, // no expiration and constant price when zero
  startPriceAttoSci: string,
  endPriceAttoSci: string // ignored if endTimeSec is zero
): Promise<void> {
  let txBlock = (await GetChainInfo({})).lastBlock;

  let chainTimeSec = (await GetChainInfo({})).blockTimestampSec;
  let r00: Listings.SetListingResponse = await SetListing({
    sellerId: ownerId,
    tokenId: tokenId,
    startTimeSec: chainTimeSec,
    endTimeSec: endTimeSec,
    startPriceAttoSci: startPriceAttoSci,
    endPriceAttoSci: endPriceAttoSci,
  });
  let e00 = await getOneEvent<Listings.ListingUpdatedEvent>(
    txBlock,
    GetListingUpdatedEvents,
    r00.txHash
  );

  let ownerAddress = (await GetUserInfo({ userId: ownerId })).userAddress;
  expect(e00.tokenId).to.equal(tokenId);
  expect(e00.sellerAddress).to.equal(ownerAddress);
  expect(e00.startTimeSec).to.equal(chainTimeSec);
  expect(e00.endTimeSec).to.equal(endTimeSec);
  expect(e00.startPriceAttoSci).to.equal(startPriceAttoSci);
  expect(e00.endPriceAttoSci).to.equal(startPriceAttoSci);
  expect(e00.txHash).to.equal(r00.txHash);
}

async function setOfferAndCheckEvents(
  tokenId: string,
  buyerId: number,
  endTimeSec: string, // no expiration when zero
  priceAttoSci: string
): Promise<void> {
  let txBlock = (await GetChainInfo({})).lastBlock;

  let r00: Offers.SetOfferResponse = await SetOffer({
    tokenId: tokenId,
    buyerId: buyerId,
    endTimeSec: endTimeSec,
    priceAttoSci: priceAttoSci,
  });
  let e00 = await getOneEvent<Offers.OfferUpdatedEvent>(txBlock, GetOfferUpdatedEvents, r00.txHash);

  let buyerAddress = (await GetUserInfo({ userId: buyerId })).userAddress;

  expect(e00.tokenId).to.equal(tokenId);
  expect(e00.buyerAddress).to.equal(buyerAddress);
  expect(e00.endTimeSec).to.equal(endTimeSec);
  expect(e00.priceAttoSci).to.equal(priceAttoSci);
  expect(e00.txHash).to.equal(r00.txHash);
}

type TestCallback = (event: any) => Promise<void>;

function handleStreamEventTest(
  stream: any,
  streamName: string,
  testCallback: TestCallback
): Promise<void> {
  process.stdout.write(`${streamName} stream: waiting for data`);
  let intervalId = setInterval(() => {
    process.stdout.write('.');
  }, 500);

  let timeoutId = setTimeout(() => {
    console.log(`\nUnsubscribing from ${streamName} stream and turning off streaming.`);
    stream.cancel();
    clearInterval(intervalId); // Stop the periodic logs.
  }, 6000);

  return new Promise<void>((resolve, reject) => {
    stream.on('data', async (response) => {
      try {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        console.log(`${streamName} stream: on data`);
        if (response.event) {
          await testCallback(response.event);
          resolve();
        } else {
          reject('Event is undefined');
        }
      } catch (error) {
        reject(error);
      } finally {
        stream.cancel();
      }
    });

    stream.on('error', (error: any) => {
      reject(error);
      stream.cancel();
    });

    stream.on('end', () => {
      console.log(`${streamName} stream: on end`);
    });
  });
}

describe('ScieNFT RPC API', () => {
  it('should recover gas from users', async function () {
    let userId = 4;
    await RecoverUserGas({ userId: userId });
  }).timeout(50000);

  it('should return correct hot wallet information from GetChainInfo', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let r00: Tokens.MintNFTResponse = await MintNFT({
      contentCidV1: ADMIN_CIDv1_1,
      ownerId: ownerId,
      adminId: adminId,
      beneficiaryId: beneficiaryId,
    });

    let r01 = await GetSuperadminInfo({});

    let r02: Tokens.MintNFTResponse = await MintNFT({
      contentCidV1: ADMIN_CIDv1_1,
      ownerId: ownerId,
      adminId: adminId,
      beneficiaryId: beneficiaryId,
    });
    let cost = r02.costAttoGas;
    let r03 = await GetSuperadminInfo({});
    let delta = BigNumber.from(r01.hotWalletBalanceAttoGas).sub(r03.hotWalletBalanceAttoGas);

    expect(delta.toString()).to.equal(cost);
    expect(r03.hotWalletAddress).to.match(/^0x[a-fA-F0-9]{40}$/);
  }).timeout(500000);

  it('should credit and transfer SCI tokens', async function () {
    const firstUserId = randomUser();
    const secondUserId = randomUser();
    await creditUserAndCheckEvents(firstUserId, ONE_SCI);
    let min = 100;
    let max = 1000000000;
    let nanoSCI = Math.floor(Math.random() * (max - min)) + min;
    const amountAttoSci = ethers.BigNumber.from(nanoSCI)
      .mul(ethers.BigNumber.from(10).pow(9))
      .toString();
    await transferSCIAndCheckEvents(firstUserId, secondUserId, amountAttoSci);
  }).timeout(500000);

  it('should mint NFTs', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();
    let tokenId = await mintNFTAndCheckEvents(DATA_CIDv1, ownerId, adminId, beneficiaryId);
    let tokenId2 = await mintNFTAndCheckEvents(DATA_CIDv1, ownerId, adminId, beneficiaryId);
    expect(ethers.BigNumber.from(tokenId).add(1).toString()).to.equal(
      ethers.BigNumber.from(tokenId2).toString()
    );
  }).timeout(500000);

  it('should mint and enhance an NFT', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();
    let txBlock = (await GetChainInfo({})).lastBlock;
    let tokenId = await mintNFTAndCheckEvents(ADMIN_CIDv1_1, ownerId, adminId, beneficiaryId);

    // there shouldn't be any events at this stage
    let toBlock = (await GetChainInfo({})).lastBlock;
    for (const e in GetAdminContentNodeCreatedEvents({ fromBlock: txBlock, toBlock: toBlock })
      .events) {
      console.log(e);
      throw 'uncleared events';
    }
    for (const e in GetOwnerContentNodeCreatedEvents({ fromBlock: txBlock, toBlock: toBlock })
      .events) {
      console.log(e);
      throw 'uncleared events';
    }

    let appendAdmin = async (data, dataName, prevName) => {
      let txBlock = (await GetChainInfo({})).lastBlock;
      let r00: Tokens.EnhanceNFTResponse = await EnhanceNFT({
        tokenId: tokenId,
        newContentCidV1: data,
        contentType: Tokens.ContentType.CONTENT_TYPE_ADMIN,
      });

      let e00 = await getOneEvent<Tokens.AdminContentNodeCreatedEvent>(
        txBlock,
        GetAdminContentNodeCreatedEvents,
        r00.txHash
      );
      expect(e00.tokenId).to.equal(tokenId);
      expect(lookupCIDv1(e00.contentCidV1)).to.equal(dataName);
      expect(lookupCIDv1(e00.previousCidV1)).to.equal(prevName);
      expect(e00.txHash).to.equal(r00.txHash);
    };

    let appendOwner = async (data, dataName, prevName) => {
      let txBlock = (await GetChainInfo({})).lastBlock;

      let req: Tokens.EnhanceNFTRequest = {
        tokenId: tokenId,
        newContentCidV1: data,
        contentType: Tokens.ContentType.CONTENT_TYPE_OWNER,
      };
      let r00: Tokens.EnhanceNFTResponse = await EnhanceNFT(req);

      let e00 = await getOneEvent<Tokens.OwnerContentNodeCreatedEvent>(
        txBlock,
        GetOwnerContentNodeCreatedEvents,
        r00.txHash
      );
      expect(e00.tokenId).to.equal(tokenId);
      expect(lookupCIDv1(e00.contentCidV1)).to.equal(dataName);
      expect(lookupCIDv1(e00.previousCidV1)).to.equal(prevName);
      expect(e00.txHash).to.equal(r00.txHash);
    };

    await appendOwner(OWNER_CIDv1_1, 'OWNER_CIDv1_1', 'ZERO_CIDv1');
    await appendOwner(OWNER_CIDv1_2, 'OWNER_CIDv1_2', 'OWNER_CIDv1_1');
    await appendOwner(OWNER_CIDv1_3, 'OWNER_CIDv1_3', 'OWNER_CIDv1_2');

    await appendAdmin(ADMIN_CIDv1_2, 'ADMIN_CIDv1_2', 'ADMIN_CIDv1_1');
    await appendAdmin(ADMIN_CIDv1_3, 'ADMIN_CIDv1_3', 'ADMIN_CIDv1_2');

    // collect some data for deep equality check
    let ownerAddress = (await GetUserInfo({ userId: ownerId })).userAddress;
    let adminAddress = (await GetUserInfo({ userId: adminId })).userAddress;
    let beneficiaryAddress = (await GetUserInfo({ userId: beneficiaryId })).userAddress;

    // check lists
    let r01: Tokens.GetNFTResponse = await GetNFT({ tokenId: tokenId });
    expect(r01.tokenId).to.equal(tokenId);
    expect(r01.ownerContentCidV1).to.deep.equal([OWNER_CIDv1_1, OWNER_CIDv1_2, OWNER_CIDv1_3]);
    expect(r01.adminContentCidV1).to.deep.equal([ADMIN_CIDv1_1, ADMIN_CIDv1_2, ADMIN_CIDv1_3]);

    r01.ownerCreatedAtSec.forEach((timeSec) => {
      expect(parseInt(timeSec)).to.be.gt(Date.now() / 1000 - 100);
    });
    r01.adminCreatedAtSec.forEach((timeSec) => {
      expect(parseInt(timeSec)).to.be.gt(Date.now() / 1000 - 100);
    });

    expect(r01.status).to.equal(`${parseInt('0011', 2)}`); // UNSET_FULL_BENEFIT_FLAG | FULL_BENEFIT_FLAG
    expect(r01.ownerAddress).to.equal(ownerAddress);
    expect(r01.adminAddress).to.equal(adminAddress);
    expect(r01.beneficiaryAddress).to.equal(beneficiaryAddress);
  }).timeout(500000);

  it('should create and accept an NFT auction', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let ownerAddress = (await GetUserInfo({ userId: ownerId })).userAddress;
    let adminAddress = (await GetUserInfo({ userId: adminId })).userAddress;
    let beneficiaryAddress = (await GetUserInfo({ userId: beneficiaryId })).userAddress;

    let tokenId: string = await mintNFTAndCheckEvents(DATA_CIDv1, ownerId, adminId, beneficiaryId);

    // put it up for sale
    await setListingAndCheckEvents(tokenId, ownerId, '0', '1000', '0'); // constant price, no expiration

    // check that the beneficiary and royalty are as expected
    let listing00 = await GetListing({ tokenId: tokenId });
    expect(listing00.sellerAddress).to.equal(ownerAddress);
    expect(listing00.priceAttoSci).to.equal('1000');
    expect(listing00.beneficiaryAddress).to.equal(beneficiaryAddress);
    expect(listing00.royaltyAttoSci).to.equal('1000');
    expect(listing00.endTimeSec).to.equal('0');
    expect(listing00.endPriceAttoSci).to.equal('1000');

    const buyerId = randomUser();
    let r02 = await GetUserBalance({ userId: buyerId });
    let initialBuyerBalance = r02.amountAttoSci;
    let buyerAddress = r02.userAddress;

    await creditUserAndCheckEvents(buyerId, '1000');

    let txBlock = (await GetChainInfo({})).lastBlock;
    let r04: Listings.AcceptListingResponse = await AcceptListing({
      sellerId: ownerId,
      tokenId: tokenId,
      buyerId: buyerId,
    });
    let e04 = await getOneEvent<Tokens.MarketplaceSaleEvent>(
      txBlock,
      GetMarketplaceSaleEvents,
      r04.txHash
    );

    // this was for debuggging -- there shouldn't be any events at this stage
    let toBlock = (await GetChainInfo({})).lastBlock;
    for (const e in GetMarketplaceSaleEvents({ fromBlock: txBlock, toBlock: toBlock }).events) {
      console.log(e);
    }
    for (const e in GetTransferEvents({ fromBlock: txBlock, toBlock: toBlock }).events) {
      console.log(e);
    }

    expect(e04.tokenId).to.equal(tokenId);
    expect(e04.buyerAddress).to.equal(buyerAddress);
    expect(e04.priceAttoSci).to.equal('1000');
    expect(e04.sellerAddress).to.equal(ownerAddress);
    expect(e04.beneficiaryAddress).to.equal(beneficiaryAddress);
    expect(e04.royaltyAttoSci).to.equal('1000');
    expect(e04.txHash).to.equal(r04.txHash);

    let r05: Tokens.GetUserBalanceResponse = await GetUserBalance({ userId: buyerId });
    expect(r05.amountAttoSci).to.equal(initialBuyerBalance.toString());

    let r06: Listings.GetListingResponse = await GetListing({ tokenId: tokenId });
    expect(r06.sellerAddress).to.equal(ethers.constants.AddressZero);

    let r07: Tokens.GetNFTResponse = await GetNFT({ tokenId: tokenId });
    expect(r07.status).to.equal('0'); // flags are cleared by sale
    expect(r07.ownerAddress).to.equal(buyerAddress);
    expect(r07.adminAddress).to.equal(adminAddress);
    expect(r07.beneficiaryAddress).to.equal(beneficiaryAddress);

    // sell it again
    await setListingAndCheckEvents(tokenId, buyerId, '0', '500', '0'); // constant price, no expiration

    // check that the beneficiary and royalty are as expected
    let listing = await GetListing({ tokenId: tokenId });
    expect(listing.sellerAddress).to.equal(buyerAddress);
    expect(listing.priceAttoSci).to.equal('500');
    expect(listing.beneficiaryAddress).to.equal(beneficiaryAddress);
    expect(listing.royaltyAttoSci).to.equal('99');
    expect(listing.endTimeSec).to.equal('0');
    expect(listing.endPriceAttoSci).to.equal('500');

    const newBuyerId = randomUser();
    await creditUserAndCheckEvents(newBuyerId, '1000');

    let r10: Tokens.GetUserBalanceResponse = await GetUserBalance({ userId: newBuyerId });
    let initialNewBuyerBalance = ethers.BigNumber.from(r10.amountAttoSci);
    let newBuyerAddress = r10.userAddress;

    let r11: Tokens.GetUserBalanceResponse = await GetUserBalance({ userId: beneficiaryId });
    let initialBeneficiaryBalance = ethers.BigNumber.from(r11.amountAttoSci);

    txBlock = (await GetChainInfo({})).lastBlock;
    let r12: Listings.AcceptListingResponse = await AcceptListing({
      sellerId: buyerId,
      tokenId: tokenId,
      buyerId: newBuyerId,
    });
    let e12 = await getOneEvent<Tokens.MarketplaceSaleEvent>(
      txBlock,
      GetMarketplaceSaleEvents,
      r12.txHash
    );

    expect(e12.tokenId).to.equal(tokenId);
    expect(e12.buyerAddress).to.equal(newBuyerAddress);
    expect(e12.priceAttoSci).to.equal('500');
    expect(e12.sellerAddress).to.equal(buyerAddress);
    expect(e12.beneficiaryAddress).to.equal(beneficiaryAddress);
    expect(e12.royaltyAttoSci).to.equal('99');
    expect(e12.txHash).to.equal(r12.txHash);

    let r13: Tokens.GetUserBalanceResponse = await GetUserBalance({ userId: newBuyerId });
    expect(r13.amountAttoSci).to.equal(initialNewBuyerBalance.sub('500').toString());

    let r14: Tokens.GetUserBalanceResponse = await GetUserBalance({ userId: beneficiaryId });
    expect(r14.amountAttoSci).to.equal(initialBeneficiaryBalance.add('99').toString());

    let r15: Listings.GetListingResponse = await GetListing({ tokenId: tokenId });
    expect(r15.sellerAddress).to.equal(ethers.constants.AddressZero);

    let r16 = await GetNFT({ tokenId: tokenId });
    expect(r16.status).to.equal('0'); // flags are cleared by sale
    expect(r16.ownerAddress).to.equal(newBuyerAddress);
    expect(r16.adminAddress).to.equal(adminAddress);
    expect(r16.beneficiaryAddress).to.equal(beneficiaryAddress);
  }).timeout(500000);

  it('should create and cancel an NFT auction', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();
    let tokenId: string = await mintNFTAndCheckEvents(DATA_CIDv1, ownerId, adminId, beneficiaryId);

    // put it up for sale
    await setListingAndCheckEvents(tokenId, ownerId, '0', '1000', '0'); // constant price, no expiration

    // cancel the listing
    let txBlock = (await GetChainInfo({})).lastBlock;
    let r00 = await CancelListing({
      sellerId: ownerId,
      tokenId: tokenId,
    });
    let e03 = await getOneEvent<Listings.ListingUpdatedEvent>(
      txBlock,
      GetListingUpdatedEvents,
      r00.txHash
    );

    let nft = await GetListing({ tokenId: e03.tokenId });
    expect(nft.sellerAddress).to.equal(ethers.constants.AddressZero);
  }).timeout(500000);

  it('should create and accept a buyer offer', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let r01 = await GetUserBalance({ userId: ownerId });
    let initialOwnerBalance = ethers.BigNumber.from(r01.amountAttoSci);
    let ownerAddress = r01.userAddress;

    let r06 = await GetUserBalance({ userId: beneficiaryId });
    let initialBeneficiaryBalance = ethers.BigNumber.from(r06.amountAttoSci);
    let beneficiaryAddress = r06.userAddress;

    let adminAddress = (await GetUserInfo({ userId: adminId })).userAddress;

    let tokenId: string = await mintNFTAndCheckEvents(DATA_CIDv1, ownerId, adminId, beneficiaryId);

    const buyerId = randomUser();
    await creditUserAndCheckEvents(buyerId, '1000');

    let r07 = await GetUserBalance({ userId: buyerId });
    expect(r07.amountAttoSci).to.equal('1000');
    let initialBuyerBalance = ethers.BigNumber.from(r07.amountAttoSci);
    let buyerAddress = r07.userAddress;

    // create the buyer offer (no expiration)
    await setOfferAndCheckEvents(tokenId, buyerId, '0', '500');

    // check beneficiary and royalty
    let offer = await GetOffer({ tokenId: tokenId, buyerId: buyerId });
    expect(offer.buyerAddress).to.equal(buyerAddress);
    expect(offer.priceAttoSci).to.equal('500');
    expect(offer.sellerAddress).to.equal(ownerAddress);
    expect(offer.beneficiaryAddress).to.equal(beneficiaryAddress);
    expect(offer.royaltyAttoSci).to.equal('500');
    expect(offer.endTimeSec).to.equal('0');

    let txBlock = (await GetChainInfo({})).lastBlock;
    let r00 = await AcceptOffer({
      sellerId: ownerId,
      tokenId: tokenId,
      buyerId: buyerId,
      priceAttoSci: '500',
    });
    let e04 = await getOneEvent<Tokens.MarketplaceSaleEvent>(
      txBlock,
      GetMarketplaceSaleEvents,
      r00.txHash
    );

    expect(e04.tokenId).to.equal(tokenId);
    expect(e04.buyerAddress).to.equal(buyerAddress);
    expect(e04.priceAttoSci).to.equal('500');
    expect(e04.sellerAddress).to.equal(ownerAddress);
    expect(e04.beneficiaryAddress).to.equal(beneficiaryAddress);
    expect(e04.royaltyAttoSci).to.equal('500');

    let r03 = await GetUserBalance({ userId: buyerId });
    expect(r03.amountAttoSci).to.equal(initialBuyerBalance.sub(e04.priceAttoSci).toString());

    let r08 = await GetUserBalance({ userId: ownerId });
    expect(r08.amountAttoSci).to.equal(
      initialOwnerBalance.add(e04.priceAttoSci).sub(e04.royaltyAttoSci).toString()
    );

    let r11 = await GetUserBalance({ userId: beneficiaryId });
    expect(r11.amountAttoSci).to.equal(
      initialBeneficiaryBalance.add(e04.royaltyAttoSci).toString()
    );

    let r04 = await GetOffer({ tokenId: tokenId, buyerId: buyerId });
    expect(r04.buyerAddress).to.equal(ethers.constants.AddressZero);

    let r05 = await GetNFT({ tokenId: tokenId });
    expect(r05.status).to.equal('0'); // flags are cleared by sale
    expect(r05.ownerAddress).to.equal(buyerAddress);
    expect(r05.adminAddress).to.equal(adminAddress);
    expect(r05.beneficiaryAddress).to.equal(beneficiaryAddress);
  }).timeout(500000);

  it('should create and cancel a buyer offer', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let r01 = await GetUserBalance({ userId: ownerId });
    let ownerAddress = r01.userAddress;

    let r06 = await GetUserBalance({ userId: beneficiaryId });
    let beneficiaryAddress = r06.userAddress;

    let tokenId: string = await mintNFTAndCheckEvents(DATA_CIDv1, ownerId, adminId, beneficiaryId);

    const buyerId = randomUser();
    await creditUserAndCheckEvents(buyerId, '1000');

    let r07 = await GetUserBalance({ userId: buyerId });
    let initialBuyerBalance = ethers.BigNumber.from(r07.amountAttoSci);
    let buyerAddress = r07.userAddress;

    // create the buyer offer (no expiration)
    let chainTime = (await GetChainInfo({})).blockTimestampSec;
    await setOfferAndCheckEvents(tokenId, buyerId, `${chainTime + 10000}`, '500');

    let offer = await GetOffer({ tokenId: tokenId, buyerId: buyerId });
    expect(offer.buyerAddress).to.equal(buyerAddress);
    expect(offer.priceAttoSci).to.equal('500');
    expect(offer.sellerAddress).to.equal(ownerAddress);
    expect(offer.beneficiaryAddress).to.equal(beneficiaryAddress);
    expect(offer.royaltyAttoSci).to.equal('500');
    expect(offer.endTimeSec).to.equal(`${chainTime + 10000}`);

    // cancel the Offer
    let txBlock = (await GetChainInfo({})).lastBlock;
    let r00 = await CancelOffer({
      tokenId: tokenId,
      buyerId: buyerId,
    });
    let e04 = await getOneEvent<Offers.OfferUpdatedEvent>(
      txBlock,
      GetOfferUpdatedEvents,
      r00.txHash
    );
    expect(e04.buyerAddress).to.equal(ethers.constants.AddressZero);
    expect(e04.tokenId).to.equal(tokenId);

    let offer2 = await GetOffer({ tokenId: tokenId, buyerId: buyerId });
    expect(offer2.buyerAddress).to.equal(ethers.constants.AddressZero);
  }).timeout(500000);

  it('should read from OfferUpdatedEvent stream', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let tokenId: string = await mintNFTAndCheckEvents(DATA_CIDv1, ownerId, adminId, beneficiaryId);

    const buyerId = randomUser();
    let buyerAddress = (await GetUserInfo({ userId: buyerId })).userAddress;
    await creditUserAndCheckEvents(buyerId, '1000');

    let endTimeSec = '0';
    let priceAttoSci = '500';
    let stream = StreamOfferUpdatedEvents({});

    let r00: Offers.SetOfferResponse = await SetOffer({
      tokenId: tokenId,
      buyerId: buyerId,
      endTimeSec: endTimeSec,
      priceAttoSci: priceAttoSci,
    });

    // Now we await the promise. The test won't pass until the promise resolves.
    await handleStreamEventTest(stream, 'OfferUpdatedEvent', async (event: any) => {
      expect(event.tokenId).to.equal(tokenId);
      expect(event.buyerAddress).to.equal(buyerAddress);
      expect(event.endTimeSec).to.equal(endTimeSec);
      expect(event.priceAttoSci).to.equal(priceAttoSci);
      expect(event.txHash).to.equal(r00.txHash);
    });
  }).timeout(500000);

  it('should read from NFTUpdatedEvent stream', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let ownerAddress = (await GetUserInfo({ userId: ownerId })).userAddress;
    let adminAddress = (await GetUserInfo({ userId: adminId })).userAddress;
    let beneficiaryAddress = (await GetUserInfo({ userId: beneficiaryId })).userAddress;

    let stream = StreamNFTUpdatedEvents({});

    // take an action that will emit an NFTUpdated event to the stream
    let r00: Tokens.MintNFTResponse = await MintNFT({
      contentCidV1: ADMIN_CIDv1_1,
      ownerId: ownerId,
      adminId: adminId,
      beneficiaryId: beneficiaryId,
    });

    await handleStreamEventTest(stream, 'NFTUpdatedEvent', async (event: any) => {
      expect(event.status).to.equal(`${parseInt('0011', 2)}`); // UNSET_FULL_BENEFIT_FLAG | FULL_BENEFIT_FLAG
      expect(event.ownerAddress).to.equal(ownerAddress);
      expect(event.adminAddress).to.equal(adminAddress);
      expect(event.beneficiaryAddress).to.equal(beneficiaryAddress);
      expect(event.txHash).to.equal(r00.txHash);
    });
  }).timeout(500000);

  it('should read from AdminContentNodeCreatedEvent stream', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let stream = StreamAdminContentNodeCreatedEvents({});

    // take an action that will emit an AdminContentNodeCreated event to the stream

    let txBlock = (await GetChainInfo({})).lastBlock;
    let r00: Tokens.MintNFTResponse = await MintNFT({
      contentCidV1: ADMIN_CIDv1_1,
      ownerId: ownerId,
      adminId: adminId,
      beneficiaryId: beneficiaryId,
    });
    let e00 = await getOneEvent<Tokens.NFTUpdatedEvent>(txBlock, GetNFTUpdatedEvents, r00.txHash);

    // Now we await the promise. The test won't pass until the promise resolves.
    await handleStreamEventTest(stream, 'AdminContentNodeCreatedEvent', async (event: any) => {
      expect(event.tokenId).to.equal(e00.tokenId);
      expect(parseInt(event.blockNumber)).to.gte(parseInt(e00.blockNumber));
      expect(event.contentCidV1).to.equal(ADMIN_CIDv1_1);
      expect(event.previousCidV1).to.equal(ZERO_CIDv1);
      expect(event.txHash).to.equal(r00.txHash);
    });
  }).timeout(500000);

  it('should read from OwnerContentNodeCreatedEvent stream', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let stream = StreamOwnerContentNodeCreatedEvents({});

    // Take an action that emits an OwnerContentNodeCreated event
    let tokenId = await mintNFTAndCheckEvents(ADMIN_CIDv1_1, ownerId, adminId, beneficiaryId);

    let appendOwner = async (
      data: string,
      dataName: string,
      prevName: string
    ): Promise<Tokens.EnhanceNFTResponse> => {
      let txBlock = (await GetChainInfo({})).lastBlock;

      let req: Tokens.EnhanceNFTRequest = {
        tokenId: tokenId,
        newContentCidV1: data,
        contentType: Tokens.ContentType.CONTENT_TYPE_OWNER,
      };
      let r00: Tokens.EnhanceNFTResponse = await EnhanceNFT(req);

      let e00 = await getOneEvent<Tokens.OwnerContentNodeCreatedEvent>(
        txBlock,
        GetOwnerContentNodeCreatedEvents,
        r00.txHash
      );
      expect(e00.tokenId).to.equal(tokenId);
      expect(lookupCIDv1(e00.contentCidV1)).to.equal(dataName);
      expect(lookupCIDv1(e00.previousCidV1)).to.equal(prevName);
      expect(e00.txHash).to.equal(r00.txHash);
      return r00;
    };

    let r00: Tokens.EnhanceNFTResponse = await appendOwner(
      OWNER_CIDv1_1,
      'OWNER_CIDv1_1',
      'ZERO_CIDv1'
    );

    // Now we await the promise. The test won't pass until the promise resolves.
    await handleStreamEventTest(stream, 'OwnerContentNodeCreatedEvent', async (event: any) => {
      expect(event.tokenId).to.equal(tokenId);
      expect(event.contentCidV1).to.equal(OWNER_CIDv1_1);
      expect(event.previousCidV1).to.equal(ZERO_CIDv1);
      expect(event.txHash).to.equal(r00.txHash);
    });
  }).timeout(500000);

  it('should read from MarketplaceSaleEvent stream', async function () {
    const buyerId = randomUser();
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let buyerAddress = (await GetUserInfo({ userId: buyerId })).userAddress;
    let ownerAddress = (await GetUserInfo({ userId: ownerId })).userAddress;
    let beneficiaryAddress = (await GetUserInfo({ userId: beneficiaryId })).userAddress;

    let stream = StreamMarketplaceSaleEvents({});

    // take an action that will emit a MarketplacesaleEvent to the stream

    // make an NFT
    let tokenId: string = await mintNFTAndCheckEvents(DATA_CIDv1, ownerId, adminId, beneficiaryId);

    // create a buyer offer
    await creditUserAndCheckEvents(buyerId, '1000');
    await setOfferAndCheckEvents(tokenId, buyerId, '0', '500');

    // accept the offer to emit the event of interest
    let r00: Offers.AcceptOfferResponse = await AcceptOffer({
      sellerId: ownerId,
      tokenId: tokenId,
      buyerId: buyerId,
      priceAttoSci: '500',
    });

    // Now we await the promise. The test won't pass until the promise resolves.
    await handleStreamEventTest(stream, 'MarketplacesaleEvent', async (event: any) => {
      expect(event.tokenId).to.equal(tokenId);
      expect(event.txHash).to.equal(r00.txHash);
      expect(event.buyerAddress).to.equal(buyerAddress);
      expect(event.priceAttoSci).to.equal('500');
      expect(event.sellerAddress).to.equal(ownerAddress);
      expect(event.beneficiaryAddress).to.equal(beneficiaryAddress);
      expect(event.royaltyAttoSci).to.equal('500');
    });
  }).timeout(500000);

  it('should read from ListingUpdatedEvent stream', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let ownerAddress = (await GetUserInfo({ userId: ownerId })).userAddress;
    let chainTimeSec: BigNumber = BigNumber.from((await GetChainInfo({})).blockTimestampSec);
    let endTimeSec = chainTimeSec.add(10000);
    let startPriceAttoSci = BigNumber.from(1000);
    let targetEndPriceAttoSci = BigNumber.from(200); // precision issues here!

    let stream = StreamListingUpdatedEvents({});

    // take an action that will emit a ListingUpdatedEvent to the stream

    // make an NFT
    let tokenId: string = await mintNFTAndCheckEvents(DATA_CIDv1, ownerId, adminId, beneficiaryId);

    // list it for sale
    let r00: Listings.SetListingResponse = await SetListing({
      sellerId: ownerId,
      tokenId: tokenId,
      startTimeSec: chainTimeSec,
      endTimeSec: endTimeSec,
      startPriceAttoSci: startPriceAttoSci,
      endPriceAttoSci: targetEndPriceAttoSci,
    });

    // Now we await the promise. The test won't pass until the promise resolves.
    await handleStreamEventTest(stream, 'ListingUpdatedEvent', async (event: any) => {
      expect(event.tokenId).to.equal(tokenId);
      expect(event.sellerAddress).to.equal(ownerAddress);
      expect(event.startTimeSec).to.equal(chainTimeSec.toString());
      expect(event.endTimeSec).to.equal(endTimeSec.toString());
      expect(event.startPriceAttoSci).to.equal(startPriceAttoSci.toString());
      if (endTimeSec.eq(0)) {
        expect(event.endPriceAttoSci).to.equal(startPriceAttoSci.toString());
      } else {
        // we should be within +/- 1 of the target
        expect(BigNumber.from(event.endPriceAttoSci).toNumber()).to.be.lte(
          targetEndPriceAttoSci.add(1).toNumber()
        );
        expect(BigNumber.from(event.endPriceAttoSci).toNumber()).to.be.gte(
          targetEndPriceAttoSci.sub(1).toNumber()
        );
      }

      expect(event.txHash).to.equal(r00.txHash);
    });
  }).timeout(500000);

  it('should read from TransferEvent stream', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let stream = StreamTransferEvents({});

    // take an action that will emit a TransferEvent to the stream
    let txBlock = (await GetChainInfo({})).lastBlock;
    let r00: Tokens.MintNFTResponse = await MintNFT({
      contentCidV1: ADMIN_CIDv1_1,
      ownerId: ownerId,
      adminId: adminId,
      beneficiaryId: beneficiaryId,
    });
    let e00 = await getOneEvent<Tokens.NFTUpdatedEvent>(txBlock, GetNFTUpdatedEvents, r00.txHash);

    // Now we await the promise. The test won't pass until the promise resolves.
    await handleStreamEventTest(stream, 'TransferEvent', async (event: any) => {
      expect(event.txHash).to.equal(r00.txHash);
      expect(event.tokenId).to.equal(e00.tokenId);
      expect(event.operatorAddress).to.equal(hotWalletAddress);
      expect(event.fromAddress).to.equal(addressZero);
      expect(event.toAddress).to.equal((await GetUserInfo({ userId: ownerId })).userAddress);
      expect(event.amount).to.equal('1');
    });
  }).timeout(500000);

  it('should get an NFTUpdatedEvent using a transaction hash', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let ownerAddress = (await GetUserInfo({ userId: ownerId })).userAddress;
    let adminAddress = (await GetUserInfo({ userId: adminId })).userAddress;
    let beneficiaryAddress = (await GetUserInfo({ userId: beneficiaryId })).userAddress;

    // take an action that will emit an NFTUpdated event to the stream
    let r00: Tokens.MintNFTResponse = await MintNFT({
      contentCidV1: ADMIN_CIDv1_1,
      ownerId: ownerId,
      adminId: adminId,
      beneficiaryId: beneficiaryId,
    });

    // get the event using the transaction hash
    let hash: string = r00.txHash;
    let response = await GetNFTUpdatedEventsFromTxHash({ txHash: hash });
    let event = response.events[0];

    expect(event.status).to.equal(`${parseInt('0011', 2)}`); // UNSET_FULL_BENEFIT_FLAG | FULL_BENEFIT_FLAG
    expect(event.ownerAddress).to.equal(ownerAddress);
    expect(event.adminAddress).to.equal(adminAddress);
    expect(event.beneficiaryAddress).to.equal(beneficiaryAddress);
    expect(event.txHash).to.equal(r00.txHash);
  }).timeout(500000);

  it('should get an OfferUpdatedEvent using a transaction hash', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let tokenId: string = await mintNFTAndCheckEvents(DATA_CIDv1, ownerId, adminId, beneficiaryId);

    const buyerId = randomUser();
    let buyerAddress = (await GetUserInfo({ userId: buyerId })).userAddress;
    await creditUserAndCheckEvents(buyerId, '1000');

    let endTimeSec = '0';
    let priceAttoSci = '500';

    let r00: Offers.SetOfferResponse = await SetOffer({
      tokenId: tokenId,
      buyerId: buyerId,
      endTimeSec: endTimeSec,
      priceAttoSci: priceAttoSci,
    });

    // get the event using the transaction hash
    let hash: string = r00.txHash;
    let response = await GetOfferUpdatedEventsFromTxHash({ txHash: hash });
    let event = response.events[0];

    expect(event.tokenId).to.equal(tokenId);
    expect(event.buyerAddress).to.equal(buyerAddress);
    expect(event.endTimeSec).to.equal(endTimeSec);
    expect(event.priceAttoSci).to.equal(priceAttoSci);
    expect(event.txHash).to.equal(r00.txHash);
  }).timeout(500000);

  it('should get an AdminContentNodeCreatedEvent using a transaction hash', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    // take an action that will emit an AdminContentNodeCreated event to the stream

    let txBlock = (await GetChainInfo({})).lastBlock;
    let r00: Tokens.MintNFTResponse = await MintNFT({
      contentCidV1: ADMIN_CIDv1_1,
      ownerId: ownerId,
      adminId: adminId,
      beneficiaryId: beneficiaryId,
    });
    let e00 = await getOneEvent<Tokens.NFTUpdatedEvent>(txBlock, GetNFTUpdatedEvents, r00.txHash);

    // get the event using the transaction hash
    let hash: string = r00.txHash;
    let response = await GetAdminContentNodeCreatedEventsFromTxHash({ txHash: hash });
    let event = response.events[0];

    expect(event.tokenId).to.equal(e00.tokenId);
    expect(parseInt(event.blockNumber)).to.gte(parseInt(e00.blockNumber));
    expect(event.contentCidV1).to.equal(ADMIN_CIDv1_1);
    expect(event.previousCidV1).to.equal(ZERO_CIDv1);
    expect(event.txHash).to.equal(r00.txHash);
  }).timeout(500000);

  it('should get an OwnerContentNodeCreatedEvent using a transaction hash', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    // Take an action that emits an OwnerContentNodeCreated event
    let tokenId = await mintNFTAndCheckEvents(ADMIN_CIDv1_1, ownerId, adminId, beneficiaryId);

    let appendOwner = async (
      data: string,
      dataName: string,
      prevName: string
    ): Promise<Tokens.EnhanceNFTResponse> => {
      let txBlock = (await GetChainInfo({})).lastBlock;

      let req: Tokens.EnhanceNFTRequest = {
        tokenId: tokenId,
        newContentCidV1: data,
        contentType: Tokens.ContentType.CONTENT_TYPE_OWNER,
      };
      let r00: Tokens.EnhanceNFTResponse = await EnhanceNFT(req);

      let e00 = await getOneEvent<Tokens.OwnerContentNodeCreatedEvent>(
        txBlock,
        GetOwnerContentNodeCreatedEvents,
        r00.txHash
      );
      expect(e00.tokenId).to.equal(tokenId);
      expect(lookupCIDv1(e00.contentCidV1)).to.equal(dataName);
      expect(lookupCIDv1(e00.previousCidV1)).to.equal(prevName);
      expect(e00.txHash).to.equal(r00.txHash);
      return r00;
    };

    let r00: Tokens.EnhanceNFTResponse = await appendOwner(
      OWNER_CIDv1_1,
      'OWNER_CIDv1_1',
      'ZERO_CIDv1'
    );

    // get the event using the transaction hash
    let hash: string = r00.txHash;
    let response = await GetOwnerContentNodeCreatedEventsFromTxHash({ txHash: hash });
    let event = response.events[0];

    expect(event.tokenId).to.equal(tokenId);
    expect(event.contentCidV1).to.equal(OWNER_CIDv1_1);
    expect(event.previousCidV1).to.equal(ZERO_CIDv1);
    expect(event.txHash).to.equal(r00.txHash);
  }).timeout(500000);

  it('should get an MarketplaceSaleEvent using a transaction hash', async function () {
    const buyerId = randomUser();
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let buyerAddress = (await GetUserInfo({ userId: buyerId })).userAddress;
    let ownerAddress = (await GetUserInfo({ userId: ownerId })).userAddress;
    let beneficiaryAddress = (await GetUserInfo({ userId: beneficiaryId })).userAddress;

    // take an action that will emit a MarketplacesaleEvent to the stream

    // make an NFT
    let tokenId: string = await mintNFTAndCheckEvents(DATA_CIDv1, ownerId, adminId, beneficiaryId);

    // create a buyer offer
    await creditUserAndCheckEvents(buyerId, '1000');
    await setOfferAndCheckEvents(tokenId, buyerId, '0', '500');

    // accept the offer to emit the event of interest
    let r00: Offers.AcceptOfferResponse = await AcceptOffer({
      sellerId: ownerId,
      tokenId: tokenId,
      buyerId: buyerId,
      priceAttoSci: '500',
    });

    // get the event using the transaction hash
    let hash: string = r00.txHash;
    let response = await GetMarketplaceSaleEventsFromTxHash({ txHash: hash });
    let event = response.events[0];

    expect(event.tokenId).to.equal(tokenId);
    expect(event.txHash).to.equal(r00.txHash);
    expect(event.buyerAddress).to.equal(buyerAddress);
    expect(event.priceAttoSci).to.equal('500');
    expect(event.sellerAddress).to.equal(ownerAddress);
    expect(event.beneficiaryAddress).to.equal(beneficiaryAddress);
    expect(event.royaltyAttoSci).to.equal('500');
  }).timeout(500000);

  it('should get an ListingUpdatedEvent using a transaction hash', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    let ownerAddress = (await GetUserInfo({ userId: ownerId })).userAddress;
    let chainTimeSec: BigNumber = BigNumber.from((await GetChainInfo({})).blockTimestampSec);
    let endTimeSec = chainTimeSec.add(10000);
    let startPriceAttoSci = BigNumber.from(1000);
    let targetEndPriceAttoSci = BigNumber.from(200); // precision issues here!

    // take an action that will emit a ListingUpdatedEvent to the stream

    // make an NFT
    let tokenId: string = await mintNFTAndCheckEvents(DATA_CIDv1, ownerId, adminId, beneficiaryId);

    // list it for sale
    let r00: Listings.SetListingResponse = await SetListing({
      sellerId: ownerId,
      tokenId: tokenId,
      startTimeSec: chainTimeSec,
      endTimeSec: endTimeSec,
      startPriceAttoSci: startPriceAttoSci,
      endPriceAttoSci: targetEndPriceAttoSci,
    });
    // get the event using the transaction hash
    let hash: string = r00.txHash;
    let response = await GetListingUpdatedEventsFromTxHash({ txHash: hash });
    let event = response.events[0];

    expect(event.tokenId).to.equal(tokenId);
    expect(event.sellerAddress).to.equal(ownerAddress);
    expect(event.startTimeSec).to.equal(chainTimeSec.toString());
    expect(event.endTimeSec).to.equal(endTimeSec.toString());
    expect(event.startPriceAttoSci).to.equal(startPriceAttoSci.toString());
    if (endTimeSec.eq(0)) {
      expect(event.endPriceAttoSci).to.equal(startPriceAttoSci.toString());
    } else {
      // we should be within +/- 1 of the target
      expect(BigNumber.from(event.endPriceAttoSci).toNumber()).to.be.lte(
        targetEndPriceAttoSci.add(1).toNumber()
      );
      expect(BigNumber.from(event.endPriceAttoSci).toNumber()).to.be.gte(
        targetEndPriceAttoSci.sub(1).toNumber()
      );
    }

    expect(event.txHash).to.equal(r00.txHash);
  }).timeout(500000);

  it('should get an TransferEvent using a transaction hash', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    // take an action that will emit a TransferEvent to the stream
    let txBlock = (await GetChainInfo({})).lastBlock;
    let r00: Tokens.MintNFTResponse = await MintNFT({
      contentCidV1: ADMIN_CIDv1_1,
      ownerId: ownerId,
      adminId: adminId,
      beneficiaryId: beneficiaryId,
    });
    let e00 = await getOneEvent<Tokens.NFTUpdatedEvent>(txBlock, GetNFTUpdatedEvents, r00.txHash);

    // get the event using the transaction hash
    let hash: string = r00.txHash;
    let response = await GetTransferEventsFromTxHash({ txHash: hash });
    let event = response.events[0];

    expect(event.txHash).to.equal(r00.txHash);
    expect(event.tokenId).to.equal(e00.tokenId);
    expect(event.operatorAddress).to.equal(hotWalletAddress);
    expect(event.fromAddress).to.equal(addressZero);
    expect(event.toAddress).to.equal((await GetUserInfo({ userId: ownerId })).userAddress);
    expect(event.amount).to.equal('1');
  }).timeout(500000);

  it('should mint an NFT and collect three events using the transaction hash', async function () {
    const ownerId = randomUser();
    const adminId = randomUser();
    const beneficiaryId = randomUser();

    // take an action that will emit an AdminContentNodeCreated event to the stream

    let txBlock = (await GetChainInfo({})).lastBlock;
    let r00: Tokens.MintNFTResponse = await MintNFT({
      contentCidV1: ADMIN_CIDv1_1,
      ownerId: ownerId,
      adminId: adminId,
      beneficiaryId: beneficiaryId,
    });
    let e00 = await getOneEvent<Tokens.NFTUpdatedEvent>(txBlock, GetNFTUpdatedEvents, r00.txHash);

    // get the event using the transaction hash
    let hash: string = r00.txHash;
    let response = await GetAdminContentNodeCreatedEventsFromTxHash({ txHash: hash });
    let event = response.events[0];

    expect(event.tokenId).to.equal(e00.tokenId);
    expect(parseInt(event.blockNumber)).to.gte(parseInt(e00.blockNumber));
    expect(event.contentCidV1).to.equal(ADMIN_CIDv1_1);
    expect(event.previousCidV1).to.equal(ZERO_CIDv1);
    expect(event.txHash).to.equal(r00.txHash);

    // get the event using the transaction hash

    response = await GetAdminContentNodeCreatedEventsFromTxHash({ txHash: hash });
    event = response.events[0];

    expect(event.tokenId).to.equal(e00.tokenId);
    expect(parseInt(event.blockNumber)).to.gte(parseInt(e00.blockNumber));
    expect(event.contentCidV1).to.equal(ADMIN_CIDv1_1);
    expect(event.previousCidV1).to.equal(ZERO_CIDv1);
    expect(event.txHash).to.equal(r00.txHash);

    // get the event using the transaction hash

    response = await GetTransferEventsFromTxHash({ txHash: hash });
    event = response.events[0];

    expect(event.txHash).to.equal(r00.txHash);
    expect(event.tokenId).to.equal(e00.tokenId);
    expect(event.operatorAddress).to.equal(hotWalletAddress);
    expect(event.fromAddress).to.equal(addressZero);
    expect(event.toAddress).to.equal((await GetUserInfo({ userId: ownerId })).userAddress);
    expect(event.amount).to.equal('1');
  }).timeout(500000);
});
