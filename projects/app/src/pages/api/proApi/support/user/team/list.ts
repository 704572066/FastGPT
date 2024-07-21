import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
// import { authApp } from '@fastgpt/service/support/permission/auth/app';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { TeamTmbItemType, TeamSchema } from '@fastgpt/global/support/user/team/type';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import { TeamMemberRoleEnum } from '@fastgpt/global/support/user/team/constant';
import { Types } from '@fastgpt/service/common/mongo';
/* get team list by status */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { status } = req.query as {
      status: string;
    };

    const { userId, canWrite } = await authCert({ req, authToken: true });

    // const { teamId, tmbId, isOwner } = await authApp({ req, authToken: true, status, per: 'w' });
    const teamMembers = await MongoTeamMember.aggregate([
      {
        $lookup: {
          from: 'resource_permissions',
          localField: '_id',
          foreignField: 'tmbId',
          as: 'resource'
        }
      },
      {
        $match: {
          $and: [
            { userId: new Types.ObjectId(userId) }, // 订单数量大于等于 10
            { status: status } // 订单状态为 completed
          ]
        }
      },
      {
        $unwind: {
          path: '$resource',
          preserveNullAndEmptyArrays: true
        }
      }
    ]).exec();
    // .lean();

    // const teamMembers = await MongoTeamMember.find({
    //   status,
    //   userId
    //   // ...(isOwner ? { teamId } : { tmbId })
    // })
    //   .sort({
    //     _id: -1
    //   })
    //   .lean();
    // const data: string[] = [];
    let data: TeamTmbItemType[] = [];
    if (teamMembers.length > 0) {
      const teams = await MongoTeam.find({
        _id: teamMembers[0].teamId
        // ...(isOwner ? { teamId } : { tmbId })
      })
        .sort({
          _id: -1
        })
        .lean();

      data = await Promise.all(
        teamMembers.map<TeamTmbItemType>((item) => {
          if (item.role === TeamMemberRoleEnum.owner) {
            return {
              userId: item.userId,
              teamId: item.teamId,
              teamName: teams[0].name,
              memberName: item.name,
              avatar: teams[0].avatar,
              balance: teams[0].balance,
              tmbId: item._id,
              role: item.role,
              status: item.status,
              defaultTeam: item.defaultTeam,
              // canWrite: canWrite,
              teamDomain: '',
              permission: new TeamPermission({
                per: teams[0].defaultPermission,
                isOwner: item.role === TeamMemberRoleEnum.owner
              })
            };
          } else {
            return {
              userId: item.userId,
              teamId: item.teamId,
              teamName: teams[0].name,
              memberName: item.name,
              avatar: teams[0].avatar,
              balance: teams[0].balance,
              tmbId: item._id,
              role: item.role,
              status: item.status,
              defaultTeam: item.defaultTeam,
              // canWrite: canWrite,
              teamDomain: '',
              permission: new TeamPermission({
                per: item.resource.permission,
                isOwner: item.role === TeamMemberRoleEnum.owner
              })
            };
          }
        })
      );
    }
    jsonRes(res, { data });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
