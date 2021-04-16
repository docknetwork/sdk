import Web3 from 'web3';
import {
  OracleABI, LinkTokenABI, PriceQueryBytecode, PriceQueryABI,
} from './bytecodes-and-abis';
import { getTestEVMAccountsFromWeb3, getTokenBalance, sendTokens } from '../helpers';

const getRevertReason = require('eth-revert-reason');

const { FullNodeEndpoint } = process.env;

const web3 = new Web3('http://localhost:9933');

async function main() {
  const [alice, bob] = getTestEVMAccountsFromWeb3(web3);

  const tokenAddr = '0x8cB6497CDB9D44E168C076B414e4a675ebCC8683';
  const oracleAddr = '0x69e5C78dAa79E5BbBe4dF6B269d77AfBC351aC90';

  /* const argsABI = web3.eth.abi.encodeParameters(['address', 'address', 'bytes32'], [tokenAddr, oracleAddr, '0x11111111111111111111111111111111']);
	const createTransaction = await alice.signTransaction(
		{
				data: PriceQueryBytecode + argsABI.slice(2),
				value: "0x00",
				gasPrice: "0x01",
				gas: "0x1600000",
		}
	);
	const createReceipt = await web3.eth.sendSignedTransaction(
		createTransaction.rawTransaction
	);
	console.log(`Contract deployed at address ${createReceipt.contractAddress}`);

  const contractAddr = createReceipt.contractAddress; */

  // const contractAddr = '0xBeDC65895cB3B5D3B4A3263b01d21FB4f6EdE5d1';
  const contractAddr = '0x51De21C1F5d17CE544529a31850981e1278EDfba';

  const contract = new web3.eth.Contract(PriceQueryABI, contractAddr);
  console.log((await contract.methods.currentPrice().call()));

  // await sendTokens(web3, bob, tokenAddr, LinkTokenABI, contractAddr, web3.utils.toBN(100));

  // let oracleContract = new web3.eth.Contract(OracleABI, oracleAddr);
  // console.log((await oracleContract.methods.getChainlinkToken().call()));

  console.log(`Bob's balance ${(await getTokenBalance(web3, tokenAddr, LinkTokenABI, bob.address))}`);
  const payment = web3.utils.toWei('.00000000000000001', 'ether');
  console.log(payment);

  const encoded = contract.methods.requestDockUSDPrice(payment).encodeABI();
  const txn = await bob.signTransaction(
    {
      to: contractAddr,
      data: encoded,
      value: '0x00',
      gasPrice: '0x01',
      gas: '0x1000000',
    },
  );

  const txnReceipt = await web3.eth.sendSignedTransaction(txn.rawTransaction);
  console.log(`Txn executed (H: ${txnReceipt.transactionHash})`);
  console.log(txnReceipt);

  // console.log(web3.eth.currentProvider.call);
  // console.log((await getRevertReason('0x786ad4b1f548c2057fbe4c5f4563a9f9bc07e927f973f3f0d0ee3661533b90dc', undefined, 22725, web3.eth.currentProvider)));

  // const recp = await web3.eth.getTransactionReceipt('0x314b95a23dce27d935f346a0cd141d20f18bada18e581dd7415a90063d6009a0');
  // console.log(recp.logs[1].topics);
}

main().catch((err) => {
  console.log('Error', err);
});
