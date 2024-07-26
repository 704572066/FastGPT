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
import { OwnerPermissionVal, ReadPermissionVal } from '@fastgpt/global/support/permission/constant';
/* get team list by status */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    // const { teamId } = req.query as {
    //   teamId: string;
    // };

    const { teamId, canWrite } = await authCert({ req, authToken: true });

    // const { teamId, tmbId, isOwner } = await authApp({ req, authToken: true, status, per: 'w' });
    // const teamMembers = await MongoTeamMember.find({
    //   teamId
    //   // ...(isOwner ? { teamId } : { tmbId })
    // })
    //   .sort({
    //     _id: -1
    //   })
    //   .lean();
    // 聚合查询
    const teamMembers = await MongoTeamMember.aggregate([
      {
        // 连接 resource_permissions 集合
        $lookup: {
          from: 'resource_permissions', // 需要连接的集合
          localField: 'teamId', // MongoTeamMember 集合中的字段
          foreignField: 'teamId', // resource_permissions 集合中的字段
          as: 'resource_permissions' // 结果数组中包含 MongoTeamMember 集合中的数据
        }
      },
      {
        $unwind: {
          path: '$resource_permissions',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          teamId: new Types.ObjectId(teamId),
          $or: [
            { 'resource_permissions.resourceType': 'team' },
            { resource_permissions: { $exists: false } },
            { resource_permissions: { $eq: [] } }
          ]
        }
      },
      {
        // 连接 orders 集合
        $lookup: {
          from: 'users', // 需要连接的集合
          localField: 'userId', // users 集合中的字段
          foreignField: '_id', // orders 集合中的字段
          as: 'users' // 结果数组中包含 orders 集合中的数据
        }
      },
      {
        $unwind: '$users'
      },

      {
        $project: {
          userId: 1,
          tmbId: 1,
          teamId: 1,
          name: 1,
          permission: '$resource_permissions.permission',
          avatar: '$users.avatar',
          role: 1,
          status: 1
        }
      }
    ]);

    // const users = await MongoUser.find({
    //   _id: teamMembers[0].userId
    //   // ...(isOwner ? { teamId } : { tmbId })
    // })
    //   .sort({
    //     _id: -1
    //   })
    //   .lean();

    const data = await Promise.all(
      teamMembers.map<TeamMemberItemType>((item) => ({
        userId: item.userId,
        tmbId: item._id,
        teamId: item.teamId,
        memberName: item.name,
        avatar: item.avatar,
        role: item.role,
        status: item.status,
        permission: new TeamPermission({
          per: item.role === TeamMemberRoleEnum.owner ? OwnerPermissionVal : item.permission,
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
