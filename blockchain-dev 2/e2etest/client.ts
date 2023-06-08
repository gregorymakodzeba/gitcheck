#!/usr/bin/env node
import { promisify } from 'util';
import { join } from 'path';

const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const listingsProtoPath = join(__dirname, '../src/listings/v1/listings.proto');
const offersProtoPath = join(__dirname, '../src/offers/v1/offers.proto');
const tokensProtoPath = join(__dirname, '../src/tokens/v1/tokens.proto');
const blockchainProtoPath = join(__dirname, '../src/blockchain/v1/blockchain.proto');

const loadProto = (filePath) => {
  const packageDefinition = protoLoader.loadSync(filePath, {
    keepCase: false, // change to camelCase
    longs: String,
    enums: Number,
    defaults: true,
    oneofs: true,
  });

  return grpc.loadPackageDefinition(packageDefinition);
};

// Load all the proto files as before
const listingsProto = loadProto(listingsProtoPath).listings.v1;
const offersProto = loadProto(offersProtoPath).offers.v1;
const tokensProto = loadProto(tokensProtoPath).tokens.v1;
const blockchainProto = loadProto(blockchainProtoPath).blockchain.v1;

export const BlockchainClient = new blockchainProto.BlockchainService(
  `${process.env.RPC_HOST}:${process.env.RPC_PORT}`,
  grpc.credentials.createInsecure()
);

export const ListingsClient = new listingsProto.ListingsService(
  `${process.env.RPC_HOST}:${process.env.RPC_PORT}`,
  grpc.credentials.createInsecure()
);

export const OffersClient = new offersProto.OffersService(
  `${process.env.RPC_HOST}:${process.env.RPC_PORT}`,
  grpc.credentials.createInsecure()
);

export const TokensClient = new tokensProto.TokensService(
  `${process.env.RPC_HOST}:${process.env.RPC_PORT}`,
  grpc.credentials.createInsecure()
);

// Tokens service
export const GetAddressBalance = promisify(TokensClient.GetAddressBalance).bind(TokensClient);
export const GetUserBalance = promisify(TokensClient.GetUserBalance).bind(TokensClient);
export const CreditUser = promisify(TokensClient.CreditUser).bind(TokensClient);
export const TransferSCI = promisify(TokensClient.TransferSCI).bind(TokensClient);
export const MintNFT = promisify(TokensClient.MintNFT).bind(TokensClient);
export const EnhanceNFT = promisify(TokensClient.EnhanceNFT).bind(TokensClient);
export const GetNFT = promisify(TokensClient.GetNFT).bind(TokensClient);

// block range versions
export const GetNFTUpdatedEvents = promisify(TokensClient.GetNFTUpdatedEvents).bind(TokensClient);
export const GetAdminContentNodeCreatedEvents = promisify(
  TokensClient.GetAdminContentNodeCreatedEvents
).bind(TokensClient);
export const GetOwnerContentNodeCreatedEvents = promisify(
  TokensClient.GetOwnerContentNodeCreatedEvents
).bind(TokensClient);
export const GetTransferEvents = promisify(TokensClient.GetTransferEvents).bind(TokensClient);
export const GetMarketplaceSaleEvents = promisify(TokensClient.GetMarketplaceSaleEvents).bind(
  TokensClient
);

// streaming versions
export const StreamNFTUpdatedEvents = TokensClient.StreamNFTUpdatedEvents.bind(TokensClient);
export const StreamAdminContentNodeCreatedEvents =
  TokensClient.StreamAdminContentNodeCreatedEvents.bind(TokensClient);
export const StreamOwnerContentNodeCreatedEvents =
  TokensClient.StreamOwnerContentNodeCreatedEvents.bind(TokensClient);
export const StreamTransferEvents = TokensClient.StreamTransferEvents.bind(TokensClient);
export const StreamMarketplaceSaleEvents =
  TokensClient.StreamMarketplaceSaleEvents.bind(TokensClient);

// tx hash versions
export const GetNFTUpdatedEventsFromTxHash = promisify(
  TokensClient.GetNFTUpdatedEventsFromTxHash.bind(TokensClient)
);
export const GetAdminContentNodeCreatedEventsFromTxHash = promisify(
  TokensClient.GetAdminContentNodeCreatedEventsFromTxHash.bind(TokensClient)
);
export const GetOwnerContentNodeCreatedEventsFromTxHash = promisify(
  TokensClient.GetOwnerContentNodeCreatedEventsFromTxHash.bind(TokensClient)
);
export const GetTransferEventsFromTxHash = promisify(
  TokensClient.GetTransferEventsFromTxHash.bind(TokensClient)
);
export const GetMarketplaceSaleEventsFromTxHash = promisify(
  TokensClient.GetMarketplaceSaleEventsFromTxHash.bind(TokensClient)
);

// Offers service
export const GetOffer = promisify(OffersClient.GetOffer).bind(OffersClient);
export const SetOffer = promisify(OffersClient.SetOffer).bind(OffersClient);
export const CancelOffer = promisify(OffersClient.CancelOffer).bind(OffersClient);
export const AcceptOffer = promisify(OffersClient.AcceptOffer).bind(OffersClient);
export const GetOfferUpdatedEvents = promisify(OffersClient.GetOfferUpdatedEvents).bind(
  OffersClient
);
export const StreamOfferUpdatedEvents = OffersClient.StreamOfferUpdatedEvents.bind(OffersClient);
export const GetOfferUpdatedEventsFromTxHash = promisify(
  OffersClient.GetOfferUpdatedEventsFromTxHash.bind(OffersClient)
);

// Listings service
export const GetListing = promisify(ListingsClient.GetListing).bind(ListingsClient);
export const SetListing = promisify(ListingsClient.SetListing).bind(ListingsClient);
export const CancelListing = promisify(ListingsClient.CancelListing).bind(ListingsClient);
export const AcceptListing = promisify(ListingsClient.AcceptListing).bind(ListingsClient);
export const GetListingUpdatedEvents = promisify(ListingsClient.GetListingUpdatedEvents).bind(
  ListingsClient
);
export const StreamListingUpdatedEvents =
  ListingsClient.StreamListingUpdatedEvents.bind(ListingsClient);
export const GetListingUpdatedEventsFromTxHash = promisify(
  ListingsClient.GetListingUpdatedEventsFromTxHash.bind(ListingsClient)
);

// Blockchain service
export const GetUserInfo = promisify(BlockchainClient.GetUserInfo).bind(BlockchainClient);
export const GetSuperadminInfo = promisify(BlockchainClient.GetSuperadminInfo).bind(
  BlockchainClient
);
export const RecoverUserGas = promisify(BlockchainClient.RecoverUserGas).bind(BlockchainClient);
export const GetTxStatus = promisify(BlockchainClient.GetTxStatus).bind(BlockchainClient);
export const GetChainInfo = promisify(BlockchainClient.GetChainInfo).bind(BlockchainClient);
