import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Store } from './schema/store.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { TypeOfFood } from './enum/typeOfFood.enum';
import { Login } from 'src/types/login.type';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class StoreService {
  constructor(
    @InjectModel(Store.name) private readonly storeModel: Model<Store>,
    private readonly jwtService: JwtService,
  ) {}
  async create(createStoreDto: CreateStoreDto) {
    try {
      const { latitude, longitude, password, ...rest } = createStoreDto;
      const store = new this.storeModel({
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        password: await bcrypt.hash(password, 10),
        ...rest,
      });

      await store.save();
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Try again later', {
        cause: error,
        description: error.message,
      });
    }
  }

  async findAll(
    page: number,
    latitude: number,
    longitude: number,
    maxDistance: number = 3000,
    userType?: TypeOfFood,
    groupUserType?: TypeOfFood,
  ) {
    try {
      if (!userType && !groupUserType) {
        const stores = await this.storeModel
          .find({
            location: {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: [longitude, latitude],
                },
                $maxDistance: maxDistance,
              },
            },
          })
          .skip((page - 1) * 10)
          .limit(10);

        return stores;
      }
      if (!userType) {
        const groupedUserStores = await this.storeModel
          .find({
            typeOfFood: groupUserType,
            location: {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: [longitude, latitude],
                },
                $maxDistance: maxDistance,
              },
            },
          })
          .skip((page - 1) * 10)
          .limit(10);
        const countGroupedUserStore = groupedUserStores.length;
        if (countGroupedUserStore === 10) {
          return groupedUserStores;
        }
        const groupedUsersStoreId = groupedUserStores.map((store) => store._id);
        const stores = await this.storeModel
          .find({
            location: {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: [longitude, latitude],
                },
                $maxDistance: maxDistance,
              },
            },
            _id: { $nin: groupedUsersStoreId },
          })
          .skip((page - 1) * 10)
          .limit(10 - countGroupedUserStore);

        return stores;
      }
      const userStores = await this.storeModel
        .find({
          typeOfFood: userType,
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
              $maxDistance: maxDistance,
            },
          },
        })
        .skip((page - 1) * 10)
        .limit(10);
      const countUserStore = userStores.length;
      if (countUserStore === 10) {
        return userStores;
      }
      const storeIds = userStores.map((store) => store._id);

      const groupedUserStores = await this.storeModel
        .find({
          typeOfFood: groupUserType,
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
              $maxDistance: maxDistance,
            },
          },
          _id: { $nin: storeIds },
        })
        .skip((page - 1) * 10)
        .limit(10 - countUserStore);

      const combined = (await userStores).concat(groupedUserStores);
      const countCombinedStores = combined.length;
      if (countCombinedStores === 10) {
        return combined;
      }
      const combinedStoresIds = combined.map((store) => store._id);
      const stores = await this.storeModel
        .find({
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
              $maxDistance: maxDistance,
            },
          },
          _id: { $nin: combinedStoresIds },
        })
        .skip((page - 1) * 10)
        .limit(10 - countCombinedStores);

      return stores;
    } catch (error) {
      console.log(error);
    }
  }

  async findOne(email: string, password: string) {
    const store = await this.storeModel.findOne({
      email: email,
    });
    if (!store) {
      throw new BadRequestException('Email incorreto');
    }
    const match = await bcrypt.compare(password, store.password);
    if (match) {
      return store;
    }
    throw new BadRequestException('Senha invalida');
  }

  async update(email: string, updateStoreDto: UpdateStoreDto) {
    const {password, ...rest} = updateStoreDto
    if(!password){
      return this.storeModel.findOneAndUpdate(
        {
          email:email
        },
        {
          $set: {...rest}
        },
        {
          new: true
        }
      )
    }
    return this.storeModel.findOneAndUpdate(
      {
        email:email
      },
      {
        $set: {
          password: await bcrypt.hash(password, 10),
          ...rest
        }
      },
      {
        new: true
      }
    )
  }

  remove(email: string) {
    return this.storeModel.deleteOne({
      email:email
    });
  }

  async login(login: Login): Promise<{ access_token: string }> {
    const store = await this.findOne(login.email, login.password);
    const payload = { sub: store.email, username: store.name };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
