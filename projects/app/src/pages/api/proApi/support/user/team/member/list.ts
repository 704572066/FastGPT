import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
// import { authApp } from '@fastgpt/service/support/permission/auth/app';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { TeamMemberItemType, TeamSchema } from '@fastgpt/global/support/user/team/type';

/* get team list by status */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { teamId } = req.query as {
      teamId: string;
    };

    const { userId, canWrite } = await authCert({ req, authToken: true });

    // const { teamId, tmbId, isOwner } = await authApp({ req, authToken: true, status, per: 'w' });
    const teamMembers = await MongoTeamMember.find({
      teamId
      // ...(isOwner ? { teamId } : { tmbId })
    })
      .sort({
        _id: -1
      })
      .lean();

    const users = await MongoUser.find({
      _id: teamMembers[0].userId
      // ...(isOwner ? { teamId } : { tmbId })
    })
      .sort({
        _id: -1
      })
      .lean();

    const data = await Promise.all(
      teamMembers.map<TeamMemberItemType>((item) => ({
        userId: item.userId,
        tmbId: item._id,
        teamId: item.teamId,
        memberName: item.name,
        avatar: users[0].avatar,
        role: item.role,
        status: item.status
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
