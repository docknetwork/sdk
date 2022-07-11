import { concat, concatMap, from, of, map as mapRx } from "rxjs";
import { o, split, curry } from "ramda";
import { readFileSync } from "fs";
import {
  batchExtrinsics,
  envObj,
  notNilAnd,
  withDockAPI,
  sendTxnWithAccount,
  argvArgs,
  finiteNumber,
} from "./helpers";

require("dotenv").config();

const {
  FullNodeEndpoint,
  InitiatorAccountURI,
  SudoSecretURI,
  StashAccountURI,
  OperatorAccountAddress,
} = envObj({
  FullNodeEndpoint: notNilAnd(String),
  SudoSecretURI: notNilAnd(String),
  InitiatorAccountURI: notNilAnd(String),
  StashAccountURI: notNilAnd(String),
  OperatorAccountAddress: notNilAnd(String),
});

const [initialHeader, difficulty, baseFee, beefyAuthorities, sessionKeys] =
  argvArgs([
    notNilAnd(o(JSON.parse, readFileSync)),
    notNilAnd(finiteNumber),
    notNilAnd(finiteNumber),
    notNilAnd(split(",")),
    notNilAnd(String),
  ]);

const main = async (dock, initialHeader) => {
  const stashAccount = dock.keyring.addFromUri(StashAccountURI);
 
  const {
    api: {
      tx: {
        beefyPayouts,
        basicOutboundChannel,
        incentivizedOutboundChannel,
        incentivizedInboundChannel,
        ethereumLightClient,
        erc20App,
        priceFeedModule,
        erc721App,
        dockApp,
        ethApp,
        sudo,
        assets,
        balances,
        session,
      },
    },
  } = dock;

  const sudoTxs$ = from([
    beefyPayouts.setMaxInterval(28800),
    beefyPayouts.setGasAmount(400000),
    beefyPayouts.initAuthorities(beefyAuthorities),

    basicOutboundChannel.setInterval(6),

    incentivizedOutboundChannel.setInterval(6),
    incentivizedOutboundChannel.setGasAmount(70000),
    incentivizedOutboundChannel.setBeefySyncPercent(10),

    incentivizedInboundChannel.setRewardFraction(80),

    erc20App.setGasAmount(65000),

    erc721App.setGasAmount(70000),

    dockApp.setGasAmount(52000),

    ethApp.setGasAmount(28000),

    ethereumLightClient.initializeConfig(
      { ...initialHeader, base_fee: baseFee },
      difficulty
    ),
    ethereumLightClient.setDepositAmount(100e6),

    assets.forceCreate(
      0,
      "0x6d6f646c65746865726170700000000000000000000000000000000000000000",
      true,
      1
    ),

    priceFeedModule.addOperator(
      { from: "DOCK", to: "USD" },
      OperatorAccountAddress
    ),
    priceFeedModule.addOperator(
      { from: "ETH-GAS", to: "DOCK" },
      OperatorAccountAddress
    ),
  ]);
  const initiatorTxs$ = of(
    balances.transfer("391LjoiCr1JjsrqHJW6EirNFUSjixdNGfkVDi68Uibgax8Zt", 1e12),
    balances.transfer(stashAccount.address, 1e7)
  );
  const initiatorStashAccountTxs$ = of(session.setKeys(sessionKeys, "0x"));

  const sendTx = sendTxWithAccount(dock);

  const sentTxs$ = concat(
    initiatorTxs$.pipe(sendTx(InitiatorAccountURI)),
    initiatorStashAccountTxs$.pipe(sendTx(StashAccountURI)),
    sudoTxs$.pipe(mapRx(tx => sudo.sudo(tx)), sendTx(SudoSecretURI))
  );

  await new Promise((resolve, reject) =>
    sentTxs$.subscribe({
      error: reject,
      complete: resolve,
    })
  );
};

const sendTxWithAccount = curry((dock, accountURI, txs$) =>
  txs$.pipe(
    batchExtrinsics(dock.api, 10),
    concatMap((tx) => from(sendTxnWithAccount(dock, accountURI, tx, false)))
  )
);

if (require.main === module) {
  console.log("Configuring the chain...");

  withDockAPI(
    { address: FullNodeEndpoint },
    main
  )(initialHeader)
    .catch((error) => {
      console.error("Error occurred somewhere, it was caught!", error);
      process.exit(1);
    })
    .then(() => process.exit());
}

setInterval(() => {}, 1e3);

export default main;
