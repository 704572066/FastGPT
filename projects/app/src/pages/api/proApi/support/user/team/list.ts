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
import { OwnerPermissionVal, ReadPermissionVal } from '@fastgpt/global/support/permission/constant';
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
          as: 'resource_permissions'
        }
      },
      {
        $match: {
          $and: [{ userId: new Types.ObjectId(userId) }, { status: status }]
        }
      },
      {
        $unwind: {
          path: '$resource_permissions',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'teams',
          localField: 'teamId',
          foreignField: '_id',
          as: 'teams'
        }
      },
      {
        $unwind: '$teams'
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          teamId: 1,
          teamName: '$teams.name',
          name: 1,
          avatar: '$teams.avatar',
          balance: '$teams.balance',
          role: 1,
          status: 1,
          defaultTeam: 1,
          permission: '$resource_permissions.permission'
        }
      }
    ]).exec();

    let data: TeamTmbItemType[] = [];
    if (teamMembers.length > 0) {
      // const teams = await MongoTeam.find({
      //   _id: teamMembers[0].teamId
      // })
      //   .sort({
      //     _id: -1
      //   })
      //   .lean();

      data = await Promise.all(
        teamMembers.map<TeamTmbItemType>((item) => {
          if (item.role === TeamMemberRoleEnum.owner) {
            return {
              userId: item.userId,
              teamId: item.teamId,
              teamName: item.teamName,
              memberName: item.name,
              avatar: item.avatar,
              balance: item.balance,
              tmbId: item._id,
              role: item.role,
              status: item.status,
              defaultTeam: item.defaultTeam,
              // canWrite: canWrite,
              teamDomain: '',
              permission: new TeamPermission({
                per: OwnerPermissionVal,
                isOwner: true
              })
            };
          } else {
            return {
              userId: item.userId,
              teamId: item.teamId,
              teamName: item.teamName,
              memberName: item.name,
              avatar: item.avatar,
              balance: item.balance,
              tmbId: item._id,
              role: item.role,
              status: item.status,
              defaultTeam: item.defaultTeam,
              // canWrite: canWrite,
              teamDomain: '',
              permission: new TeamPermission({
                per: item.permission,
                isOwner: false
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
