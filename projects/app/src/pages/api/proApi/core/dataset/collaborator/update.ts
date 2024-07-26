import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { UpdateDatasetCollaboratorBody } from '@fastgpt/global/core/dataset/collaborator';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import type { ResourcePermissionType } from '@fastgpt/global/support/permission/type';
import { AuthUserTypeEnum, PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
/*  */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { tmbIds, permission, datasetId } = req.body as UpdateDatasetCollaboratorBody;
    const { teamId } = await authCert({ req, authToken: true });

    // const tmb = await MongoResourcePermission.findOne({ tmbId: tmbIds[0] });
    // if (!tmb) {
    //   throw new Error('can not find permission');
    // }

    // 更新对应的记录
    // await MongoResourcePermission.updateOne(
    //   {
    //     tmbId: tmbIds[0]
    //   },
    //   {
    //     permission
    //   }
    // );

    const insertPermission = await Promise.all(
      tmbIds.map<ResourcePermissionType>((item) => ({
        tmbId: item,
        teamId: teamId,
        // role: '',
        permission: permission,
        resourceType: PerResourceTypeEnum.dataset,
        resourceId: datasetId
      }))
    );

    const bulkOps = insertPermission.map((doc) => ({
      updateOne: {
        filter: { tmbId: doc.tmbId, resourceId: doc.resourceId },
        update: { $set: doc },
        upsert: true
      }
    }));

    // const insertPermissionResult = await MongoResourcePermission.insertMany(insertPermission);
    await MongoResourcePermission.bulkWrite(bulkOps);

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
