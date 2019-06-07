const {getAccountOne} = require('../constants');

const RendarToken = artifacts.require('./RendarToken.sol');

module.exports = async function (deployer, network, accounts) {

    // TODO replace with real Rendar account
    const rendarAccount = getAccountOne(accounts, network);

    await deployer.deploy(RendarToken, rendarAccount, {from: getAccountOne(accounts, network)});
};
