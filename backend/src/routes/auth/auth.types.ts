import { RequestData, ResponseData } from '@fhss-web-team/backend-utils/endpoint';
import { User } from 'prisma/client';

export type CallbackRequest = RequestData<null, null>;
export type CallbackResponse = ResponseData<
  Omit<User, 'updatedAt' | 'createdAt'> & { createdAt: string; updatedAt: string }
>;
