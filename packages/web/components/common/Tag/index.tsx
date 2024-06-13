import React, { useMemo } from 'react';
import { Flex, type FlexProps } from '@chakra-ui/react';

type ColorSchemaType = 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple' | 'adora';

interface Props extends FlexProps {
  children: React.ReactNode | React.ReactNode[];
  colorSchema?: ColorSchemaType;
  type?: 'fill' | 'borderFill' | 'borderSolid';
}

const colorMap: Record<
  ColorSchemaType,
  {
    borderColor: string;
    bg: string;
    color: string;
  }
> = {
  yellow: {
    borderColor: 'yellow.200',
    bg: 'yellow.50',
    color: 'yellow.600'
  },
  green: {
    borderColor: 'green.200',
    bg: 'green.50',
    color: 'green.600'
  },
  red: {
    borderColor: 'red.200',
    bg: 'red.50',
    color: 'red.600'
  },
  gray: {
    borderColor: 'myGray.200',
    bg: 'myGray.50',
    color: 'myGray.700'
  },
  blue: {
    borderColor: 'primary.200',
    bg: 'primary.50',
    color: 'primary.600'
  },
  purple: {
    borderColor: '#ECF',
    bg: '#F6EEFA',
    color: '#A558C9'
  },
  adora: {
    borderColor: '#D3CAFF',
    bg: '#F0EEFF',
    color: '#6F5DD7'
  }
};

const MyTag = ({ children, colorSchema = 'blue', type = 'fill', ...props }: Props) => {
  const theme = useMemo(() => {
    return colorMap[colorSchema];
  }, [colorSchema]);

  return (
    <Flex
      px={2.5}
      lineHeight={1}
      py={1}
      borderRadius={'sm'}
      fontSize={'xs'}
      alignItems={'center'}
      whiteSpace={'nowrap'}
      borderWidth={'1px'}
      {...theme}
      {...props}
      borderColor={type !== 'fill' ? theme.borderColor : 'transparent'}
      bg={type !== 'borderSolid' ? theme.bg : 'transparent'}
    >
      {children}
    </Flex>
  );
};

export default React.memo(MyTag);