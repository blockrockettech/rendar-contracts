const {getAccountOne} = require('../constants');

const RendarToken = artifacts.require('./RendarToken.sol');

module.exports = async function (deployer, network, accounts) {
    const renderToken = await RendarToken.deployed();

    // BlockRocket Accounts
    await renderToken.addWhitelisted("0x04AeC888Fa635c54661581d7bb2CF337c2f1f98F", {from: getAccountOne(accounts, network)});

    // Marks Ledger
    await renderToken.addWhitelisted("0xC173b11Ec24885f404Ba400b6a042e02FfC57632", {from: getAccountOne(accounts, network)});

    // Marks Metamask
    await renderToken.addWhitelisted("0x712662f85975D6C4c5Ac66ef78503eB912186362", {from: getAccountOne(accounts, network)});

};
