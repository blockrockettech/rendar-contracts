const {getAccountOne} = require('../constants');

const RendarToken = artifacts.require('./RendarToken.sol');

module.exports = async function (deployer, network, accounts) {
    await deployer.deploy(RendarToken, {from: getAccountOne(accounts, network)});
};
