declare module '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js' {
  export * from '@agoric/cosmic-proto/dist/codegen/ibc/applications/transfer/v2/packet';
}
declare module '@agoric/cosmic-proto/ibc/core/channel/v1/channel.js' {
  export * from '@agoric/cosmic-proto/dist/codegen/ibc/core/channel/v1/channel';
}
declare module '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js' {
  export * from '@agoric/cosmic-proto/dist/codegen/cosmos/base/v1beta1/coin';
}
declare module '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js' {
  export * from '@agoric/cosmic-proto/dist/codegen/cosmos/staking/v1beta1/staking';
}
declare module '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js' {
  export * from '@agoric/cosmic-proto/dist/codegen/cosmos/tx/v1beta1/tx';
}
declare module '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js' {
  export * from '@agoric/cosmic-proto/dist/codegen/ibc/applications/transfer/v1/tx';
}
declare module '@agoric/cosmic-proto/ibc/core/connection/v1/connection.js' {
  export * from '@agoric/cosmic-proto/dist/codegen/ibc/core/connection/v1/connection';
}
declare module '@agoric/cosmic-proto/tendermint/abci/types.js' {
  export * from '@agoric/cosmic-proto/dist/codegen/tendermint/abci/types';
}
declare module '@agoric/cosmic-proto/agoric/bundle.js' {
  export * from '@agoric/cosmic-proto/dist/codegen/agoric/bundle';
}

declare module '@agoric/swingset-vat' {
  export type ShutdownWithFailure = (...args: any[]) => void;
  export type Bundle = any;
  export type BundleID = string;
  export type BundleCap = any;
}
declare module '@agoric/vat-data' {
  export type Baggage = any;
}
declare module '@agoric/time' {
  export type TimerService = any;
  export type Timestamp = any;
}
