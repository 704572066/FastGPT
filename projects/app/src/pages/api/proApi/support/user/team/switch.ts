import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { createJWT, setCookie } from '@fastgpt/service/support/permission/controller';
import { connectToDatabase } from '@/service/mongo';
import { getUserDetail } from '@fastgpt/service/support/user/controller';
import type { PostLoginProps } from '@fastgpt/global/support/user/api.d';
import { UserStatusEnum } from '@fastgpt/global/support/user/constant';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();
    const { teamId } = req.body as { teamId: string };

    if (!teamId) {
      throw new Error('缺少参数');
    }
    const { userId, tmbId } = await authCert({ req, authToken: true });
    // 检测用户是否存在
    // const authCert = await MongoUser.findOne(
    //   {
    //     username
    //   },
    //   'status'
    // );
    // if (!authCert) {
    //   throw new Error('用户未注册');
    // }

    // if (authCert.status === UserStatusEnum.forbidden) {
    //   throw new Error('账号已停用，无法登录');
    // }

    const member = await MongoTeamMember.findOne(
      {
        teamId,
        userId
      },
      '_id userId'
    );

    if (!member) {
      throw new Error('找不到该团队');
    }

    // 更新对应的记录
    // await MongoTeamMember.updateOne(
    //   {
    //     _id: tmbId
    //   },
    //   {
    //     defaultTeam: false
    //   }
    // );

    // 更新对应的记录
    // await MongoTeamMember.updateOne(
    //   {
    //     userId,
    //     teamId
    //   },
    //   {
    //     defaultTeam: true
    //   }
    // );

    const userDetail = await getUserDetail({
      tmbId: member?._id,
      userId: member?.userId
    });

    // MongoUser.findByIdAndUpdate(user._id, {
    //   lastLoginTmbId: userDetail.team.tmbId
    // });

    const token = createJWT(userDetail);
    // setCookie(res, token);
    // return token;
    jsonRes(res, {
      data: token
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
