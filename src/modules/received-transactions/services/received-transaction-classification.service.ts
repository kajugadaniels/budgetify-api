import { Injectable, NotFoundException } from '@nestjs/common';
import { ReceivedTransaction } from '@prisma/client';

import { UpdateReceivedTransactionClassificationRequestDto } from '../dto/update-received-transaction-classification.request.dto';
import { ReceivedTransactionReadRepository } from '../repositories/received-transaction-read.repository';
import { ReceivedTransactionWriteRepository } from '../repositories/received-transaction-write.repository';

@Injectable()
export class ReceivedTransactionClassificationService {
  constructor(
    private readonly readRepository: ReceivedTransactionReadRepository,

    private readonly writeRepository: ReceivedTransactionWriteRepository,
  ) {}

  async update(
    userId: string,
    receivedTransactionId: string,
    body: UpdateReceivedTransactionClassificationRequestDto,
  ): Promise<ReceivedTransaction> {
    const existing = await this.readRepository.findOwnedById(
      userId,
      receivedTransactionId,
    );

    if (!existing) {
      throw new NotFoundException('Received transaction not found.');
    }

    if (existing.classification === body.classification) {
      return existing;
    }

    const updated = await this.writeRepository.updateOwnedClassification(
      userId,
      receivedTransactionId,
      body.classification,
    );

    if (!updated) {
      throw new NotFoundException('Received transaction not found.');
    }

    return updated;
  }
}
