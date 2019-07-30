const {getAccountOne} = require('../constants');

const RendarToken = artifacts.require('./RendarToken.sol');

module.exports = async function (deployer, network, accounts) {

    const rendarAccount = '0x4FF3Eb0a7f68D6eB80fCf5039032ec927131eF2e';

    await deployer.deploy(RendarToken, rendarAccount, {from: getAccountOne(accounts, network)});
};
