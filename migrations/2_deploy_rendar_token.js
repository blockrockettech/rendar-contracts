const {getAccountOne} = require('../constants');

const RendarToken = artifacts.require('./RendarToken.sol');

module.exports = async function (deployer, network, accounts) {

    // TODO replace with real Rendar account
    const rendarAccount = '0x960078cd5b720c8e449629f37cb78f0b552b008b';

    await deployer.deploy(RendarToken, rendarAccount, {from: getAccountOne(accounts, network)});
};
