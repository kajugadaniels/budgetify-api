import { Injectable } from '@nestjs/common';
import {
  Currency,
  FinancialMessageDirection,
  FinancialMessageParseStatus,
} from '@prisma/client';

import {
  FinancialMessageParserInput,
  FinancialMessageParserResult,
} from './financial-message-parser.types';
import { identifyFinancialMessageProvider } from './financial-message-provider.registry';

const PARSER_VERSION = 'rw-financial-message-v1';

@Injectable()
export class FinancialMessageParserService {
  parse(input: FinancialMessageParserInput): FinancialMessageParserResult {
    const message = input.message.normalize('NFKC').replace(/\s+/g, ' ').trim();
    const providerCode = this.providerCode(message, input.messageSender);
    const direction = this.direction(message);
    const amount = this.moneyValue(message, false);
    const fee = this.moneyValue(message, true);
    const providerReference = this.providerReference(message);
    const senderIdentifier = this.senderIdentifier(message);
    const senderName = this.senderName(message);
    const accountLastFour = this.accountLastFour(message);
    const parseConfidence = this.confidence({
      providerCode,
      direction,
      amount,
      providerReference,
    });

    return {
      providerCode,
      direction,
      parseStatus: this.parseStatus(direction, amount, providerCode),
      currency: amount === null ? null : Currency.RWF,
      amount,
      fee,
      occurredAt:
        direction === FinancialMessageDirection.UNKNOWN
          ? null
          : input.messageReceivedAt,
      senderName,
      senderIdentifier,
      accountLastFour,
      providerReference,
      parserVersion: PARSER_VERSION,
      parseConfidence,
    };
  }

  private providerCode(
    message: string,
    messageSender: string | undefined,
  ): string | null {
    return identifyFinancialMessageProvider(message, messageSender);
  }

  private direction(message: string): FinancialMessageDirection {
    if (
      /\b(?:reversal|reversed|reversal completed|has been reversed)\b/i.test(
        message,
      )
    ) {
      return FinancialMessageDirection.REVERSAL;
    }

    if (
      /\b(?:received|credited|credit alert|deposit(?:ed)?|incoming)\b/i.test(
        message,
      )
    ) {
      return FinancialMessageDirection.CREDIT;
    }

    if (
      /\b(?:sent|debited|debit alert|paid|withdrawn|purchase)\b/i.test(message)
    ) {
      return FinancialMessageDirection.DEBIT;
    }

    return FinancialMessageDirection.UNKNOWN;
  }

  private moneyValue(message: string, feeOnly: boolean): number | null {
    const scope = feeOnly
      ? message.match(/\b(?:fee|charge|commission)\b[^.;\n]*/i)?.[0]
      : message;

    if (!scope) {
      return null;
    }

    const currencyFirst = scope.match(
      /\b(?:RWF|FRW)\s*([0-9][0-9\s,.]*)(?=\s|[.;,]|$)/i,
    );
    const currencyLast = scope.match(/\b([0-9][0-9\s,.]*)\s*(?:RWF|FRW)\b/i);
    const captured = currencyFirst?.[1] ?? currencyLast?.[1];

    if (!captured) {
      return null;
    }

    const normalized = captured.replace(/[\s,]/g, '');
    const value = Number(normalized);

    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }

  private providerReference(message: string): string | null {
    const match = message.match(
      /\b(?:financial transaction id|transaction id|transaction reference|tx(?:n)?\s*id|reference|ref)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._:/-]{2,127})/i,
    );

    return match?.[1]?.replace(/[.,;:]+$/, '') ?? null;
  }

  private senderIdentifier(message: string): string | null {
    const afterFrom = message.match(
      /\bfrom\b[^+\d]{0,80}(\+?250\d{9}|0(?:72|73|78|79)\d{7})\b/i,
    );
    const anyRwandaNumber = message.match(
      /(?:\+250\d{9}|\b250\d{9}|\b0(?:72|73|78|79)\d{7})\b/,
    );

    return (
      (afterFrom?.[1] ?? anyRwandaNumber?.[0] ?? null)?.replace(
        /[\s()-]/g,
        '',
      ) ?? null
    );
  }

  private senderName(message: string): string | null {
    const match = message.match(
      /\bfrom\s+([\p{L}][\p{L}' -]{1,118}?)(?=\s*(?:\(|on\b|with\b|\.\s|,\s|$))/iu,
    );

    return match?.[1]?.trim() ?? null;
  }

  private accountLastFour(message: string): string | null {
    const match = message.match(
      /\b(?:account|a\/c|acct)(?:\s+(?:ending|ending in|number|no\.?))?[^\d*]{0,8}(?:\*+|x+)?(\d{4})\b/i,
    );

    return match?.[1] ?? null;
  }

  private parseStatus(
    direction: FinancialMessageDirection,
    amount: number | null,
    providerCode: string | null,
  ): FinancialMessageParseStatus {
    if (direction === FinancialMessageDirection.DEBIT) {
      return FinancialMessageParseStatus.REJECTED;
    }

    if (
      amount !== null &&
      providerCode !== null &&
      direction !== FinancialMessageDirection.UNKNOWN
    ) {
      return FinancialMessageParseStatus.PARSED;
    }

    return FinancialMessageParseStatus.NEEDS_DETAILS;
  }

  private confidence(values: {
    providerCode: string | null;
    direction: FinancialMessageDirection;
    amount: number | null;
    providerReference: string | null;
  }): number {
    let confidence = 0;
    confidence += values.providerCode === null ? 0 : 0.25;
    confidence +=
      values.direction === FinancialMessageDirection.UNKNOWN ? 0 : 0.3;
    confidence += values.amount === null ? 0 : 0.35;
    confidence += values.providerReference === null ? 0 : 0.1;

    return confidence;
  }
}
