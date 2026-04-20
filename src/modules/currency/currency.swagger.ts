import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { ExchangeRateResponseDto } from './dto/exchange-rate.response.dto';
import { UpdateExchangeRateRequestDto } from './dto/update-exchange-rate.request.dto';

export function ApiGetExchangeRateEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Get USD to RWF exchange rate',
      description:
        'Returns the configured exchange rate used to convert USD money records into RWF reporting values.',
    }),
    ApiOkResponse({
      description: 'Exchange rate retrieved successfully.',
      type: ExchangeRateResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access currency settings.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUpdateExchangeRateEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Update USD to RWF exchange rate',
      description:
        'Updates the exchange rate used for future USD to RWF calculations. Existing records keep their stored RWF value.',
    }),
    ApiBody({ type: UpdateExchangeRateRequestDto }),
    ApiOkResponse({
      description: 'Exchange rate updated successfully.',
      type: ExchangeRateResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Request validation failed.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to update currency settings.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many currency write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}
