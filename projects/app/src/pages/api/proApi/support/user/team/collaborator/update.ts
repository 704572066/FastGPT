import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { UpdateClbPermissionProps } from '@fastgpt/global/support/permission/collaborator';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';
/*  */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { tmbIds, permission } = req.body as UpdateClbPermissionProps;

    const tmb = await MongoResourcePermission.findOne({ tmbId: tmbIds[0] });
    if (!tmb) {
      throw new Error('can not find permission');
    }

    // 更新对应的记录
    await MongoResourcePermission.updateOne(
      {
        tmbId: tmbIds[0]
      },
      {
        permission
      }
    );

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
