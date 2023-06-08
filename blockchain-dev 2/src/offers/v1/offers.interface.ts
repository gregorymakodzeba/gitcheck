/* eslint-disable */
import { Observable } from 'rxjs';

export const protobufPackage = 'offers.v1';

export interface GetOfferRequest {
  /** the NFT token of interest */
  tokenId: number;
  /** the userId of the buyer */
  buyerId: number;
}

export interface GetOfferResponse {
  /** the public address of the buyer's custodial wallet */
  buyerAddress: string;
  /** the full precision amount offered (ex. "25000000000000000000000000") */
  priceAttoSci: string;
  /** the public address of the seller's custodial wallet */
  sellerAddress: string;
  /** the beneficiary address (from the Tokens contract) */
  beneficiaryAddress: string;
  /** the calculated royalty (based on Tokens contract flags) */
  royaltyAttoSci: string;
  /** the end time for the offer ("0" means "indefinite") (seconds since Jan 1, 1970) */
  endTimeSec: string;
}

export interface SetOfferRequest {
  /** the NFT token of interest */
  tokenId: number;
  /** the userId of the buyer */
  buyerId: number;
  /** the end time for the offer ("0" means "indefinite") */
  endTimeSec: string;
  /** the full precision attoSCI amount offered (ex. "25000000000000000000000000") */
  priceAttoSci: string;
}

export interface SetOfferResponse {
  /** the public address of the buyer's custodial wallet */
  buyerAddress: string;
  /** the gas cost for the action */
  costAttoGas: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface CancelOfferRequest {
  /** the NFT token of interest */
  tokenId: number;
  /** the userId of the buyer */
  buyerId: number;
}

export interface CancelOfferResponse {
  /** the public address of the buyer's custodial wallet */
  buyerAddress: string;
  /** the gas cost for the action */
  costAttoGas: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface AcceptOfferRequest {
  /** the userId of the seller */
  sellerId: number;
  /** the NFT token of interest */
  tokenId: number;
  /** the userId of the buyer */
  buyerId: number;
  /** the amount to be accepted in attoSCI (as a sanity check) */
  priceAttoSci: string;
}

export interface AcceptOfferResponse {
  /** the public address of the seller's custodial wallet */
  sellerAddress: string;
  /** the public address of the buyer's custodial wallet */
  buyerAddress: string;
  /** the gas cost for the action */
  costAttoGas: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetOfferUpdatedEventsRequest {
  /** the first block of interest */
  fromBlock: number;
  /** the last block of interest */
  toBlock: number;
}

export interface OfferUpdatedEvent {
  /** the block that emitted this Event */
  blockNumber: string;
  /** the NFT id (uint64) */
  tokenId: string;
  /** the public address of the buyer's custodial wallet */
  buyerAddress: string;
  /** the end time for the auction ("0" means "indefinite") */
  endTimeSec: string;
  /** the offered amount in attoSCI */
  priceAttoSci: string;
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetOfferUpdatedEventsResponse {
  /** collected from OfferUpdated events */
  events: OfferUpdatedEvent[];
}

export interface StreamOfferUpdatedEventsRequest {}

export interface StreamOfferUpdatedEventsResponse {
  event: OfferUpdatedEvent | undefined;
}

export interface GetOfferUpdatedEventsFromTxHashRequest {
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetOfferUpdatedEventsFromTxHashResponse {
  /** List of OfferUpdated events */
  events: OfferUpdatedEvent[];
}

export interface OffersService {
  /** returns information for a Offer by userId and tokenId */
  GetOffer(request: GetOfferRequest): Promise<GetOfferResponse>;
  /** creates or updates a Offer */
  SetOffer(request: SetOfferRequest): Promise<SetOfferResponse>;
  /** cancels a Offer */
  CancelOffer(request: CancelOfferRequest): Promise<CancelOfferResponse>;
  /** sells an NFT according to an Offer */
  AcceptOffer(request: AcceptOfferRequest): Promise<AcceptOfferResponse>;
  /** collect OfferUpdated events */
  GetOfferUpdatedEvents(
    request: GetOfferUpdatedEventsRequest
  ): Promise<GetOfferUpdatedEventsResponse>;
  /** collect OfferUpdated events using server streaming */
  StreamOfferUpdatedEvents(
    request: StreamOfferUpdatedEventsRequest
  ): Observable<StreamOfferUpdatedEventsResponse>;
  /** collect OfferUpdated events for a particular transaction hash */
  GetOfferUpdatedEventsFromTxHash(
    request: GetOfferUpdatedEventsFromTxHashRequest
  ): Promise<GetOfferUpdatedEventsFromTxHashResponse>;
}
