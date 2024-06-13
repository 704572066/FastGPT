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

type FormType = {
  url?: string | undefined;
  selector?: string | undefined;
};

const WeChatConfigModal = ({
  onClose,
  onSuccess,
  defaultValue = {
    url: '',
    selector: ''
  }
}: {
  onClose: () => void;
  onSuccess: (data: FormType) => void;
  defaultValue?: FormType;
}) => {
  const { t } = useTranslation();
  const { feConfigs } = useSystemStore();
  const { toast } = useToast();
  const { register, handleSubmit } = useForm({
    defaultValues: defaultValue
  });
  const isEdit = !!defaultValue.url;
  const confirmTip = isEdit
    ? t('core.dataset.wechat.Confirm Update Tips')
    : t('core.dataset.wechat.Confirm Create Tips');

  const { ConfirmModal, openConfirm } = useConfirm({
    type: 'common'
  });

  return (
    <MyModal
      isOpen
      iconSrc="core/dataset/weChatDataset"
      title={t('core.dataset.wechat.Config')}
      onClose={onClose}
      maxW={'500px'}
    >
      <ModalBody>
        <Box fontSize={'sm'} color={'myGray.600'}>
          {t('core.dataset.wechat.Config Description')}
          {feConfigs?.docUrl && (
            <Link
              href={getDocPath('/docs/course/websync')}
              target="_blank"
              textDecoration={'underline'}
              fontWeight={'bold'}
            >
              {t('common.course.Read Course')}
            </Link>
          )}
        </Box>
        <Box mt={2}>
          <Box>{t('core.dataset.wechat.Base Url')}</Box>
          <Input
            placeholder={t('core.dataset.collection.WeChat Name')}
            {...register('url', {
              required: true
            })}
          />
        </Box>
        <Box mt={3}>
          <Box>
            {t('core.dataset.wechat.Selector')}({t('common.choosable')})
          </Box>
          <Input {...register('selector')} placeholder="body .content #document" />
        </Box>
      </ModalBody>
      <ModalFooter>
        <Button variant={'whiteBase'} onClick={onClose}>
          {t('common.Close')}
        </Button>
        <Button
          ml={2}
          onClick={handleSubmit((data) => {
            if (!data.url) return;
            // check is link
            if (!strIsLink(data.url)) {
              return toast({
                status: 'warning',
                title: t('common.link.UnValid')
              });
            }
            openConfirm(
              () => {
                onSuccess(data);
              },
              undefined,
              confirmTip
            )();
          })}
        >
          {t('core.dataset.wechat.Start Sync')}
        </Button>
      </ModalFooter>
      <ConfirmModal />
    </MyModal>
  );
};

export default WeChatConfigModal;
