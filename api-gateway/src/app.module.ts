import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PurchaseModule } from './purchase/purchase.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StoreModule } from './store/store.module';
import { OrderGateway } from './gateway';

@Module({
  imports: [
    PurchaseModule,
    UserModule,
    StoreModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_STRING'),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService, OrderGateway],
})
export class AppModule {}
