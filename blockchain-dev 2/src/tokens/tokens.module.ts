import { Module } from '@nestjs/common';
import { TokensController } from './tokens.controller';
import { ClientsModule } from '@nestjs/microservices';
import { grpcClientOptions } from '../grpc-client.options';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'TOKENS_PACKAGE',
        ...grpcClientOptions,
      },
    ]),
  ],
  controllers: [TokensController],
})
export class TokensModule {}
