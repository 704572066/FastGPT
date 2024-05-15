/* 
    Create one dataset collection
*/
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import type {
  LinkCreateDatasetCollectionParams,
  PostWebsiteSyncParams
} from '@fastgpt/global/core/dataset/api.d';
import { authDataset } from '@fastgpt/service/support/permission/auth/dataset';
import { createOneCollection } from '@fastgpt/service/core/dataset/collection/controller';
import {
  TrainingModeEnum,
  DatasetCollectionTypeEnum,
  DatasetStatusEnum
} from '@fastgpt/global/core/dataset/constants';
import { checkDatasetLimit } from '@fastgpt/service/support/permission/teamLimit';
import { predictDataLimitLength } from '@fastgpt/global/core/dataset/utils';
import { createTrainingUsage } from '@fastgpt/service/support/wallet/usage/controller';
import { UsageSourceEnum } from '@fastgpt/global/support/wallet/usage/constants';
import { getLLMModel, getVectorModel } from '@fastgpt/service/core/ai/model';
import { reloadCollectionChunks } from '@fastgpt/service/core/dataset/collection/utils';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { useDatasetStore } from '@/web/core/dataset/store/dataset';
import { status } from 'nprogress';
import { putDatasetById } from '@/web/core/dataset/api';
// import { DatasetStatusEnum } from '@fastgpt/global/core/dataset/constants';
export const Sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    // {"trainingType":"chunk","datasetId":"660b60f0e37a9c95ffc53f9d","chunkSize":500,"chunkSplitter":"",
    // "qaPrompt":"<Context></Context> 标记中是一段文本，学习和分析它，并整理学习成果：\n- 提出问题并给出每个问题的答案。\n- 答案需详细完整，尽可能保留原文描述。\n- 答案可以包含普通文字、链接、代码、表格、公示、媒体链接等 Markdown 元素。\n- 最多提出 30 个问题。\n",
    // "name":"http://www.sailing.com.cn/news/show-1089.html","link":"http://www.sailing.com.cn/news/show-1089.html",
    // "metadata":{"webPageSelector":""}}
    await connectToDatabase();
    const link = 'http://www.sailing.com.cn/news/show-1089.html';
    const trainingType = TrainingModeEnum.chunk;
    const chunkSize = 512;
    const chunkSplitter = '';
    const metadata = { webPageSelector: '' };
    const qaPrompt =
      '<Context></Context> 标记中是一段文本，学习和分析它，并整理学习成果：\n- 提出问题并给出每个问题的答案。\n- 答案需详细完整，尽可能保留原文描述。\n- 答案可以包含普通文字、链接、代码、表格、公示、媒体链接等 Markdown 元素。\n- 最多提出 30 个问题。\n';
    const { datasetId, billId } = req.body as PostWebsiteSyncParams;

    // const { updateDataset } = useDatasetStore();

    const { teamId, tmbId, dataset } = await authDataset({
      req,
      authToken: true,
      authApiKey: true,
      datasetId: datasetId,
      per: 'w'
    });

    // 1. check dataset limit
    await checkDatasetLimit({
      teamId,
      insertLen: predictDataLimitLength(trainingType, new Array(10))
    });

    mongoSessionRun(async (session) => {
      // 2. create collection
      const collection = await createOneCollection({
        metadata,
        datasetId,
        name: link,
        teamId,
        tmbId,
        type: DatasetCollectionTypeEnum.link,

        trainingType,
        chunkSize,
        chunkSplitter,
        qaPrompt,

        rawLink: link,
        session
      });

      // 3. create bill and start sync
      // const { billId } = await createTrainingUsage({
      //   teamId,
      //   tmbId,
      //   appName: 'core.dataset.collection.Sync Collection',
      //   billSource: UsageSourceEnum.training,
      //   vectorModel: getVectorModel(dataset.vectorModel).name,
      //   agentModel: getLLMModel(dataset.agentModel).name,
      //   session
      // });

      // load
      await reloadCollectionChunks({
        collection: {
          ...collection.toObject(),
          datasetId: dataset
        },
        tmbId,
        billId,
        session
      });
      // await Sleep(20000);
      //同步状态更新
      // await putDatasetById({ id: datasetId, status: DatasetStatusEnum.active });
      await MongoDataset.updateOne(
        { _id: datasetId },
        {
          status: DatasetStatusEnum.active
        }
        // { session } 添加session事务导致阻塞无法更新状态，目前还无法确定具体原因
      );
      // await MongoDataset.findByIdAndUpdate(datasetId, { status: DatasetStatusEnum.active }, { session });

      return collection;
    });

    jsonRes(res, { data: 2000 });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
