import {
  ReceivedTransactionClassification,
  TransactionCategory,
  TransactionTransferType,
} from '@prisma/client';

export interface AnalyticsRangeInput {
  userId: string;

  from: Date;

  to: Date;
}

export interface CompletedTransactionTotals {
  transactions: number;

  sentAmount: number;

  feesPaid: number;

  totalDebited: number;
}

export interface CompletedReceivedTransactionTotals {
  transactions: number;

  receivedAmount: number;
}

export interface TransactionCategoryAnalyticsRow {
  category: TransactionCategory;

  transactions: number;

  sentAmount: number;

  feesPaid: number;

  totalDebited: number;
}

export interface TransactionTransferTypeAnalyticsRow {
  transferType: TransactionTransferType;

  transactions: number;

  sentAmount: number;

  feesPaid: number;

  totalDebited: number;
}

export interface ReceivedTransactionClassificationAnalyticsRow {
  classification: ReceivedTransactionClassification;

  transactions: number;

  receivedAmount: number;
}

export interface ReceivedTransactionEvidenceAnalytics {
  smsEvidence: number;

  providerApiEvidence: number;

  manualEntries: number;
}

export interface OutgoingTransactionAnalyticsPeriodData {
  completed: CompletedTransactionTotals;

  categories: TransactionCategoryAnalyticsRow[];

  transferTypes: TransactionTransferTypeAnalyticsRow[];
}

export interface ReceivedTransactionAnalyticsPeriodData {
  received: CompletedReceivedTransactionTotals;

  receivedReversedTransactions: number;

  receivedEvidence: ReceivedTransactionEvidenceAnalytics;

  receivedClassifications: ReceivedTransactionClassificationAnalyticsRow[];
}

export interface TransactionLifecycleAnalyticsPeriodData {
  pendingTransactions: number;

  processingTransactions: number;

  failedTransactions: number;

  cancelledTransactions: number;

  reversedTransactions: number;

  smsEvidence: number;

  providerApiConfirmed: number;

  manuallyConfirmed: number;
}

export interface TransactionAnalyticsPeriodData
  extends
    OutgoingTransactionAnalyticsPeriodData,
    ReceivedTransactionAnalyticsPeriodData,
    TransactionLifecycleAnalyticsPeriodData {}
