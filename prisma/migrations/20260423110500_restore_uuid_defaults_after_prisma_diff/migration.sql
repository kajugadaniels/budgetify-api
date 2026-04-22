ALTER TABLE "AppSetting" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "MoneyMovement" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "SavingTransaction" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "SavingTransactionIncomeSource" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
