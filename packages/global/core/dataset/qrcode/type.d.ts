import { PermissionValueType } from 'support/permission/type';
import type { LLMModelItemType, VectorModelItemType } from '../../core/ai/model.d';
import { PermissionTypeEnum } from '../../support/permission/constant';
import { PushDatasetDataChunkProps } from './api';
import {
  DatasetCollectionTypeEnum,
  DatasetStatusEnum,
  DatasetTypeEnum,
  SearchScoreTypeEnum,
  TrainingModeEnum
} from './constants';
import { DatasetPermission } from '../../support/permission/dataset/controller';
import { Permission } from '../../support/permission/controller';

/* schema */
export type QRCodeSchemaType = {
  _id: string;
  userId: string;
  url: string;
  uuid: string;
  base64img: string;
  isValid: boolean;
};
