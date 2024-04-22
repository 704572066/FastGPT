import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { DelMemberProps } from '@fastgpt/global/support/user/team/controller';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { MongoDatasetData } from '@fastgpt/service/core/dataset/data/schema';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { MongoChat } from '@fastgpt/service/core/chat/chatSchema';
import { MongoPlugin } from '@fastgpt/service/core/plugin/schema';
import { MongoApp } from '@fastgpt/service/core/app/schema';
import { MongoChatItem } from '@fastgpt/service/core/chat/chatItemSchema';
import { MongoDatasetTraining } from '@fastgpt/service/core/dataset/training/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { TeamMemberRoleEnum } from '@fastgpt/global/support/user/team/constant';
/*  */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { teamId } = req.query as { teamId: string };

    if (!teamId) {
      throw new Error('参数错误');
    }

    // find team owner
    const owner = await MongoTeamMember.findOne(
      {
        teamId: teamId,
        role: TeamMemberRoleEnum.owner
      },
      '_id userId'
    );

    if (!owner) {
      throw new Error('找不到团队创建者');
    }

    // 凭证校验
    // await authApp({ req, authToken: true, appId, per: 'owner' });
    const { tmbId } = await authCert({ req, authToken: true });

    await mongoSessionRun(async (session) => {
      // 转移知识库资源到创建者名下
      await MongoDataset.updateMany(
        {
          teamId: teamId,
          tmbId: tmbId
        },
        {
          $set: {
            tmbId: owner._id
          }
        },
        { session }
      );

      await MongoDatasetData.updateMany(
        {
          teamId: teamId,
          tmbId: tmbId
        },
        {
          $set: {
            tmbId: owner._id
          }
        },
        { session }
      );

      await MongoDatasetCollection.updateMany(
        {
          teamId: teamId,
          tmbId: tmbId
        },
        {
          $set: {
            tmbId: owner._id
          }
        },
        { session }
      );

      await MongoDatasetTraining.updateMany(
        {
          teamId: teamId,
          tmbId: tmbId
        },
        {
          $set: {
            tmbId: owner._id
          }
        },
        { session }
      );
      // 转移插件资源到创建者名下
      await MongoPlugin.updateMany(
        {
          teamId: teamId,
          tmbId: tmbId
        },
        {
          $set: {
            tmbId: owner._id
          }
        },
        { session }
      );
      // 转移应用资源到创建者名下
      await MongoApp.updateMany(
        {
          teamId: teamId,
          tmbId: tmbId
        },
        {
          $set: {
            tmbId: owner._id
          }
        },
        { session }
      );
      // 转移聊天记录到创建者名下
      await MongoChatItem.updateMany(
        {
          teamId: teamId,
          tmbId: tmbId
        },
        {
          $set: {
            tmbId: owner._id
          }
        },
        { session }
      );
      await MongoChat.updateMany(
        {
          teamId: teamId,
          tmbId: tmbId
        },
        {
          $set: {
            tmbId: owner._id
          }
        },
        { session }
      );
      // bills outlinks

      // 移除团队成员
      // const member = await MongoTeamMember.findOne(
      //   {
      //     _id: tmbId,
      //     teamId: teamId
      //   },
      //   '_id userId'
      // );

      // if (!member) {
      //   throw new Error('找不到该成员');
      // }

      // await MongoTeamMember.updateOne(
      //   {
      //     userId: owner.userId,
      //     role: TeamMemberRoleEnum.owner
      //   },
      //   {
      //     defaultTeam: true
      //   },
      //   { session }
      // );

      await MongoTeamMember.deleteOne(
        {
          _id: tmbId,
          teamId: teamId
        },
        { session }
      );
    });

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
