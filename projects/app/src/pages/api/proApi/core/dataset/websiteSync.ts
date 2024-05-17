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
import { DatasetSchemaType } from '@fastgpt/global/core/dataset/type';
// import { DatasetStatusEnum } from '@fastgpt/global/core/dataset/constants';
export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    // {"trainingType":"chunk","datasetId":"660b60f0e37a9c95ffc53f9d","chunkSize":500,"chunkSplitter":"",
    // "qaPrompt":"<Context></Context> 标记中是一段文本，学习和分析它，并整理学习成果：\n- 提出问题并给出每个问题的答案。\n- 答案需详细完整，尽可能保留原文描述。\n- 答案可以包含普通文字、链接、代码、表格、公示、媒体链接等 Markdown 元素。\n- 最多提出 30 个问题。\n",
    // "name":"http://www.sailing.com.cn/news/show-1089.html","link":"http://www.sailing.com.cn/news/show-1089.html",
    // "metadata":{"webPageSelector":""}}
    await connectToDatabase();
    const link =
      'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77&createType=0&token=1979188046&lang=zh_CN&timestamp=1715842841728';
    const trainingType = TrainingModeEnum.chunk;
    const chunkSize = 512;
    const chunkSplitter = '';
    const metadata = { webPageSelector: '.inner_link_article_list' };
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

    crawl(link, datasetId, billId, teamId, tmbId, dataset, 1);

    // 1. check dataset limit
    // await checkDatasetLimit({
    //   teamId,
    //   insertLen: predictDataLimitLength(trainingType, new Array(10))
    // });

    // mongoSessionRun(async (session) => {
    //   // 2. create collection
    //   const collection = await createOneCollection({
    //     metadata,
    //     datasetId,
    //     name: link,
    //     teamId,
    //     tmbId,
    //     type: DatasetCollectionTypeEnum.link,

    //     trainingType,
    //     chunkSize,
    //     chunkSplitter,
    //     qaPrompt,

    //     rawLink: link,
    //     session
    //   });

    //   // load
    //   await reloadCollectionChunks({
    //     collection: {
    //       ...collection.toObject(),
    //       datasetId: dataset
    //     },
    //     tmbId,
    //     billId,
    //     session
    //   });
    //   // await Sleep(20000);
    //   //同步状态更新
    //   // await putDatasetById({ id: datasetId, status: DatasetStatusEnum.active });
    //   await MongoDataset.updateOne(
    //     { _id: datasetId },
    //     {
    //       status: DatasetStatusEnum.active
    //     }
    //     // { session } 添加session事务导致阻塞无法更新状态，目前还无法确定具体原因
    //   );
    //   // await MongoDataset.findByIdAndUpdate(datasetId, { status: DatasetStatusEnum.active }, { session });

    //   return collection;
    // });

    //同步状态更新
    // await putDatasetById({ id: datasetId, status: DatasetStatusEnum.active });
    // await MongoDataset.updateOne(
    //   { _id: datasetId },
    //   {
    //     status: DatasetStatusEnum.active
    //   }
    //   // { session } 添加session事务导致阻塞无法更新状态，目前还无法确定具体原因
    // );

    jsonRes(res, { data: 2000 });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

async function crawl(
  url: string,
  datasetId: string,
  billId: string,
  teamId: string,
  tmbId: string,
  dataset: DatasetSchemaType,
  depth = 1,
  visited: Set<string> = new Set()
): Promise<void> {
  try {
    if (visited.has(url)) {
      return;
    }

    visited.add(url);

    const link = url;
    const trainingType = TrainingModeEnum.chunk;
    const chunkSize = 512;
    const chunkSplitter = '';
    const metadata = { webPageSelector: '' };
    const qaPrompt =
      '<Context></Context> 标记中是一段文本，学习和分析它，并整理学习成果：\n- 提出问题并给出每个问题的答案。\n- 答案需详细完整，尽可能保留原文描述。\n- 答案可以包含普通文字、链接、代码、表格、公示、媒体链接等 Markdown 元素。\n- 最多提出 30 个问题。\n';

    let internalUrls: string[] = [];
    await mongoSessionRun(async (session) => {
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

      const internalUrl = await reloadCollectionChunks({
        collection: {
          ...collection.toObject(),
          datasetId: dataset
        },
        tmbId,
        billId,
        session
      });
      if (internalUrl) internalUrls = internalUrl;
    });

    // const html = await fetchPageContent(url);
    // const links = extractLinks(html);

    console.log(`Depth ${depth}: ${url}`);

    if (depth > 1) {
      return;
    }

    for (const link of internalUrls) {
      await crawl(link, datasetId, billId, teamId, tmbId, dataset, depth + 1, visited);
    }
    if (depth == 1) {
      // await putDatasetById({ id: datasetId, status: DatasetStatusEnum.active });
      await MongoDataset.updateOne(
        { _id: datasetId },
        {
          status: DatasetStatusEnum.active
        }
        // { session } 添加session事务导致阻塞无法更新状态，目前还无法确定具体原因
      );
    }
  } catch (error) {
    console.error('Error crawling page:', error);
  }
}

// async function fetchPageContent(url: string): Promise<string> {
//     try {
//       const response = await axios.get(url);
//       return response.data;
//     } catch (error) {
//       throw new Error(`Error fetching page: ${error.message}`);
//     }
//   }

//   function extractLinks(html: string): string[] {
//     const $ = cheerio.load(html);
//     const links: string[] = [];

//     $('a').each((index, element) => {
//       const link = $(element).attr('href');
//       if (link && isValidURL(link)) {
//         links.push(link);
//       }
//     });

//     return links;
//   }

//   function isValidURL(url: string): boolean {
//     try {
//       new URL(url);
//       return true;
//     } catch (error) {
//       return false;
//     }
//   }
