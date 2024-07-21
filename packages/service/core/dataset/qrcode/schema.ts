import { connectionMongo, type Model } from '../../../common/mongo';
const { Schema, model, models } = connectionMongo;
import { QRCodeSchemaType } from '@fastgpt/global/core/dataset/qrcode/type.d';
import {
  DatasetStatusEnum,
  DatasetStatusMap,
  DatasetTypeEnum,
  DatasetTypeMap
} from '@fastgpt/global/core/dataset/constants';
import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';
import { PermissionTypeEnum, PermissionTypeMap } from '@fastgpt/global/support/permission/constant';
import { DatasetDefaultPermissionVal } from '@fastgpt/global/support/permission/dataset/constant';
import { isValid } from 'date-fns';

export const QRCodeName = 'qrcode';

const QRCodeSchema = new Schema({
  userId: {
    type: String,
    required: true
  },

  url: {
    type: String,
    required: true
  },
  uuid: {
    type: String,
    required: true
  },
  base64img: {
    type: String,
    required: true
  },
  isValid: {
    type: Boolean,
    required: true
  }
});

export const MongoQRCode: Model<QRCodeSchemaType> =
  models[QRCodeName] || model(QRCodeName, QRCodeSchema);
// MongoQCode.syncIndexes();
