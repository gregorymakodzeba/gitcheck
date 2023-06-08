import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { grpcClientOptions } from './grpc-client.options';

import { AppService } from './app.service';

import process from 'process';
AppService.chainId = process.argv[2];
AppService.snowtrace =
  AppService.chainId == '43113' ? 'https://testnet.snowtrace.io/tx/' : 'https://snowtrace.io/tx/';

AppService.GAS = 'AVAX';

async function bootstrap() {
  console.log(`Bootstrap mode is ${process.env.NEST_BOOTSTRAP_MODE}`);

  if (process.env.NEST_BOOTSTRAP_MODE === 'localhost') {
    const app = await NestFactory.create(AppModule);
    app.connectMicroservice<MicroserviceOptions>(grpcClientOptions);
    await app.startAllMicroservices();
    // here we set the port for the nest app; this is ignored and behind the firewall on render
    await app.listen(3000);
  } else {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      grpcClientOptions
    );
    await app.listen();
  }
}

bootstrap();
