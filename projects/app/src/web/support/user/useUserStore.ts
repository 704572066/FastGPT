// Zustand是一个用于管理状态的现代React状态库。它提供了简洁、可扩展和高效的状态管理解决方案，
// 使得在React应用中处理复杂的状态逻辑变得更加容易和直观。
import { create } from 'zustand';
// devtools 中间件函数可以将 zustand 状态管理器与浏览器开发者工具集成起来，在开发过程中更方便地调试和监控状态。
// persist 中间件函数可以将状态持久化到本地存储中，当页面刷新或者重新加载时，状态依然可以被保留下来。
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { UserUpdateParams } from '@/types/user';
import type { UserType } from '@fastgpt/global/support/user/type.d';
import { getTokenLogin, putUserInfo } from '@/web/support/user/api';
import { FeTeamPlanStatusType } from '@fastgpt/global/support/wallet/sub/type';
import { getTeamPlanStatus } from './team/api';
import { useSystemStore } from '@/web/common/system/useSystemStore';

type State = {
  userInfo: UserType | null;
  initUserInfo: () => Promise<UserType>;
  setUserInfo: (user: UserType | null) => void;
  updateUserInfo: (user: UserUpdateParams) => Promise<void>;
  teamPlanStatus: FeTeamPlanStatusType | null;
  initTeamPlanStatus: () => Promise<any>;
};
// 给 store 添加 TS 类型时时，我们要在传入泛型的后面加一个()
// 在使用 zustand 时，是无法直接访问 state 中数据的，只能通过 zustand 给我们提供的 set 、 get 方法来访问 state状态。
// 所以，如果需要再 set 方法外访问 state，那我们需要使用 get 方法。
export const useUserStore = create<State>()(
  devtools(
    persist(
      immer((set, get) => ({
        userInfo: null,
        async initUserInfo() {
          get().initTeamPlanStatus();

          const res = await getTokenLogin();
          get().setUserInfo(res);

          //设置html的fontsize
          const html = document?.querySelector('html');
          if (html) {
            // html.style.fontSize = '16px';
          }

          return res;
        },
        setUserInfo(user: UserType | null) {
          set((state) => {
            state.userInfo = user ? user : null;
          });
        },
        async updateUserInfo(user: UserUpdateParams) {
          const oldInfo = (get().userInfo ? { ...get().userInfo } : null) as UserType | null;
          set((state) => {
            if (!state.userInfo) return;
            state.userInfo = {
              ...state.userInfo,
              ...user
            };
          });
          try {
            await putUserInfo(user);
          } catch (error) {
            set((state) => {
              state.userInfo = oldInfo;
            });
            return Promise.reject(error);
          }
        },
        teamPlanStatus: null,
        initTeamPlanStatus() {
          return getTeamPlanStatus().then((res) => {
            set((state) => {
              state.teamPlanStatus = res;
            });
            return res;
          });
        }
      })),
      {
        name: 'userStore',
        partialize: (state) => ({})
      }
    )
  )
);
