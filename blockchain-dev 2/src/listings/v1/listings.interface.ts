/* eslint-disable */
import { Observable } from 'rxjs';

export const protobufPackage = 'listings.v1';

export interface GetListingRequest {
  /** the NFT token of interest */
  tokenId: number;
}

export interface GetListingResponse {
  /** the seller address (from the Tokens contract) */
  sellerAddress: string;
  /** the current price for the auction */
  priceAttoSci: string;
  /** the beneficiary address (from the Tokens contract) */
  beneficiaryAddress: string;
  /** the calculated royalty in attoSCI (based on Tokens contract flags) */
  royaltyAttoSci: string;
  /** the end time for the auction ("0" means "indefinite") */
  endTimeSec: string;
  /** the final price of the auction (in attoSCI) */
  endPriceAttoSci: string;
}

export interface SetListingRequest {
  /** the userId of the seller */
  sellerId: number;
  /** the NFT token of interest */
  tokenId: number;
  /** the start time for the auction (seconds since Jan 1, 1970) */
  startTimeSec: string;
  /** the end time for the auction ("0" means "indefinite") */
  endTimeSec: string;
  /** the starting price of the auction */
  startPriceAttoSci: string;
  /** the final price of the auction */
  endPriceAttoSci: string;
}

export interface SetListingResponse {
  /** the public address of the seller's custodial wallet */
  sellerAddress: string;
  /** the gas cost for the action */
  costAttoGas: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface CancelListingRequest {
  /** the userId of the seller */
  sellerId: number;
  /** the NFT token of interest */
  tokenId: number;
}

export interface CancelListingResponse {
  /** the public address of the seller's custodial wallet */
  sellerAddress: string;
  /** the gas cost for the action */
  costAttoGas: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface AcceptListingRequest {
  /** the userId of the seller */
  sellerId: number;
  /** the NFT token of interest */
  tokenId: number;
  /** the userId of the buyer */
  buyerId: number;
}

export interface AcceptListingResponse {
  /** the public address of the seller's custodial wallet */
  sellerAddress: string;
  /** the public address of the buyer's custodial wallet */
  buyerAddress: string;
  /** the gas cost for the action */
  costAttoGas: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetListingUpdatedEventsRequest {
  /** the first block of interest */
  fromBlock: number;
  /** the last block of interest */
  toBlock: number;
}

export interface ListingUpdatedEvent {
  /** the block that emitted this Event */
  blockNumber: string;
  /** the NFT id (uint64) */
  tokenId: string;
  /** the public address of the seller's custodial wallet */
  sellerAddress: string;
  /** the start time for the auction (seconds since Jan 1, 1970) */
  startTimeSec: string;
  /** the end time for the auction ("0" means "indefinite") */
  endTimeSec: string;
  /** the starting price of the auction */
  startPriceAttoSci: string;
  /** the final price of the auction */
  endPriceAttoSci: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetListingUpdatedEventsResponse {
  /** collected from NFTUpdated events */
  events: ListingUpdatedEvent[];
}

export interface StreamListingUpdatedEventsRequest {}

export interface StreamListingUpdatedEventsResponse {
  event: ListingUpdatedEvent | undefined;
}

export interface GetListingUpdatedEventsFromTxHashRequest {
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetListingUpdatedEventsFromTxHashResponse {
  /** List of ListingUpdated events */
  events: ListingUpdatedEvent[];
}

export interface ListingsService {
  /** returns information for a listing by tokenId */
  GetListing(request: GetListingRequest): Promise<GetListingResponse>;
  /** creates or updates a listing */
  SetListing(request: SetListingRequest): Promise<SetListingResponse>;
  /** cancels a listing */
  CancelListing(request: CancelListingRequest): Promise<CancelListingResponse>;
  /** purchase the NFT from the listing */
  AcceptListing(request: AcceptListingRequest): Promise<AcceptListingResponse>;
  /** collect ListingUpdated events */
  GetListingUpdatedEvents(
    request: GetListingUpdatedEventsRequest
  ): Promise<GetListingUpdatedEventsResponse>;
  /** collect ListingUpdated events using server streaming */
  StreamListingUpdatedEvents(
    request: StreamListingUpdatedEventsRequest
  ): Observable<StreamListingUpdatedEventsResponse>;
  /** collect ListingUpdated events for a particular transaction hash */
  GetListingUpdatedEventsFromTxHash(
    request: GetListingUpdatedEventsFromTxHashRequest
  ): Promise<GetListingUpdatedEventsFromTxHashResponse>;
}
