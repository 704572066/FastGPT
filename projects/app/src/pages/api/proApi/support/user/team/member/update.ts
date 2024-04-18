import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { UpdateTeamMemberProps } from '@fastgpt/global/support/user/team/controller';
/*  */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { memberId, teamId, role, status } = req.body as UpdateTeamMemberProps;

    const tmb = await MongoTeamMember.findById(memberId);
    if (!tmb) {
      throw new Error('can not find it');
    }

    // 更新对应的记录
    if (role) {
      await MongoTeamMember.updateOne(
        {
          _id: memberId
        },
        {
          role
        }
      );
    }

    // 更新对应的记录
    if (status) {
      await MongoTeamMember.updateOne(
        {
          _id: memberId
        },
        {
          status
        }
      );
    }

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
