import { ClientOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

export const grpcClientOptions: ClientOptions = {
  transport: Transport.GRPC,
  options: {
    package: ['tokens.v1', 'offers.v1', 'listings.v1', 'blockchain.v1'],

    // for some reason our proto files don't end up in /dist/src ... trying this as a workaround
    protoPath: [
      join(__dirname, '../tokens/v1/tokens.proto'),
      join(__dirname, '../offers/v1/offers.proto'),
      join(__dirname, '../listings/v1/listings.proto'),
      join(__dirname, '../blockchain/v1/blockchain.proto'),
    ],
    url: `${process.env.RPC_HOST}:${process.env.RPC_PORT}`,
  },
};

console.log(`gRPC is listening on: ${grpcClientOptions.options.url}`);
