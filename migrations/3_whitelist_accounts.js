const {getAccountOne} = require('../constants');

const RendarToken = artifacts.require('./RendarToken.sol');

module.exports = async function (deployer, network, accounts) {
    const renderToken = await RendarToken.deployed();

    // BlockRocket Accounts
    await renderToken.addWhitelisted("0x04AeC888Fa635c54661581d7bb2CF337c2f1f98F", {from: getAccountOne(accounts, network)});

    // Marks Account
    await renderToken.addWhitelisted("0x4FF3Eb0a7f68D6eB80fCf5039032ec927131eF2e", {from: getAccountOne(accounts, network)});

    // Marks Account
    await renderToken.addWhitelistAdmin("0x4FF3Eb0a7f68D6eB80fCf5039032ec927131eF2e", {from: getAccountOne(accounts, network)});

};
