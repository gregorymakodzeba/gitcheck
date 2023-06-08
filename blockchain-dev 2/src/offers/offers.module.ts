import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { ClientsModule } from '@nestjs/microservices';
import { grpcClientOptions } from '../grpc-client.options';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'OFFERS_PACKAGE',
        ...grpcClientOptions,
      },
    ]),
  ],
  controllers: [OffersController],
})
export class OffersModule {}
