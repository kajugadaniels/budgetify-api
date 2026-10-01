import { Injectable } from '@nestjs/common';
import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';

import {
  PasswordMaterial,
} from '../../repositories/password-credential.repository';

const PASSWORD_KEY_LENGTH =
  64;

const SCRYPT_OPTIONS = {
  N:
    32_768,

  r:
    8,

  p:
    1,

  maxmem:
    64 *
    1024 *
    1024,
} as const;

const DUMMY_PASSWORD_SALT =
  Buffer.alloc(
    16,
    7,
  ).toString(
    'base64',
  );

const DUMMY_PASSWORD_HASH =
  Buffer.alloc(
    PASSWORD_KEY_LENGTH,
    3,
  ).toString(
    'base64',
  );

interface StoredPassword {
  passwordHash: string;

  passwordSalt: string;
}

@Injectable()
export class PasswordCryptoService {
  async hash(
    password: string,
  ): Promise<PasswordMaterial> {
    const salt =
      randomBytes(
        16,
      );

    const derivedKey =
      await this.deriveKey(
        password,
        salt,
        PASSWORD_KEY_LENGTH,
      );

    return {
      hash:
        derivedKey.toString(
          'base64',
        ),

      salt:
        salt.toString(
          'base64',
        ),
    };
  }

  async matches(
    password: string,
    credential: StoredPassword | null,
  ): Promise<boolean> {
    const saltValue =
      credential?.passwordSalt ??
      DUMMY_PASSWORD_SALT;

    const hashValue =
      credential?.passwordHash ??
      DUMMY_PASSWORD_HASH;

    try {
      const storedHash =
        Buffer.from(
          hashValue,
          'base64',
        );

      const candidate =
        await this.deriveKey(
          password,
          Buffer.from(
            saltValue,
            'base64',
          ),
          storedHash.length,
        );

      return (
        storedHash.length ===
          candidate.length &&
        timingSafeEqual(
          storedHash,
          candidate,
        )
      );
    } catch {
      return false;
    }
  }

  private deriveKey(
    password: string,
    salt: Buffer,
    keyLength: number,
  ): Promise<Buffer> {
    return new Promise(
      (
        resolve,
        reject,
      ) => {
        nodeScrypt(
          password,
          salt,
          keyLength,
          SCRYPT_OPTIONS,
          (
            error,
            derivedKey,
          ) => {
            if (error) {
              reject(
                error,
              );

              return;
            }

            resolve(
              derivedKey,
            );
          },
        );
      },
    );
  }
}