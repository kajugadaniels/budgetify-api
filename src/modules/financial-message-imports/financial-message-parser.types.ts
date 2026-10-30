import {
  Currency,
  FinancialMessageDirection,
  FinancialMessageParseStatus,
} from '@prisma/client';

export interface FinancialMessageParserInput {
  message: string;
  messageSender?: string;
  messageReceivedAt: Date;
}

export interface FinancialMessageParserResult {
  providerCode: string | null;
  direction: FinancialMessageDirection;
  parseStatus: FinancialMessageParseStatus;
  currency: Currency | null;
  amount: number | null;
  fee: number | null;
  occurredAt: Date | null;
  senderName: string | null;
  senderIdentifier: string | null;
  accountLastFour: string | null;
  providerReference: string | null;
  parserVersion: string;
  parseConfidence: number;
}
