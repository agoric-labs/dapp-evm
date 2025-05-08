import { expect } from 'chai';
import { ethers } from 'hardhat';
import { encodeAbiParameters, keccak256, toBytes, stringToHex } from 'viem';
import {
  approveMessage,
  approveMessageWithToken,
  deployToken,
  constructContractCall,
} from './utils';

describe('CallContractWithToken', () => {
  let owner,
    addr1,
    factoryContract,
    axelarGatewayMock,
    usdcContract,
    stakingContract,
    factoryTx;

  const abiCoder = new ethers.AbiCoder();
  const expectedWalletAddress = '0x856e4424f806D16E8CBC702B3c0F2ede5468eae5';

  const sourceContract = 'agoric';
  const sourceAddress = '0x1234567890123456789012345678901234567890';

  let commandIdCounter = 1;
  const getCommandId = () => {
    const commandId = keccak256(stringToHex(String(commandIdCounter)));
    commandIdCounter++;
    return commandId;
  };

  before(async () => {
    [owner, addr1] = await ethers.getSigners();

    // Mock AxelarGasService and AxelarGateway
    const GasServiceFactory =
      await ethers.getContractFactory('AxelarGasService');
    const axelarGasServiceMock = await GasServiceFactory.deploy(owner.address);

    const TokenDeployerFactory =
      await ethers.getContractFactory('TokenDeployer');
    const tokenDeployer = await TokenDeployerFactory.deploy();

    const AuthFactory = await ethers.getContractFactory('AxelarAuthWeighted');
    const authContract = await AuthFactory.deploy([
      abiCoder.encode(
        ['address[]', 'uint256[]', 'uint256'],
        [[owner.address], [1], 1],
      ),
    ]);

    const AxelarGatewayFactory =
      await ethers.getContractFactory('AxelarGateway');
    axelarGatewayMock = await AxelarGatewayFactory.deploy(
      authContract.target,
      tokenDeployer.target,
    );

    const Contract = await ethers.getContractFactory('Factory');
    factoryContract = await Contract.deploy(
      axelarGatewayMock.target,
      axelarGasServiceMock.target,
      'Ethereum',
    );

    await deployToken({
      commandId: getCommandId(),
      name: 'Universal Stablecoin',
      symbol: 'USDC',
      decimals: 18,
      cap: 1000000,
      tokenAddress: '0x0000000000000000000000000000000000000000',
      mintLimit: 1000000,
      owner,
      AxelarGateway: axelarGatewayMock,
      abiCoder,
    });

    const usdcAddress = await axelarGatewayMock.tokenAddresses('USDC');
    usdcContract = await ethers.getContractAt(
      '@axelar-network/axelar-cgp-solidity/contracts/ERC20.sol:ERC20',
      usdcAddress,
    );

    const StakingContract = await ethers.getContractFactory('StakingContract');
    stakingContract = await StakingContract.deploy(usdcAddress);

    // Creating a new wallet from the factory
    [owner, addr1] = await ethers.getSigners();
    const walletName = 'MyWallet';
    const walletOwner = addr1.address;

    // Call the Factory contract to create a new Wallet
    const commandId = getCommandId();
    const payload = abiCoder.encode(
      ['string', 'address'],
      [walletName, walletOwner],
    );
    const options = {};
    const payloadHash = keccak256(toBytes(payload));
    await approveMessage({
      commandId,
      from: sourceContract,
      sourceAddress,
      targetAddress: factoryContract.target,
      payload: payloadHash,
      owner,
      AxelarGateway: axelarGatewayMock,
      abiCoder,
    });
    factoryTx = factoryContract.execute(
      commandId,
      sourceContract,
      sourceAddress,
      payload,
      options,
    );
  });

  it('should create a new Wallet object using the Factory contract', async () => {
    const encodedAddress = abiCoder.encode(
      ['address'],
      [expectedWalletAddress],
    );

    const agoricResponseEncoded = abiCoder.encode(
      ['tuple(bool processed, tuple(bool success, bytes data)[] results)'],
      [
        {
          processed: false,
          results: [
            {
              success: true,
              data: encodedAddress,
            },
          ],
        },
      ],
    );

    const expectedPayload = ethers.solidityPacked(
      ['bytes4', 'bytes'],
      ['0x00000000', agoricResponseEncoded],
    );

    const expectedPayloadHash = keccak256(toBytes(expectedPayload));

    await expect(factoryTx)
      .to.emit(factoryContract, 'WalletCreated')
      .withArgs(expectedWalletAddress, sourceAddress);

    await expect(factoryTx)
      .to.emit(axelarGatewayMock, 'ContractCall')
      .withArgs(
        factoryContract.target,
        sourceContract,
        sourceAddress,
        expectedPayloadHash,
        expectedPayload,
      );
  });

  it('should not let wallet be accessed by un-authorized user', async () => {
    const walletContract = await ethers.getContractAt(
      'Wallet',
      expectedWalletAddress,
    );

    const abiEncodedContractCalls = [
      constructContractCall({
        target: '0x1234567890123456789012345678901234567890',
        functionSignature: 'createVendor(string)',
        args: ['ownerAddress'],
      }),
    ];

    // Call the Factory contract to create a new Wallet
    const commandId = getCommandId();
    const payload = encodeAbiParameters(
      [
        {
          type: 'tuple[]',
          name: 'calls',
          components: [
            { name: 'target', type: 'address' },
            { name: 'data', type: 'bytes' },
          ],
        },
      ],
      [abiEncodedContractCalls],
    );
    const options = {};
    const payloadHash = keccak256(payload);

    const unexpectedAddress = '0xNotTheCorrectAddress';

    await approveMessage({
      commandId,
      from: sourceContract,
      sourceAddress: unexpectedAddress,
      targetAddress: walletContract.target,
      payload: payloadHash,
      owner,
      AxelarGateway: axelarGatewayMock,
      abiCoder,
    });
    const tx = walletContract.execute(
      commandId,
      sourceContract,
      unexpectedAddress,
      payload,
      options,
    );
    expect(tx).to.be.reverted;
  });

  it('should let user trigger contracts through a wallet', async () => {
    const walletContract = await ethers.getContractAt(
      'Wallet',
      expectedWalletAddress,
    );

    const abiEncodedContractCalls = [
      constructContractCall({
        target: factoryContract.target,
        functionSignature: 'createVendor(string)',
        args: [sourceAddress],
      }),
    ];

    // Call the Factory contract to create a new Wallet
    const commandId = getCommandId();
    const payload = encodeAbiParameters(
      [
        {
          type: 'tuple[]',
          name: 'calls',
          components: [
            { name: 'target', type: 'address' },
            { name: 'data', type: 'bytes' },
          ],
        },
      ],
      [abiEncodedContractCalls],
    );
    const options = {};
    const payloadHash = keccak256(payload);

    await approveMessage({
      commandId,
      from: sourceContract,
      sourceAddress,
      targetAddress: walletContract.target,
      payload: payloadHash,
      owner,
      AxelarGateway: axelarGatewayMock,
      abiCoder,
    });
    const tx = walletContract.execute(
      commandId,
      sourceContract,
      sourceAddress,
      payload,
      options,
    );

    const expectedAddress = '0xb0279Db6a2F1E01fbC8483FCCef0Be2bC6299cC3';
    await expect(tx)
      .to.emit(factoryContract, 'WalletCreated')
      .withArgs(expectedAddress, sourceAddress);
  });

  it('should let the wallet trigger the aave mock', async () => {
    const walletContract = await ethers.getContractAt(
      'Wallet',
      expectedWalletAddress,
    );

    // Call the Factory contract to create a new Wallet
    const commandId = getCommandId();
    const options = {};

    const abiEncodedContractCalls = [
      constructContractCall({
        target: usdcContract.target,
        functionSignature: 'approve(address,uint256)',
        args: [stakingContract.target, 100],
      }),
      constructContractCall({
        target: stakingContract.target,
        functionSignature: 'stake(uint256)',
        args: [100],
      }),
    ];

    const payload = encodeAbiParameters(
      [
        {
          type: 'tuple[]',
          name: 'calls',
          components: [
            { name: 'target', type: 'address' },
            { name: 'data', type: 'bytes' },
          ],
        },
      ],
      [abiEncodedContractCalls],
    );
    const payloadHash = keccak256(payload);

    await approveMessageWithToken({
      commandId,
      from: sourceContract,
      sourceAddress,
      targetAddress: walletContract.target,
      payload: payloadHash,
      destinationTokenSymbol: 'USDC',
      amount: 100,
      owner,
      AxelarGateway: axelarGatewayMock,
      abiCoder,
    });

    const initialStakeTokenInWallet = await stakingContract.balanceOf(
      expectedWalletAddress,
    );
    const initialUsdcInWallet = await usdcContract.balanceOf(
      expectedWalletAddress,
    );
    const initialStakeTokenInStaker = await stakingContract.balanceOf(
      stakingContract.target,
    );
    const initialUsdcInStaker = await usdcContract.balanceOf(
      stakingContract.target,
    );

    expect(initialStakeTokenInWallet.toString()).to.equal('0');
    expect(initialUsdcInWallet.toString()).to.equal('0');
    expect(initialStakeTokenInStaker.toString()).to.equal('0');
    expect(initialUsdcInStaker.toString()).to.equal('0');

    const tx = walletContract.executeWithToken(
      commandId,
      sourceContract,
      sourceAddress,
      payload,
      'USDC',
      100,
      options,
    );
    await tx;

    const finalStakeTokenInWallet = await stakingContract.balanceOf(
      expectedWalletAddress,
    );
    const finalUsdcInWallet = await usdcContract.balanceOf(
      expectedWalletAddress,
    );
    const finalStakeTokenInStaker = await stakingContract.balanceOf(
      stakingContract.target,
    );
    const finalUsdcInStaker = await usdcContract.balanceOf(
      stakingContract.target,
    );
    expect(finalStakeTokenInWallet.toString()).to.equal('100');
    expect(finalUsdcInWallet.toString()).to.equal('0');
    expect(finalStakeTokenInStaker.toString()).to.equal('0');
    expect(finalUsdcInStaker.toString()).to.equal('100');
  });
});
