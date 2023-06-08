/* eslint-disable */
import { Observable } from 'rxjs';

export const protobufPackage = 'tokens.v1';

export enum ContentType {
  CONTENT_TYPE_UNSPECIFIED = 0,
  CONTENT_TYPE_OWNER = 1,
  CONTENT_TYPE_ADMIN = 2,
  UNRECOGNIZED = -1,
}

export interface GetAddressBalanceRequest {
  /** the hex address of interest (ex. "0x574B8c3df7413c5873F99422db020835712e9770") */
  userAddress: string;
}

export interface GetAddressBalanceResponse {
  /** the full precision amount (ex. "25000000000000000000000000") */
  amountAttoSci: string;
}

export interface GetUserBalanceRequest {
  /** the userId of interest; used to derive the custodial wallet key */
  userId: number;
}

export interface GetUserBalanceResponse {
  /** the full precision amount (ex. "25000000000000000000000000") */
  amountAttoSci: string;
  /** the public address of the custodial wallet */
  userAddress: string;
}

export interface CreditUserRequest {
  /** the userId to credit (from the ScieNFT hot wallet) */
  userId: number;
  /** the full precision amount to transfer (ex. "25000000000000000000000000") */
  amountAttoSci: string;
}

export interface CreditUserResponse {
  /** the public address of the custodial wallet */
  userAddress: string;
  /** the gas cost for the action */
  costAttoGas: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface TransferSCIRequest {
  /** the sender's userId */
  fromId: number;
  /** the recipient's userId */
  toId: number;
  /** the full precision amount to transfer */
  amountAttoSci: string;
}

export interface TransferSCIResponse {
  /** the public address of the sender's custodial wallet */
  fromAddress: string;
  /** the public address of the recipient's custodial wallet */
  toAddress: string;
  /** the gas cost for the action */
  costAttoGas: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface MintNFTRequest {
  /** the ipfs CIDv1 address for the metadata.json file (head of adminContent list) */
  contentCidV1: string;
  /** the userId for the initial Admin */
  adminId: number;
  /** the userId for the initial Owner */
  ownerId: number;
  /** the userID for the initial Beneficiary */
  beneficiaryId: number;
}

export interface MintNFTResponse {
  /** the public address for the initial Admin */
  adminAddress: string;
  /** the public address for the initial Owner */
  ownerAddress: string;
  /** the public address for the initial Beneficiary */
  beneficiaryAddress: string;
  /** the gas cost for the action */
  costAttoGas: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface EnhanceNFTRequest {
  /** the NFT id (uint64) */
  tokenId: string;
  /** the ipfs CIDv1 address for the metadata.json file */
  newContentCidV1: string;
  /** the list that new_content updates (owner or admin) */
  contentType: ContentType;
}

export interface EnhanceNFTResponse {
  /** the gas cost for the action */
  costAttoGas: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetNFTRequest {
  /** the NFT id (uint64) */
  tokenId: string;
}

export interface GetNFTResponse {
  /** the NFT id (uint64) */
  tokenId: string;
  /** a list of ipfs CIDv1 addresses (each for a metadata.json file) */
  ownerContentCidV1: string[];
  /** a list of ipfs CIDv1 addresses (each for a metadata.json file) */
  adminContentCidV1: string[];
  /** a list of creation times of the owner content (seconds since Jan 1, 1970) */
  ownerCreatedAtSec: string[];
  /** a list of creation times of the admin content (seconds since Jan 1, 1970) */
  adminCreatedAtSec: string[];
  /** the NFT status bits (uint192) */
  status: string;
  /** the public address of the Owner */
  ownerAddress: string;
  /** the public address of the Admin */
  adminAddress: string;
  /** the public address of the Beneficiary */
  beneficiaryAddress: string;
}

export interface GetAdminContentNodeCreatedEventsRequest {
  /** the first block of interest */
  fromBlock: number;
  /** the last block of interest */
  toBlock: number;
}

export interface AdminContentNodeCreatedEvent {
  /** the block that emitted this Event */
  blockNumber: string;
  /** the NFT id (uint64) */
  tokenId: string;
  /** the ipfs CIDv1 address for a metadata.json file */
  contentCidV1: string;
  /** the ipfs CIDv1 address for the previous metadata.json file */
  previousCidV1: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetAdminContentNodeCreatedEventsResponse {
  events: AdminContentNodeCreatedEvent[];
}

export interface GetOwnerContentNodeCreatedEventsRequest {
  /** the first block of interest */
  fromBlock: number;
  /** the last block of interest */
  toBlock: number;
}

export interface OwnerContentNodeCreatedEvent {
  /** the block that emitted this Event */
  blockNumber: string;
  /** the NFT id (uint64) */
  tokenId: string;
  /** the ipfs CIDv1 address for a metadata.json file */
  contentCidV1: string;
  /** the ipfs CIDv1 address for the previous metadata.json file */
  previousCidV1: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetOwnerContentNodeCreatedEventsResponse {
  events: OwnerContentNodeCreatedEvent[];
}

export interface GetNFTUpdatedEventsRequest {
  /** the first block of interest */
  fromBlock: number;
  /** the last block of interest */
  toBlock: number;
}

export interface NFTUpdatedEvent {
  /** the block that emitted this Event */
  blockNumber: string;
  /** the NFT id (uint64) */
  tokenId: string;
  /** the NFT status bits (uint192) */
  status: string;
  /** the public address of the Owner */
  ownerAddress: string;
  /** the public address of the Admin */
  adminAddress: string;
  /** the public address of the Beneficiary */
  beneficiaryAddress: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetNFTUpdatedEventsResponse {
  events: NFTUpdatedEvent[];
}

export interface GetTransferEventsRequest {
  /** the first block of interest */
  fromBlock: number;
  /** the last block of interest */
  toBlock: number;
}

export interface TransferEvent {
  /** the block that emitted this Event */
  blockNumber: string;
  /** the address that submitted the transaction */
  operatorAddress: string;
  /** the address that is debited by the transaction */
  fromAddress: string;
  /** the address that is credited by the transaction */
  toAddress: string;
  /** the transferred token id (uint256) (SCI = 0) */
  tokenId: string;
  /** the transferred token amount, either "1" for an NFT or a token value in attoSCI */
  amount: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetTransferEventsResponse {
  /** collected from Transfer, TransferSingle, and TransferBatch events */
  events: TransferEvent[];
}

export interface GetMarketplaceSaleEventsRequest {
  /** the first block of interest */
  fromBlock: number;
  /** the last block of interest */
  toBlock: number;
}

export interface MarketplaceSaleEvent {
  /** the block that emitted this Event */
  blockNumber: string;
  /** the transferred token id (uint256) */
  tokenId: string;
  /** the address of the buyer (received the NFT) */
  buyerAddress: string;
  /** the amount total amount paid by the buyer */
  priceAttoSci: string;
  /** the address of the seller (received price - royalty) */
  sellerAddress: string;
  /** the address of the beneficiary */
  beneficiaryAddress: string;
  /** the amount paid to the beneficiary */
  royaltyAttoSci: string;
  /** the time of sale (seconds since Jan 1, 1970) */
  soldAtSec: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetMarketplaceSaleEventsResponse {
  /** collected from MarketplaceSale events */
  events: MarketplaceSaleEvent[];
}

export interface RecoverUserGasRequest {
  /** the userId of interest; used to derive the custodial wallet key */
  userId: number;
}

export interface RecoverUserGasResponse {
  /** the address of the user ex. "0x574B8c3df7413c5873F99422db020835712e9770" */
  userAddress: string;
}

export interface StreamNFTUpdatedEventsRequest {}

export interface StreamNFTUpdatedEventsResponse {
  event: NFTUpdatedEvent | undefined;
}

export interface StreamAdminContentNodeCreatedEventsRequest {}

export interface StreamAdminContentNodeCreatedEventsResponse {
  event: AdminContentNodeCreatedEvent | undefined;
}

export interface StreamOwnerContentNodeCreatedEventsRequest {}

export interface StreamOwnerContentNodeCreatedEventsResponse {
  event: OwnerContentNodeCreatedEvent | undefined;
}

export interface StreamTransferEventsRequest {}

export interface StreamTransferEventsResponse {
  event: TransferEvent | undefined;
}

export interface StreamMarketplaceSaleEventsRequest {}

export interface StreamMarketplaceSaleEventsResponse {
  event: MarketplaceSaleEvent | undefined;
}

export interface GetNFTUpdatedEventsFromTxHashRequest {
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetNFTUpdatedEventsFromTxHashResponse {
  /** List of NFTUpdated events */
  events: NFTUpdatedEvent[];
}

export interface GetAdminContentNodeCreatedEventsFromTxHashRequest {
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetAdminContentNodeCreatedEventsFromTxHashResponse {
  /** List of AdminContentNodeCreated events */
  events: AdminContentNodeCreatedEvent[];
}

export interface GetOwnerContentNodeCreatedEventsFromTxHashRequest {
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetOwnerContentNodeCreatedEventsFromTxHashResponse {
  /** List of OwnerContentNodeCreated events */
  events: OwnerContentNodeCreatedEvent[];
}

export interface GetTransferEventsFromTxHashRequest {
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetTransferEventsFromTxHashResponse {
  /** List of Transfer events */
  events: TransferEvent[];
}

export interface GetMarketplaceSaleEventsFromTxHashRequest {
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetMarketplaceSaleEventsFromTxHashResponse {
  /** List of MarketplaceSale events */
  events: MarketplaceSaleEvent[];
}

export interface TokensService {
  /** returns the SCI balance for a provided address */
  GetAddressBalance(request: GetAddressBalanceRequest): Promise<GetAddressBalanceResponse>;
  /** returns the SCI balance for a provided custodial wallet (wallet index = userId) */
  GetUserBalance(request: GetUserBalanceRequest): Promise<GetUserBalanceResponse>;
  /** moves tokens from the ScieNFT hot wallet to a custodial wallet (wallet index = userId) */
  CreditUser(request: CreditUserRequest): Promise<CreditUserResponse>;
  /** move SCI tokens between users */
  TransferSCI(request: TransferSCIRequest): Promise<TransferSCIResponse>;
  /** mint an NFT */
  MintNFT(request: MintNFTRequest): Promise<MintNFTResponse>;
  /** append additional content to an NFT */
  EnhanceNFT(request: EnhanceNFTRequest): Promise<EnhanceNFTResponse>;
  /** get NFT info */
  GetNFT(request: GetNFTRequest): Promise<GetNFTResponse>;
  /** get events related to NFT updates */
  GetNFTUpdatedEvents(request: GetNFTUpdatedEventsRequest): Promise<GetNFTUpdatedEventsResponse>;
  /** get events related to admin content list updates */
  GetAdminContentNodeCreatedEvents(
    request: GetAdminContentNodeCreatedEventsRequest
  ): Promise<GetAdminContentNodeCreatedEventsResponse>;
  /** get events related to owner content list updates */
  GetOwnerContentNodeCreatedEvents(
    request: GetOwnerContentNodeCreatedEventsRequest
  ): Promise<GetOwnerContentNodeCreatedEventsResponse>;
  /** get events related to token transfers */
  GetTransferEvents(request: GetTransferEventsRequest): Promise<GetTransferEventsResponse>;
  /** get events related to marketplace sales */
  GetMarketplaceSaleEvents(
    request: GetMarketplaceSaleEventsRequest
  ): Promise<GetMarketplaceSaleEventsResponse>;
  /** get events related to NFT updates using server streaming */
  StreamNFTUpdatedEvents(
    request: StreamNFTUpdatedEventsRequest
  ): Observable<StreamNFTUpdatedEventsResponse>;
  /** get events related to admin content list updates using server streaming */
  StreamAdminContentNodeCreatedEvents(
    request: StreamAdminContentNodeCreatedEventsRequest
  ): Observable<StreamAdminContentNodeCreatedEventsResponse>;
  /** get events related to owner content list updates using server streaming */
  StreamOwnerContentNodeCreatedEvents(
    request: StreamOwnerContentNodeCreatedEventsRequest
  ): Observable<StreamOwnerContentNodeCreatedEventsResponse>;
  /** get events related to token transfers using server streaming */
  StreamTransferEvents(
    request: StreamTransferEventsRequest
  ): Observable<StreamTransferEventsResponse>;
  /** get events related to marketplace sales using server streaming */
  StreamMarketplaceSaleEvents(
    request: StreamMarketplaceSaleEventsRequest
  ): Observable<StreamMarketplaceSaleEventsResponse>;
  /** get events related to NFT updates for a particular transaction hash */
  GetNFTUpdatedEventsFromTxHash(
    request: GetNFTUpdatedEventsFromTxHashRequest
  ): Promise<GetNFTUpdatedEventsFromTxHashResponse>;
  /** get events related to admin content list updates for a particular transaction hash */
  GetAdminContentNodeCreatedEventsFromTxHash(
    request: GetAdminContentNodeCreatedEventsFromTxHashRequest
  ): Promise<GetAdminContentNodeCreatedEventsFromTxHashResponse>;
  /** get events related to owner content list updates for a particular transaction hash */
  GetOwnerContentNodeCreatedEventsFromTxHash(
    request: GetOwnerContentNodeCreatedEventsFromTxHashRequest
  ): Promise<GetOwnerContentNodeCreatedEventsFromTxHashResponse>;
  /** get events related to token transfers for a particular transaction hash */
  GetTransferEventsFromTxHash(
    request: GetTransferEventsFromTxHashRequest
  ): Promise<GetTransferEventsFromTxHashResponse>;
  /** get events related to marketplace sales for a particular transaction hash */
  GetMarketplaceSaleEventsFromTxHash(
    request: GetMarketplaceSaleEventsFromTxHashRequest
  ): Promise<GetMarketplaceSaleEventsFromTxHashResponse>;
}
