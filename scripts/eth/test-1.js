import Web3 from "web3";
import * as web3Utils from 'web3-utils';
import {ERC20_BYTECODE, ERC20_ABI, LinkTokenABI, LinkTokenByteCode, OracleByteCode, OracleABI, AggregatorByteCode, AggregatorABI, AccessControlledAggregatorABI, AccessControlledAggregatorByteCode} from './bytecodes.js';

import { DockAPI } from '../../src/api';
import {getBalance} from '../../src/utils/chain-ops';
import {blake2AsHex, decodeAddress, encodeAddress} from '@polkadot/util-crypto';

require('dotenv').config();


const { FullNodeEndpoint } = process.env;

const alice = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

const web3 = new Web3('http://localhost:9933');
const STORAGE_SLOT = "0";


const createAccount = () => {
	const account = web3.eth.accounts.create();
	const mapStorageSlot = STORAGE_SLOT.padStart(64, '0');
	const mapKey = account.address.toString().substring(2).padStart(64, '0');
	const storageKey = web3Utils.sha3('0x'.concat(mapKey.concat(mapStorageSlot)));
	return {...account, storageKey};
}

async function giveMoneyToSender(sender, amount) {
	const dock = new DockAPI();
  	await dock.init({
    	address: FullNodeEndpoint,
  	});

 	const bytes = web3.utils.hexToBytes(sender);
	// console.log(bytes);
	const preimage = ('evm:'.split('').map((c) => c.charCodeAt())).concat(bytes);
	// console.log(preimage);
	const addrEvm = encodeAddress(blake2AsHex(preimage));
	console.log(addrEvm);
	const keypair = dock.keyring.addFromUri('//Alice');
	let amt = amount ? amount: 500540000000
	const transfer = dock.api.tx.balances.transfer(addrEvm, amt);
	dock.setAccount(keypair);
	await dock.signAndSend(transfer, false);

	await dock.disconnect();
}

async function deployTokenContract(signer, bytecode) {
	const createTransaction = await signer.signTransaction(
		{
			data: bytecode,
			value: "0x00",
			gasPrice: "0x01",
			gas: "0x100000000",
		});
	console.log("Transaction", {
		...createTransaction,
		rawTransaction: `${createTransaction.rawTransaction.substring(
			0,
			32
		)}... (${createTransaction.rawTransaction.length} length)`,
	});

	const createReceipt = await web3.eth.sendSignedTransaction(
		createTransaction.rawTransaction
	);
	console.log(
		`Contract deployed at address ${createReceipt.contractAddress}`
	);
	return createReceipt.contractAddress;
}

async function sendTokens(contractAddress, abi, signer, to, amount) {
	let contract = new web3.eth.Contract(abi, contractAddress);
	const encoded = contract.methods.transfer(to, amount).encodeABI();

	const transferTransaction = await signer.signTransaction(
		{
			to: contractAddress,
			data: encoded,
			value: "0x00",
			gasPrice: "0x01",
			gas: "0x1000000",
		});
	
		const transferReceipt = await web3.eth.sendSignedTransaction(
			transferTransaction.rawTransaction
		);
		console.log(
		`Transfer executed to ${transferReceipt.to} (H: ${transferReceipt.transactionHash})`
	);
	return transferReceipt;
}

async function getTokenBalance(contractAddress, abi, address) {
	let contract = new web3.eth.Contract(abi, contractAddress);
	return contract.methods.balanceOf(address).call();
}

const main = async () => {

	console.log("Generating accounts...");
	// const alice = createAccount();
	const alice = web3.eth.accounts.privateKeyToAccount('0x348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709');
	// const bob = createAccount();
	const bob = web3.eth.accounts.privateKeyToAccount('0xd7325de5c2c1cf0009fac77d3d04a9c004b038883446b065871bc3e831dcd098');

	// Step 1: Creating the contract.
	// console.log(`Alice account: ${alice.address}\n		storageKey [slot ${STORAGE_SLOT}]: ${alice.storageKey}`);
	console.log(`Alice account: ${alice.address}\n`);
	// console.log(`Bob account: ${bob.address}\n	  storageKey [slot ${STORAGE_SLOT}]: ${bob.storageKey}`);
	console.log(`Bob account: ${bob.address}\n`);
	
	/* console.log(`\nCreating contract using Eth RPC "sendTransaction" from alice`);
	const createTransaction = await alice.signTransaction(
		{
			data: ERC20_BYTECODE,
			value: "0x00",
			gasPrice: "0x00",
			gas: "0x1000000",
		});
	console.log("Transaction", {
		...createTransaction,
		rawTransaction: `${createTransaction.rawTransaction.substring(
			0,
			32
		)}... (${createTransaction.rawTransaction.length} length)`,
	});

	const createReceipt = await web3.eth.sendSignedTransaction(
		createTransaction.rawTransaction
	);
	console.log(
		`Contract deployed at address ${createReceipt.contractAddress}`
	);

	// Step 2: Sending contract tokens to bob
	console.log(`\nSending 221 Contract tokens from alice to bob`);
	const transferFnCode = `a9059cbb000000000000000000000000`;
	const tokensToTransfer = `00000000000000000000000000000000000000000000000000000000000000dd`;
	const inputCode = `0x${transferFnCode}${bob.address.substring(
		2
	)}${tokensToTransfer}`;

	const transferTransaction = await alice.signTransaction(
		{
			to: createReceipt.contractAddress,
			data: inputCode,
			value: "0x00",
			gasPrice: "0x00",
			gas: "0x100000",
		});
	console.log("Transaction", {
		...transferTransaction,
		rawTransaction: `${transferTransaction.rawTransaction.substring(
			0,
			32
		)}... (${transferTransaction.rawTransaction.length} length)`,
	});

	const transferReceipt = await web3.eth.sendSignedTransaction(
		transferTransaction.rawTransaction
	);
	console.log(
		`Transfer executed to ${transferReceipt.to} (H: ${transferReceipt.transactionHash})`
	); */

	// let tokenAddress = createReceipt.contractAddress;
	let erc20TokenAddress = '0x8cB6497CDB9D44E168C076B414e4a675ebCC8683';
	let decimals = web3.utils.toBN(18);
	let amount = web3.utils.toBN(100);
	let value = amount.mul(web3.utils.toBN(10).pow(decimals));
	console.log(`Alice will transfer ${value}`);

	let contract = new web3.eth.Contract(ERC20_ABI, erc20TokenAddress);
	
	/* // call transfer function
	contract.methods.transfer([bob.address, value], (error, txHash) => {
		// it returns tx hash because sending tx
		console.log(txHash);
	}); */

	// let txn = contract.methods.transfer(bob.address, value);
	// console.log(txn);
	
	const encoded = contract.methods.transfer(bob.address, value).encodeABI();
	// console.log(encoded);
	
	const transferTransaction1 = await alice.signTransaction(
		{
			to: erc20TokenAddress,
			data: encoded,
			value: "0x00",
			gasPrice: "0x00",
			gas: "0x100000",
		});
	
		const transferReceipt1 = await web3.eth.sendSignedTransaction(
			transferTransaction1.rawTransaction
		);
		console.log(
		`Transfer executed to ${transferReceipt1.to} (H: ${transferReceipt1.transactionHash})`
	);

	/* contract.methods.transfer(bob.address, value).send({from: alice.address}).then(function(receipt){
    console.log(receipt);
	}); */

	console.log(`Alice's balance ${(await contract.methods.balanceOf(alice.address).call())}`);
	console.log(`Bob's balance ${(await contract.methods.balanceOf(bob.address).call())}`);
};

async function main2() {
	const alice = web3.eth.accounts.privateKeyToAccount('0x348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709');
	const bob = web3.eth.accounts.privateKeyToAccount('0xd7325de5c2c1cf0009fac77d3d04a9c004b038883446b065871bc3e831dcd098');

	console.log(`Generated accounts ${alice.address}, ${bob.address}`);

	let decimals = web3.utils.toBN(18);
	let amount = web3.utils.toBN(100);
	let value = amount.mul(web3.utils.toBN(10).pow(decimals));

	const contractAddr = await deployTokenContract(alice, LinkTokenByteCode);
	// const contractAddr = '0xedc6227518e0Bdc6c1D7bB2Ca1c69e9BdB92e485';

	console.log(`Alice's balance ${(await getTokenBalance(contractAddr, LinkTokenABI, alice.address))}`);
	console.log(`Bob's balance ${(await getTokenBalance(contractAddr, LinkTokenABI, bob.address))}`);

	const receipt = await sendTokens(contractAddr, LinkTokenABI, alice, bob.address, value);
	// console.log(receipt);

	console.log(`Alice's balance ${(await getTokenBalance(contractAddr, LinkTokenABI, alice.address))}`);
	console.log(`Bob's balance ${(await getTokenBalance(contractAddr, LinkTokenABI, bob.address))}`);
}

async function main3() {
	const alice = web3.eth.accounts.privateKeyToAccount('0x348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709');
	const bob = web3.eth.accounts.privateKeyToAccount('0xd7325de5c2c1cf0009fac77d3d04a9c004b038883446b065871bc3e831dcd098');

	const dock = new DockAPI();
  	await dock.init({
    	address: FullNodeEndpoint,
  	});


	const aliceSubs = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

	// const { nonce, data: balance } = await api.query.system.account(alice.address);

	const bytes = web3.utils.hexToBytes(alice.address);
	// console.log(bytes);
	const preimage = ('evm:'.split('').map((c) => c.charCodeAt())).concat(bytes);
	// console.log(preimage);
	const addrEvm = encodeAddress(blake2AsHex(preimage));
	console.log(addrEvm);
	const keypair = dock.keyring.addFromUri('//Alice');
	const transfer = dock.api.tx.balances.transfer(addrEvm, "5005400000000");
	dock.setAccount(keypair);
	await dock.signAndSend(transfer, false);

	await dock.disconnect();

	const contractAddr = await deployTokenContract(alice, LinkTokenByteCode);
	// const contractAddr = '0x8cB6497CDB9D44E168C076B414e4a675ebCC8683';

	console.log(`Alice's balance ${(await getTokenBalance(contractAddr, LinkTokenABI, alice.address))}`);
	console.log(`Bob's balance ${(await getTokenBalance(contractAddr, LinkTokenABI, bob.address))}`);

	const receipt = await sendTokens(contractAddr, LinkTokenABI, alice, bob.address, web3.utils.toBN(5509));
	
	console.log(`Alice's balance ${(await getTokenBalance(contractAddr, LinkTokenABI, alice.address))}`);
	console.log(`Bob's balance ${(await getTokenBalance(contractAddr, LinkTokenABI, bob.address))}`);
}

async function main4() {
	const alice = web3.eth.accounts.privateKeyToAccount('0x348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709');
	const bob = web3.eth.accounts.privateKeyToAccount('0xd7325de5c2c1cf0009fac77d3d04a9c004b038883446b065871bc3e831dcd098');

	// await giveMoneyToSender(alice.address, 5000000000000)

	const oracle = new web3.eth.Contract(OracleABI);
	const oracleTx = oracle.deploy({
		data: OracleByteCode,
		arguments: ['0x8cB6497CDB9D44E168C076B414e4a675ebCC8683'],
	});

	console.log(`Gas needed is ${(await oracleTx.estimateGas())}`);

	const createTransaction = await alice.signTransaction(
		{
				data: oracleTx.encodeABI(),
				value: "0x00",
				gasPrice: "0x01",
				gas: "0x2000000",
		}
	);

	const createReceipt = await web3.eth.sendSignedTransaction(
	    createTransaction.rawTransaction
	);
	console.log(`Contract deployed at address ${createReceipt.contractAddress}`);
	
	const contractAddr = createReceipt.contractAddress;
  // const contractAddr = '0x6aa3A0e84D3D82eBdc1490C6061d70844EF20c18';

	// console.log(`Alice's balance ${(await getTokenBalance(contractAddr, LinkTokenABI, alice.address))}`);
	// console.log(`Bob's balance ${(await getTokenBalance(contractAddr, LinkTokenABI, bob.address))}`);

	let contract = new web3.eth.Contract(OracleABI, contractAddr);
	console.log((await contract.methods.getChainlinkToken().call()));
	// const receipt = await sendTokens(contractAddr, LinkTokenABI, alice, bob.address, web3.utils.toBN(5509));
	
	// console.log(`Alice's balance ${(await getTokenBalance(contractAddr, LinkTokenABI, alice.address))}`);
	// console.log(`Bob's balance ${(await getTokenBalance(contractAddr, LinkTokenABI, bob.address))}`);
}

async function main5() {
	const alice = web3.eth.accounts.privateKeyToAccount('0x348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709');
	const bob = web3.eth.accounts.privateKeyToAccount('0xd7325de5c2c1cf0009fac77d3d04a9c004b038883446b065871bc3e831dcd098');

	// await giveMoneyToSender(alice.address, "50000000000000000");

	/* const aggregator = new web3.eth.Contract(AggregatorABI);
	const aggregatorTx = aggregator.deploy({
		data: AggregatorByteCode,
		arguments: ['0x8cB6497CDB9D44E168C076B414e4a675ebCC8683', 10, 2100, '0x0000000000000000000000000000000000000000', 3, 6, 6, "Dock USD price feed"],
	}); */
	// console.log(`Gas needed is ${(await aggregatorTx.estimateGas())}`);
	// console.log(`Contract deployed at address ${aggregatorTx.options.address}`);

	/* const argsABI = web3.eth.abi.encodeParameters(['address', 'uint128', 'uint32', 'address', 'int256','int256', 'int8', 'string'], ['0x8cB6497CDB9D44E168C076B414e4a675ebCC8683', 10, 2100, '0x0000000000000000000000000000000000000000', 3, 6, 6, "Dock USD price feed"]);
	

	const createTransaction = await alice.signTransaction(
		{
				data: AggregatorByteCode + argsABI.slice(2),
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

	const contractAddr = '0xc11696c19ba6e2741Dda4d44F40625469dd9fc3D';

	let contract = new web3.eth.Contract(AggregatorABI, contractAddr);
	console.log((await contract.methods.getOracles().call()));
}

async function main6() {
	const alice = web3.eth.accounts.privateKeyToAccount('0x348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709');
	const bob = web3.eth.accounts.privateKeyToAccount('0xd7325de5c2c1cf0009fac77d3d04a9c004b038883446b065871bc3e831dcd098');

	/* const aggregator = new web3.eth.Contract(AccessControlledAggregatorABI);
	const aggregatorTx = aggregator.deploy({
		data: AccessControlledAggregatorByteCode,
		arguments: ['0x8cB6497CDB9D44E168C076B414e4a675ebCC8683', 10, 2100, '0x0000000000000000000000000000000000000000', 3, 6, 6, "Dock USD price feed"],
	});
	// console.log(`Gas needed is ${(await aggregatorTx.estimateGas())}`);
	// console.log(`Contract deployed at address ${aggregatorTx.options.address}`);

	const argsABI = web3.eth.abi.encodeParameters(['address', 'uint128', 'uint32', 'address', 'int256','int256', 'int8', 'string'], ['0x8cB6497CDB9D44E168C076B414e4a675ebCC8683', 10, 2100, '0x0000000000000000000000000000000000000000', 3, 6, 6, "Dock USD price feed"]);
	

	const createTransaction = await alice.signTransaction(
		{
				data: AggregatorByteCode + argsABI.slice(2),
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

	// const contractAddr = '0xa8F3e277740b7c40Ab684cB1b69F69159EF592f6';

	let contract = new web3.eth.Contract(AggregatorABI, contractAddr);
	console.log((await contract.methods.getOracles().call()));
}

main6().catch((err) => {
	console.log("Error", err);
});
