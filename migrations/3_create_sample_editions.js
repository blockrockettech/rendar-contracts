const {getAccountOne} = require('../constants');

const RendarToken = artifacts.require('./RendarToken.sol');

module.exports = async function (deployer, network, accounts) {
    const renderToken = await RendarToken.deployed();

    await renderToken.createEdition(
        100,
        10000000,
        50,
        '0x0f48669B1681D41357EAc232F516B77D0c10F0F1',
        "QmVu6T3hWFMvs7qeJPado1Z3JeDaBGNv4NBr26GmBsR1xa",
        {from: getAccountOne(accounts, network)}
    );

    await renderToken.createEdition(
        100,
        10000000,
        50,
        '0x0f48669B1681D41357EAc232F516B77D0c10F0F1',
        "QmerPHDJFxj76YgvW6sNvABSq4AHQMMnZY5gsFTCYjrban",
        {from: getAccountOne(accounts, network)}
    );

};
