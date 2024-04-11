import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
// import { authApp } from '@fastgpt/service/support/permission/auth/app';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import {
  TeamMemberItemType,
  TeamSchema,
  TeamMemberType
} from '@fastgpt/global/support/user/team/type';
import {
  InviteMemberResponse,
  InviteMemberProps
} from '@fastgpt/global/support/user/team/controller';
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum
} from '@fastgpt/global/support/user/team/constant';
/* get team list by status */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { teamId, usernames, role } = req.body as InviteMemberProps;
    console.log(req.query);
    const { userId, canWrite } = await authCert({ req, authToken: true });

    // const { teamId, tmbId, isOwner } = await authApp({ req, authToken: true, status, per: 'w' });
    const teamMemberNames = await MongoTeamMember.find(
      {
        teamId

        // ...(isOwner ? { teamId } : { tmbId })
      },
      'userId name'
    )
      .sort({
        _id: -1
      })
      .lean();

    const invite = await Promise.all(
      teamMemberNames.map<{ username: string; userId: string }>((item) => ({
        userId: item.userId,
        username: item.name
      }))
    );

    const inTeam = await Promise.all(
      (invite || []).filter((item) => {
        return usernames.some((x) => x === item.username);
      })
    );

    // Array转Set
    // const usernamesSet = new Set(usernames)
    // const teamMemberNamesSet = new Set(names)

    // 求两个Set交集
    // const intersection = new Set([...teamMemberNamesSet].filter(x => usernamesSet.has(x)))

    const users = await MongoUser.find(
      {
        // _id: teamMembers[0].userId
        // ...(isOwner ? { teamId } : { tmbId })
      },
      '_id username'
    )
      .sort({
        _id: -1
      })
      .lean();

    const usersMap = await Promise.all(
      users.map<{ username: string; userId: string }>((item) => ({
        userId: item._id,
        username: item.username
      }))
    );

    const inValidNames = await Promise.all(
      (usernames || []).filter((item) => {
        return !usersMap.some((x) => x.username === item);
      })
    );

    const inValid = await Promise.all(
      inValidNames.map<{ username: string; userId: string }>((item) => ({
        userId: '',
        username: item
      }))
    );

    const inviteNames = await Promise.all(
      (usernames || []).filter((item) => {
        return ![...inTeam, ...inValid].some((x) => x.username === item);
      })
    );

    const inviteUsers = await Promise.all(
      (usersMap || []).filter((item) => {
        return inviteNames.some((x) => x === item.username);
      })
    );

    const insert = await Promise.all(
      inviteUsers.map<TeamMemberType>((item) => ({
        userId: item.userId,
        name: item.username,
        teamId: teamId,
        role: role,
        status: TeamMemberStatusEnum.waiting,
        createTime: new Date(),
        defaultTeam: false
      }))
    );

    const insertResult = await MongoTeamMember.insertMany(insert);

    const data: InviteMemberResponse = { inTeam: inTeam, inValid: inValid, invite: inviteUsers };

    jsonRes(res, { data });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
