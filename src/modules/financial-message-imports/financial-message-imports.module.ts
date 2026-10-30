import { Module } from '@nestjs/common';

import { ShortcutImportCredentialsModule } from '../shortcut-import-credentials/shortcut-import-credentials.module';
import { FinancialMessageCryptoService } from './financial-message-crypto.service';
import { FinancialMessageImportsController } from './financial-message-imports.controller';
import { FinancialMessageImportsService } from './financial-message-imports.service';
import { FinancialMessageParserService } from './financial-message-parser.service';
import { FinancialMessageReviewService } from './financial-message-review.service';
import { ShortcutImportAuthGuard } from './shortcut-import-auth.guard';

@Module({
  imports: [ShortcutImportCredentialsModule],
  controllers: [FinancialMessageImportsController],
  providers: [
    FinancialMessageCryptoService,
    FinancialMessageParserService,
    FinancialMessageImportsService,
    FinancialMessageReviewService,
    ShortcutImportAuthGuard,
  ],
})
export class FinancialMessageImportsModule {}
