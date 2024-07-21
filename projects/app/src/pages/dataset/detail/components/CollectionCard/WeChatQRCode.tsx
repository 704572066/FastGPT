import React from 'react';
import MyModal from '@fastgpt/web/components/common/MyModal';
import { useTranslation } from 'next-i18next';
import { Box, Button, Input, Link, ModalBody, ModalFooter } from '@chakra-ui/react';
import { strIsLink } from '@fastgpt/global/common/string/tools';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { useForm } from 'react-hook-form';
import { useConfirm } from '@fastgpt/web/hooks/useConfirm';
import { getDocPath } from '@/web/common/system/doc';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQRCode } from '@/web/core/dataset/api';
import Loading from '@fastgpt/web/components/common/MyLoading';
const Markdown = dynamic(() => import('@/components/Markdown'), { ssr: false });
const MdImage = dynamic(() => import('@/components/Markdown/img/Image'), { ssr: false });
type FormType = {
  url?: string | undefined;
  selector?: string | undefined;
};

const WeChatQRCodeModal = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const { feConfigs } = useSystemStore();
  const { toast } = useToast();

  const { ConfirmModal, openConfirm } = useConfirm({
    type: 'common'
  });

  const [shouldRefetch, setShouldRefetch] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const { data, error, isFetching, refetch } = useQuery(['data'], getQRCode, {
    refetchInterval: shouldRefetch ? 2000 : false, // 自动刷新间隔时间设置为 10s 或禁用
    onSuccess: (data) => {
      // 如果数据已经存在，停止自动刷新
      if (data.base64img) {
        setShouldRefetch(false);
      }
    }
  });

  useEffect(() => {
    if (data && data.base64img) {
      const base64Image = `data:image/jpg;base64,${data.base64img}`;
      setImageSrc(base64Image);
      setShouldRefetch(false);
    }
  }, [data]);

  return (
    <MyModal
      isOpen
      iconSrc="core/dataset/weChatDataset"
      title={t('core.dataset.weChat.Config')}
      onClose={onClose}
      maxW={'500px'}
    >
      <ModalBody textAlign={'center'}>
        {imageSrc ? <img src={imageSrc} alt="qrcode" /> : <Loading fixed={false} />}
      </ModalBody>

      <ModalFooter>
        <Button variant={'whiteBase'} onClick={onClose}>
          关闭
        </Button>
      </ModalFooter>
    </MyModal>
  );
};

export default WeChatQRCodeModal;
