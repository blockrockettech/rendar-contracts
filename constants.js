const HDWalletProvider = require('truffle-hdwallet-provider');
const mnemonic = process.env.RENDAR_MNEMONIC;

const INFURA_KEY = '5e5f1bf73235421ab0669341615bad11';

module.exports = {
    INFURA_KEY: INFURA_KEY,
    MNEMONIC: mnemonic,
    getAccountOne: (accounts, network) => {
        let _owner = accounts[0];
        if (network === 'ropsten' || network === 'rinkeby') {
            _owner = new HDWalletProvider(mnemonic, `https://${network}.infura.io/v3/${INFURA_KEY}`, 0).getAddress();
        }
        console.log(`Using account [${_owner}] for network [${network}]`);
        return _owner;
    }
};
