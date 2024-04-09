import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
// import { authApp } from '@fastgpt/service/support/permission/auth/app';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { TeamItemType, TeamSchema } from '@fastgpt/global/support/user/team/type';

/* get team list by status */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { status } = req.query as {
      status: string;
    };

    const { userId, canWrite } = await authCert({ req, authToken: true });

    // const { teamId, tmbId, isOwner } = await authApp({ req, authToken: true, status, per: 'w' });
    const teamMembers = await MongoTeamMember.find({
      status
      // ...(isOwner ? { teamId } : { tmbId })
    })
      .sort({
        _id: -1
      })
      .lean();

    const teams = await MongoTeam.find({
      _id: teamMembers[0].teamId
      // ...(isOwner ? { teamId } : { tmbId })
    })
      .sort({
        _id: -1
      })
      .lean();

    const data = await Promise.all(
      teamMembers.map<TeamItemType>((item) => ({
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
        canWrite: canWrite,
        teamDomain: ''
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
