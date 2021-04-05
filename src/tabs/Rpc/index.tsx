import React from 'react';

type Props = {
  children?: never;
  className?: string;
};

const index: React.FC<Props> = (props) => (
  <div>This is spawned from the rpc package {props.children}</div>
);

export default {
  toSpawn: () => true,
  body: index,
  label: 'RPC Test Tab',
  iconName: 'build',
};
