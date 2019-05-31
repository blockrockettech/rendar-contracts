const HDWalletProvider = require('truffle-hdwallet-provider');
const mnemonic = process.env.RENDAR_MNEMONIC;

// FIXME sign up to Infura
const INFURA_KEY = 'TODO';

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
