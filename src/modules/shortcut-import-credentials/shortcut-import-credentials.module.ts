import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ShortcutImportCredentialTokenService } from './shortcut-import-credential-token.service';
import { ShortcutImportCredentialsController } from './shortcut-import-credentials.controller';
import { ShortcutImportCredentialsService } from './shortcut-import-credentials.service';

@Module({
  imports: [AuthModule],
  controllers: [ShortcutImportCredentialsController],
  providers: [
    ShortcutImportCredentialTokenService,
    ShortcutImportCredentialsService,
  ],
  exports: [ShortcutImportCredentialTokenService],
})
export class ShortcutImportCredentialsModule {}
