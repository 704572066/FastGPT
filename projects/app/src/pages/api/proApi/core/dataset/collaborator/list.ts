import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
// import { authApp } from '@fastgpt/service/support/permission/auth/app';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { TeamMemberItemType, TeamSchema } from '@fastgpt/global/support/user/team/type';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import { TeamMemberRoleEnum } from '@fastgpt/global/support/user/team/constant';
import { Types } from '@fastgpt/service/common/mongo';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';
import { permission } from 'process';
import { CollaboratorItemType } from '@fastgpt/global/support/permission/collaborator';
/* get team list by status */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { datasetId } = req.query as {
      datasetId: string;
    };

    const { teamId, canWrite } = await authCert({ req, authToken: true });

    // 聚合查询
    const collaborators = await MongoResourcePermission.aggregate([
      {
        // 过滤
        $match: {
          resourceId: new Types.ObjectId(datasetId)
        }
      },
      {
        // 连接 orders 集合
        $lookup: {
          from: 'team_members', // 需要连接的集合
          localField: 'tmbId', // users 集合中的字段
          foreignField: '_id', // orders 集合中的字段
          as: 'team_members' // 结果数组中包含 orders 集合中的数据
        }
      },
      {
        $unwind: '$team_members'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'team_members.userId',
          foreignField: '_id',
          as: 'users'
        }
      },
      {
        $unwind: '$users'
      },
      {
        $project: {
          teamId: 1,
          tmbId: 1,
          permission: 1,
          name: '$team_members.name',
          avatar: '$users.avatar',
          role: '$team_members.role'
        }
      }
    ]);

    const data = await Promise.all(
      collaborators.map<CollaboratorItemType>((item) => ({
        tmbId: item.tmbId,
        teamId: item.teamId,
        name: item.name,
        avatar: item.avatar,
        permission: new TeamPermission({
          per: item.permission,
          isOwner: item.role === TeamMemberRoleEnum.owner
        })
      }))
    );

    jsonRes(res, { data });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
