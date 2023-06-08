import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ClientsModule } from '@nestjs/microservices';
import { grpcClientOptions } from '../grpc-client.options';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'LISTINGS_PACKAGE',
        ...grpcClientOptions,
      },
    ]),
  ],
  controllers: [ListingsController],
})
export class ListingsModule {}
