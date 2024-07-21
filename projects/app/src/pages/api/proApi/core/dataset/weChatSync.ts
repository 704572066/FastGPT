import * as puppeteer from 'puppeteer';
import axios from 'axios';
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
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';
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
import { MongoQRCode } from '@fastgpt/service/core/dataset/qrcode/schema';
import { useDatasetStore } from '@/web/core/dataset/store/dataset';
import { status } from 'nprogress';
import { putDatasetById } from '@/web/core/dataset/api';
import { DatasetSchemaType } from '@fastgpt/global/core/dataset/type';
import { WritePermissionVal } from '@fastgpt/global/support/permission/constant';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
// import { DatasetStatusEnum } from '@fastgpt/global/core/dataset/constants';
export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();

    const { datasetId, billId } = req.body as PostWebsiteSyncParams;
    const { userId } = await authCert({ req, authToken: true });
    // const { updateDataset } = useDatasetStore();

    const { teamId, tmbId, dataset } = await authDataset({
      req,
      authToken: true,
      authApiKey: true,
      datasetId: datasetId,
      per: WritePermissionVal
    });

    const trainingType = TrainingModeEnum.chunk;
    const chunkSize = 512;
    const chunkSplitter = '';
    const metadata = { webPageSelector: dataset.websiteConfig?.selector };
    const qaPrompt =
      '<Context></Context> 标记中是一段文本，学习和分析它，并整理学习成果：\n- 提出问题并给出每个问题的答案。\n- 答案需详细完整，尽可能保留原文描述。\n- 答案可以包含普通文字、链接、代码、表格、公示、媒体链接等 Markdown 元素。\n- 最多提出 30 个问题。\n';

    const spider = new Spider(userId);
    const qrcode = await spider.login();
    // setCookie('gpt_wx_qrcode', qrcode, { req, res, maxAge: 60 * 60 * 24 }); // 设置 cookie 有效期为1天
    // await new Promise((_func) => setTimeout(_func, 20000));
    const links = await spider.getArticle(dataset.websiteConfig?.url);
    for (const link of links) {
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

        await reloadCollectionChunks({
          collection: {
            ...collection.toObject(),
            datasetId: dataset
          },
          tmbId,
          billId,
          session
        });
        // if (internalUrl) internalUrls = internalUrl;
      });
    }
    await MongoDataset.updateOne(
      { _id: datasetId },
      {
        status: DatasetStatusEnum.active
      }
      // { session } 添加session事务导致阻塞无法更新状态，目前还无法确定具体原因
    );

    jsonRes(res, { data: 2000 });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

class Spider {
  // private account: string;
  private userId: string;
  private browser: any;
  private page: any;
  private cookies: any;

  constructor(userId: string) {
    this.userId = userId;
    // this.pwd = 'lei4649861';
    // this.browser= await puppeteer.launch();
    // this.page = await this.browser.newPage();
    // this.browser = ;
  }

  async createDriver() {
    // this.browser = await puppeteer.launch({
    //   headless: true,
    //   args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    //   executablePath: "/usr/bin/chromium-browser",

    // });
    this.browser = await puppeteer.connect({
      browserWSEndpoint: process.env.BROWSERLESS_URL
      // headless: false
    });
    this.page = await this.browser.newPage();
    // await this.page.setViewport({ width: 1280, height: 800 });
  }

  log(msg: string) {
    console.log(`------ ${msg} ------`);
  }

  async login() {
    try {
      await this.createDriver();
      await this.page.goto('https://mp.weixin.qq.com/', {
        waitUntil: ['load', 'networkidle0', 'networkidle2'],
        timeout: 120000
      });

      // await this.page.waitForSelector('.login__type__container__scan__qrcode', { timeout: 30000 });
      this.cookies = await this.page.cookies();
      const uuid = this.cookies.find((cookie: any) => cookie.name === 'uuid');
      const url = await this.page.evaluate(() => {
        const image = document
          .querySelector('.login__type__container__scan__qrcode')
          ?.getAttribute('src');
        // const srcs = Array.from(images).map(img => img.src);
        return image;
      });
      const response = await axios.get('https://' + uuid.domain + url, {
        responseType: 'arraybuffer',
        withCredentials: true,
        headers: {
          Cookie: 'uuid=' + uuid.value
        }
      });

      const base64Image = Buffer.from(response.data).toString('base64');
      const result = await MongoQRCode.findOneAndUpdate(
        { userId: this.userId }, // 查询条件
        { url: uuid.domain + url, uuid: uuid.value, base64img: base64Image, isValid: true }, // 更新内容
        { new: true, upsert: true } // 选项
      );

      this.log('请拿手机扫码二维码登录公众号');
      // await this.page.waitForTimeout(20000);
      await new Promise((_func) => setTimeout(_func, 15000));
      this.log('登录成功');
      //扫码后cookies中带有token
      this.cookies = await this.page.cookies();
      return url;
    } catch (e) {
      console.error(e);
    } finally {
      await this.browser.close();
    }
  }

  async getArticle(query: string = '') {
    // 存放结果
    const appMsgList: string[] = [];

    try {
      const url = 'https://mp.weixin.qq.com';
      const headers = {
        HOST: 'mp.weixin.qq.com',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36'
      };

      const cookies = this.cookies
        .map((cookie: any) => `${cookie.name}=${cookie.value}`)
        .join('; ');
      const response = await axios.get(url, { headers: { ...headers, Cookie: cookies } });
      const tokenMatch = response.request.res.responseUrl.match(/token=(\d+)/);
      const token = tokenMatch ? tokenMatch[1] : '';

      this.log(`正在查询[ ${query} ]相关公众号 获取的token：${token}`);

      const searchUrl = 'https://mp.weixin.qq.com/cgi-bin/searchbiz?';
      const params = {
        action: 'search_biz',
        token: token,
        random: Math.random().toString(),
        query: query,
        lang: 'zh_CN',
        f: 'json',
        ajax: '1',
        begin: '0',
        count: '5'
      };

      const searchResponse = await axios.get(searchUrl, {
        headers: { ...headers, Cookie: cookies },
        params
      });
      const lists = searchResponse.data.list[0];
      const fakeid = lists.fakeid;
      const nickname = lists.nickname;
      let begin = '0';

      const articleUrl = 'https://mp.weixin.qq.com/cgi-bin/appmsg?';
      const articleParams = {
        action: 'list_ex',
        token: token,
        random: Math.random().toString(),
        fakeid: fakeid,
        lang: 'zh_CN',
        f: 'json',
        ajax: '1',
        begin: begin,
        count: '5',
        query: '',
        type: '9'
      };

      this.log(`正在查询公众号[ ${nickname} ]相关文章`);

      // 在不知道公众号有多少文章的情况下，使用while语句
      // 也方便重新运行时设置页数
      let i = 0;

      while (true) {
        begin = (i * 5).toString();
        articleParams['begin'] = begin;
        // 随机暂停几秒，避免过快的请求导致过快的被查到
        await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 10) * 1000));

        const articleResponse = await axios.get(articleUrl, {
          headers: { ...headers, Cookie: cookies },
          params: articleParams
        });
        // 微信流量控制, 退出
        if (articleResponse.data.base_resp.ret === 200013) {
          this.log(`frequencey control, stop at ${begin}`);
          break;
        }
        // 如果返回的内容中为空则结束
        if (articleResponse.data.app_msg_list.length === 0) {
          console.log('all ariticle parsed');
          break;
        }
        for (const article of articleResponse.data.app_msg_list) {
          console.log(`title --- ${article.title}`);
          console.log(`link --- ${article.link}`);
          appMsgList.push(article.link);
        }
        // 翻页
        i += 1;
        break;
      }
      return appMsgList;
    } catch (e) {
      console.error(e);
      return appMsgList;
    }
  }
}

// (async () => {
//   const spider = new Spider();
//   await spider.login();
//   await spider.getArticle('赛灵药业');
// })();
