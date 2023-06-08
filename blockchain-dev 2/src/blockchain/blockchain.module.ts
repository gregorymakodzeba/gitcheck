import { Module } from '@nestjs/common';
import { BlockchainController } from './blockchain.controller';
import { ClientsModule } from '@nestjs/microservices';
import { grpcClientOptions } from '../grpc-client.options';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'BLOCKCHAIN_PACKAGE',
        ...grpcClientOptions,
      },
    ]),
  ],
  controllers: [BlockchainController],
})
export class BlockchainModule {}
