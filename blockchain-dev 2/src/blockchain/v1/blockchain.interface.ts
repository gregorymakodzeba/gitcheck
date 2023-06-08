/* eslint-disable */

export const protobufPackage = 'blockchain.v1';

export interface GetUserInfoRequest {
  /** the userId of interest; used to derive the custodial wallet key */
  userId: number;
}

export interface GetUserInfoResponse {
  /** the 160 bit hex address of the user ex. "0x574B8c3df7413c5873F99422db020835712e9770" */
  userAddress: string;
  /** the chain identifier (ex. Avalanche Fuji is "43113", Hardhat is "31337") */
  chainId: string;
}

/** empty */
export interface GetChainInfoRequest {}

export interface GetChainInfoResponse {
  /** the chain identifier (ex. Avalanche Fuji is "43113", Hardhat is "31337") */
  chainId: string;
  /** the last known block height */
  lastBlock: string;
  /** the last block timestamp (seconds since Jan 1, 1970) */
  blockTimestampSec: string;
}

/** empty */
export interface GetSuperadminInfoRequest {}

export interface GetSuperadminInfoResponse {
  /** the address of the superadmin account */
  hotWalletAddress: string;
  /** The amount of gas owned by the superadmin account (attogas / wei) */
  hotWalletBalanceAttoGas: string;
}

export interface RecoverUserGasRequest {
  /** the userId of interest; used to derive the custodial wallet key */
  userId: number;
}

export interface RecoverUserGasResponse {
  /** the address of the user ex. "0x574B8c3df7413c5873F99422db020835712e9770" */
  userAddress: string;
}

export interface GetTxStatusRequest {
  /** the hash of the transaction on chain */
  txHash: string;
}

export interface GetTxStatusResponse {
  /** The status of the transaction */
  status: GetTxStatusResponse_TxStatus;
  /** The hash of the block in which the transaction was included (if applicable) */
  blockHash: string;
  /** The block number in which the transaction was included (if applicable) */
  blockNumber: string;
  /** The amount of gas used by the transaction (attogas / wei) */
  costAttoGas: string;
  /** The gas price of the transaction (attogas / wei) */
  gasPriceAttoGas: string;
  /** The sender's 160 bit address */
  fromAddress: string;
  /** The recipient's 160 bit address (if applicable) */
  toAddress: string;
  /** The contract address created by the transaction (if applicable) */
  contractAddress: string;
  /** The nonce associated with the transaction */
  nonce: string;
  /** The value transferred by the transaction (attogas / wei) */
  valueAttoGas: string;
  /** The input data of the transaction */
  inputData: Uint8Array;
  /** Error message, if the transaction failed */
  errorMessage: string;
  /** The timestamp of the block (seconds since Jan 1, 1970) */
  blockTimestampSec: string;
}

export enum GetTxStatusResponse_TxStatus {
  TX_STATUS_UNSPECIFIED = 0,
  TX_STATUS_PENDING = 1,
  TX_STATUS_SUCCESS = 2,
  TX_STATUS_FAILED = 3,
  UNRECOGNIZED = -1,
}

export interface BlockchainService {
  /** returns information for a provided custodial wallet index */
  GetUserInfo(request: GetUserInfoRequest): Promise<GetUserInfoResponse>;
  /** get blockchain information (chain id and block height) */
  GetChainInfo(request: GetChainInfoRequest): Promise<GetChainInfoResponse>;
  /** get blockchain information (chain id and block height) */
  GetSuperadminInfo(request: GetSuperadminInfoRequest): Promise<GetSuperadminInfoResponse>;
  /** recover gas from a user account back to the hot wallet */
  RecoverUserGas(request: RecoverUserGasRequest): Promise<RecoverUserGasResponse>;
  /** report on the status of a transaction and any event it has caused based on its tx_hash value */
  GetTxStatus(request: GetTxStatusRequest): Promise<GetTxStatusResponse>;
}
