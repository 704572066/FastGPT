import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { createJWT, setCookie } from '@fastgpt/service/support/permission/controller';
import { connectToDatabase } from '@/service/mongo';
import { getUserDetail } from '@fastgpt/service/support/user/controller';
import type { PostRegisterProps } from '@fastgpt/global/support/user/api.d';
import { PRICE_SCALE } from '@fastgpt/global/support/wallet/constants';
import { createDefaultTeam } from '@fastgpt/service/support/user/team/controller';
import { exit } from 'process';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';

async function initRegisterUser(name: string, pwd: string) {
  try {
    // const rootUser = await MongoUser.findOne({
    //   username: 'root'
    // });
    // const psw = process.env.DEFAULT_ROOT_PSW || '123456';

    let registerId = '';

    await mongoSessionRun(async (session) => {
      // // init root user
      // if (rootUser) {
      //   await MongoUser.findOneAndUpdate(
      //     { username: 'root' },
      //     {
      //       password: hashStr(psw)
      //     }
      //   );
      // } else {
      const [{ _id }] = await MongoUser.create(
        [
          {
            username: name,
            password: pwd
          }
        ],
        { session }
      );
      registerId = _id;
      // }
      // init root team
      await createDefaultTeam({ userId: registerId, balance: 9999 * PRICE_SCALE, session });
    });

    console.log(`register user init:`, {
      username: name,
      password: pwd
    });
  } catch (error) {
    console.log('init register user error', error);
    exit(1);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();
    const { username, password, code, inviterId } = req.body as PostRegisterProps;

    if (!username || !password) {
      throw new Error('缺少参数');
    }

    // 检测用户是否存在
    const authCert = await MongoUser.findOne(
      {
        username
      },
      'status'
    );
    if (authCert) {
      throw new Error('该用户已被注册');
    }

    await initRegisterUser(username, password);
    // if (authCert.status === UserStatusEnum.forbidden) {
    //   throw new Error('账号已停用，无法登录');
    // }

    const user = await MongoUser.findOne({
      username,
      password
    });

    if (!user) {
      throw new Error('密码错误');
    }

    const userDetail = await getUserDetail({
      tmbId: user?.lastLoginTmbId,
      userId: user._id
    });

    MongoUser.findByIdAndUpdate(user._id, {
      lastLoginTmbId: userDetail.team.tmbId
    });

    const token = createJWT(userDetail);
    setCookie(res, token);

    jsonRes(res, {
      data: {
        user: userDetail,
        token
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
