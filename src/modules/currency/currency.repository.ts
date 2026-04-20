import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

@Injectable()
export class CurrencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSettingByKey(
    key: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<Prisma.AppSettingGetPayload<object> | null> {
    return db.appSetting.findUnique({
      where: { key },
    });
  }

  async upsertSetting(
    key: string,
    value: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<Prisma.AppSettingGetPayload<object>> {
    return db.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
