import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokensModule } from './tokens/tokens.module';
import { ListingsModule } from './listings/listings.module';
import { OffersModule } from './offers/offers.module';
import { BlockchainModule } from './blockchain/blockchain.module';

@Module({
  imports: [ConfigModule.forRoot(), TokensModule, OffersModule, ListingsModule, BlockchainModule],
})
export class AppModule {}
