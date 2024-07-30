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
import { AppCollaboratorDeleteParams } from '@fastgpt/global/core/app/collaborator';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';
/*  */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { appId, tmbId } = req.query as AppCollaboratorDeleteParams;

    if (!tmbId || !appId) {
      throw new Error('参数错误');
    }

    // 凭证校验
    // await authApp({ req, authToken: true, appId, per: 'owner' });
    const { teamId } = await authCert({ req, authToken: true });

    // 移除协作者
    const collaborator = await MongoResourcePermission.findOne(
      {
        tmbId: tmbId,
        resourceId: appId
      },
      '_id'
    );

    if (!collaborator) {
      throw new Error('找不到该协作者');
    }

    await MongoResourcePermission.deleteOne({
      tmbId: tmbId,
      resourceId: appId
    });

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
