#!/usr/bin/env node

import {
  GetAddressBalanceRequest,
  GetAddressBalanceResponse,
} from '../src/tokens/v1/tokens.interface';

const PROTO_PATH = '../src/tokens/v1/tokens.proto';

console.log(PROTO_PATH);

import { parseArgs } from 'node:util';

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const TokensProto = grpc.loadPackageDefinition(packageDefinition).Tokens; // package

function main() {
  const args = parseArgs({
    options: {
      address: {
        type: 'string',
        short: 'a',
      },
    },
  });

  let address = args.values.address;

  console.log(`checking balance for ${address}`);

  let client = new TokensProto.TokensService('localhost:50051', grpc.credentials.createInsecure()); //service

  client.GetAddressBalance(
    { address: address } as GetAddressBalanceRequest,
    function (error: any, response: GetAddressBalanceResponse) {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      if (response) console.log(`Balance is ${response.amount}`);
    }
  );
}

main();
