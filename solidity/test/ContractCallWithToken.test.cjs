// @ts-check
const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const { encodeFunctionData, encodeAbiParameters } = require('viem');

const abiCoder = new ethers.AbiCoder();

describe('CallContractWithToken', function () {
  let contract,
    owner,
    addr1,
    addr2,
    auth,
    gasServiceMock,
    gatewayMock,
    tokenDeployer,
    factoryTx,
    usdcContract,
    stakingContract;

  const expectedWalletAddress = '0x856e4424f806D16E8CBC702B3c0F2ede5468eae5';

  const sourceContract = 'agoric';
  const sourceAddress = '0x1234567890123456789012345678901234567890';

  const approveMessage = async (
    commandId,
    from,
    sourceAddress,
    targetAddress,
    payloadHash,
  ) => {
    const params = abiCoder.encode(
      ['string', 'string', 'address', 'bytes32'],
      [from, sourceAddress, targetAddress, payloadHash],
    );
    const data = ethers.getBytes(
      abiCoder.encode(
        ['uint256', 'bytes32[]', 'string[]', 'bytes[]'],
        [
          network.config.chainId,
          [commandId],
          ['approveContractCall'],
          [params],
        ],
      ),
    );
    const wallet = owner;
    const signature = await wallet.signMessage(
      ethers.getBytes(ethers.keccak256(data)),
    );
    const signData = abiCoder.encode(
      ['address[]', 'uint256[]', 'uint256', 'bytes[]'],
      [[wallet.address], [1], 1, [signature]],
    );
    const input = abiCoder.encode(['bytes', 'bytes'], [data, signData]);
    const response = await gatewayMock
      .connect(owner)
      .execute(input, { gasLimit: BigInt(8e6) });
    return response;
  };

  const approveMessageWithToken = async (
    commandId,
    from,
    sourceAddress,
    targetAddress,
    payloadHash,
    destinationTokenSymbol,
    amount,
  ) => {
    const params = abiCoder.encode(
      ['string', 'string', 'address', 'bytes32', 'string', 'uint256'],
      [
        from,
        sourceAddress,
        targetAddress,
        payloadHash,
        destinationTokenSymbol,
        amount,
      ],
    );
    const data = ethers.getBytes(
      abiCoder.encode(
        ['uint256', 'bytes32[]', 'string[]', 'bytes[]'],
        [
          network.config.chainId,
          [commandId],
          ['approveContractCallWithMint'],
          [params],
        ],
      ),
    );
    const wallet = owner;
    const signature = await wallet.signMessage(
      ethers.getBytes(ethers.keccak256(data)),
    );
    const signData = abiCoder.encode(
      ['address[]', 'uint256[]', 'uint256', 'bytes[]'],
      [[wallet.address], [1], 1, [signature]],
    );
    const input = abiCoder.encode(['bytes', 'bytes'], [data, signData]);
    const response = await gatewayMock
      .connect(owner)
      .execute(input, { gasLimit: BigInt(8e6) });
    return response;
  };

  const deployToken = async (
    commandId,
    name,
    symbol,
    decimals,
    cap,
    tokenAddress,
    mintLimit,
  ) => {
    const params = abiCoder.encode(
      ['string', 'string', 'uint8', 'uint256', 'address', 'uint256'],
      [name, symbol, decimals, cap, tokenAddress, mintLimit],
    );
    const data = ethers.getBytes(
      abiCoder.encode(
        ['uint256', 'bytes32[]', 'string[]', 'bytes[]'],
        [network.config.chainId, [commandId], ['deployToken'], [params]],
      ),
    );
    const wallet = owner;
    const signature = await wallet.signMessage(
      ethers.getBytes(ethers.keccak256(data)),
    );
    const signData = abiCoder.encode(
      ['address[]', 'uint256[]', 'uint256', 'bytes[]'],
      [[wallet.address], [1], 1, [signature]],
    );
    const input = abiCoder.encode(['bytes', 'bytes'], [data, signData]);
    const response = await gatewayMock
      .connect(owner)
      .execute(input, { gasLimit: BigInt(8e6) });
    return response;
  };

  let commandIdCounter = 1;
  const getCommandId = () => {
    const commandId = ethers.id(String(commandIdCounter));
    commandIdCounter++;
    return commandId;
  };

  function encodeVersionedPayload(version, payload) {
    const { zeroPadValue, hexlify, getBytes } = ethers;
    const versionHex = zeroPadValue(hexlify(version), 4);
    return getBytes(versionHex.concat(payload.substring(2)));
  }

  const constructContractCall = ({ target, functionSignature, args }) => {
    const [name, paramsRaw] = functionSignature.split('(');
    const params = paramsRaw.replace(')', '').split(',').filter(Boolean);

    return {
      target,
      data: encodeFunctionData({
        abi: [
          {
            type: 'function',
            name,
            inputs: params.map((type, i) => ({ type, name: `arg${i}` })),
          },
        ],
        functionName: name,
        args,
      }),
    };
  };

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Mock AxelarGasService and AxelarGateway
    const GasServiceMock = await ethers.getContractFactory('AxelarGasService');
    gasServiceMock = await GasServiceMock.deploy(owner.address);

    const TokenDeployer = await ethers.getContractFactory('TokenDeployer');
    tokenDeployer = await TokenDeployer.deploy();

    const Auth = await ethers.getContractFactory('AxelarAuthWeighted');
    auth = await Auth.deploy([
      abiCoder.encode(
        ['address[]', 'uint256[]', 'uint256'],
        [[owner.address], [1], 1],
      ),
    ]);

    const GatewayMock = await ethers.getContractFactory('AxelarGateway');
    gatewayMock = await GatewayMock.deploy(auth.target, tokenDeployer.target);

    // Deploy CallContractWithToken
    const Contract = await ethers.getContractFactory('Factory');
    contract = await Contract.deploy(
      gatewayMock.target,
      gasServiceMock.target,
      'Ethereum',
    );

    await deployToken(
      getCommandId(),
      'Universal Stablecoin',
      'USDC',
      18,
      1000000,
      '0x0000000000000000000000000000000000000000',
      1000000,
    );

    const usdcAddress = await gatewayMock.tokenAddresses('USDC');
    usdcContract = await ethers.getContractAt(
      '@axelar-network/axelar-cgp-solidity/contracts/ERC20.sol:ERC20',
      usdcAddress,
    );

    const StakingContract = await ethers.getContractFactory('StakingContract');
    stakingContract = await StakingContract.deploy(usdcAddress);

    // Creating a new wallet from the factory
    [owner, addr1, addr2] = await ethers.getSigners();
    const walletName = 'MyWallet';
    const walletOwner = addr1.address;

    // Call the Factory contract to create a new Wallet
    const commandId = getCommandId();
    const payload = abiCoder.encode(
      ['string', 'address'],
      [walletName, walletOwner],
    );
    const options = {};
    const payloadHash = ethers.keccak256(payload);
    await approveMessage(
      commandId,
      sourceContract,
      sourceAddress,
      contract.target,
      payloadHash,
    );
    factoryTx = contract.execute(
      commandId,
      sourceContract,
      sourceAddress,
      payload,
      options,
    );
  });
  const pack = (functionSignature, paramTypes, params) => {
    let utf8Encode = new TextEncoder();
    const encodedSignature = utf8Encode.encode(functionSignature);
    const functionHash = ethers.keccak256(encodedSignature).slice(2, 10);
    const encodedParams = abiCoder.encode(paramTypes, params).slice(2);

    return `0x${functionHash}${encodedParams}`;
  };

  it('should create a new Wallet object using the Factory contract', async function () {
    const expectedPayload = encodeVersionedPayload(
      '0x00',
      abiCoder.encode(['address'], [expectedWalletAddress]),
    );
    const expectedPayloadHash = ethers.keccak256(expectedPayload);

    await expect(factoryTx)
      .to.emit(contract, 'WalletCreated')
      .withArgs(expectedWalletAddress, sourceAddress);

    await expect(factoryTx)
      .to.emit(gatewayMock, 'ContractCall')
      .withArgs(
        contract.target,
        sourceContract,
        sourceAddress,
        expectedPayloadHash,
        expectedPayload,
      );
  });

  it('should not let wallet be accessed by un-authorized user', async function () {
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
        { type: 'uint256', name: 'totalCalls' },
      ],
      [abiEncodedContractCalls, abiEncodedContractCalls.length],
    );
    const options = {};
    const payloadHash = ethers.keccak256(payload);

    const unexpectedAddress = '0xNotTheCorrectAddress';

    await approveMessage(
      commandId,
      sourceContract,
      unexpectedAddress,
      walletContract.target,
      payloadHash,
    );
    const tx = walletContract.execute(
      commandId,
      sourceContract,
      unexpectedAddress,
      payload,
      options,
    );
    expect(tx).to.be.reverted;
  });

  it('should let user trigger contracts through a wallet', async function () {
    const walletContract = await ethers.getContractAt(
      'Wallet',
      expectedWalletAddress,
    );

    const abiEncodedContractCalls = [
      constructContractCall({
        target: contract.target,
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
        { type: 'uint256', name: 'totalCalls' },
      ],
      [abiEncodedContractCalls, abiEncodedContractCalls.length],
    );
    const options = {};
    const payloadHash = ethers.keccak256(payload);

    await approveMessage(
      commandId,
      sourceContract,
      sourceAddress,
      walletContract.target,
      payloadHash,
    );
    const tx = walletContract.execute(
      commandId,
      sourceContract,
      sourceAddress,
      payload,
      options,
    );

    const expectedAddress = '0xb0279Db6a2F1E01fbC8483FCCef0Be2bC6299cC3';
    await expect(tx)
      .to.emit(contract, 'WalletCreated')
      .withArgs(expectedAddress, sourceAddress);
  });

  it('should let the wallet trigger the aave mock', async function () {
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
        { type: 'uint256', name: 'totalCalls' },
      ],
      [abiEncodedContractCalls, abiEncodedContractCalls.length],
    );
    const payloadHash = ethers.keccak256(payload);

    await approveMessageWithToken(
      commandId,
      sourceContract,
      sourceAddress,
      walletContract.target,
      payloadHash,
      'USDC',
      100,
    );

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
