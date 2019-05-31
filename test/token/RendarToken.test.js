const {BN, constants, expectEvent, shouldFail} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const RendarToken = artifacts.require('RendarToken.sol');

contract('ERC721', function ([_, creator, tokenOwnerOne, tokenOwnerTwo, artistAccountOne, artistAccountTwo, ...accounts]) {

    const tokenURI = '123abc456def987';

    beforeEach(async function () {
        this.token = await RendarToken.new({from: creator});
    });

    describe('creating editions', async function () {

        const editionId = new BN('100');
        const editionSize = new BN('10');
        const commission = new BN('10');

        const tokenIdOne = new BN('101');
        const tokenIdTwo = new BN('102');

        beforeEach(async function () {

        });

        describe('can create an edition', async function () {

            beforeEach(async function () {
                await this.token.createEdition(
                    editionId,
                    editionSize,
                    commission,
                    artistAccountOne,
                    tokenURI,
                    {from: creator}
                );
            });

            it('totalRemaining()', async function () {
                const totalRemaining = await this.token.totalRemaining(editionId);
                totalRemaining.should.be.bignumber.equal('10');
            });

            it('editionTokenUri()', async function () {
                const editionTokenUri = await this.token.editionTokenUri(editionId);
                editionTokenUri.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
            });

            it('highestEditionNumber()', async function () {
                const highestEditionNumber = await this.token.highestEditionNumber();
                highestEditionNumber.should.be.bignumber.equal(editionId);
            });

            it('totalTokensMinted()', async function () {
                const totalTokensMinted = await this.token.totalTokensMinted();
                totalTokensMinted.should.be.bignumber.equal('0');
            });

            it('editionSize()', async function () {
                const editionSize = await this.token.editionSize(editionId);
                editionSize.should.be.bignumber.equal(editionSize);
            });

            it('editionSupply()', async function () {
                const editionSupply = await this.token.editionSupply(editionId);
                editionSupply.should.be.bignumber.equal('0');
            });

            it('artistCommission()', async function () {
                const artistCommission = await this.token.artistCommission(editionId);
                artistCommission.should.be.bignumber.equal(commission);
            });

            it('artistAccount()', async function () {
                const artistAccount = await this.token.artistAccount(editionId);
                artistAccount.should.be.equal(artistAccountOne);
            });

            it('active()', async function () {
                const active = await this.token.active(editionId);
                active.should.be.equal(true);
            });

            it('editionDetails()', async function () {
                const {
                    _editionSize,
                    _editionSupply,
                    _artistCommission,
                    _artistAccount,
                    _active,
                    _tokenURI
                } = await this.token.editionDetails(editionId);
                _editionSize.should.be.bignumber.equal(editionSize);
                _editionSupply.should.be.bignumber.equal('0');
                _artistCommission.should.be.bignumber.equal(commission);
                _artistAccount.should.be.equal(artistAccountOne);
                _tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
                _active.should.be.equal(true);
            });

        });

        describe('can create tokens from editions', async function () {

            beforeEach(async function () {
                await this.token.createEdition(
                    editionId,
                    editionSize,
                    commission,
                    artistAccountOne,
                    tokenURI,
                    {from: creator}
                );
            });

            beforeEach(async function () {
                await this.token.mintTo(tokenOwnerOne, editionId, {from: creator});
                await this.token.mintTo(tokenOwnerTwo, editionId, {from: creator});
            });

            it('totalTokensMinted()', async function () {
                const totalTokensMinted = await this.token.totalTokensMinted();
                totalTokensMinted.should.be.bignumber.equal('2');
            });

            it('totalRemaining()', async function () {
                const totalRemaining = await this.token.totalRemaining(editionId);
                totalRemaining.should.be.bignumber.equal('8');
            });

            it('editionDetails()', async function () {
                const {
                    _editionSize,
                    _editionSupply,
                    _artistCommission,
                    _artistAccount,
                    _active,
                    _tokenURI
                } = await this.token.editionDetails(editionId);
                _editionSize.should.be.bignumber.equal(editionSize);
                _editionSupply.should.be.bignumber.equal('2');
                _artistCommission.should.be.bignumber.equal(commission);
                _artistAccount.should.be.equal(artistAccountOne);
                _tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
                _active.should.be.equal(true);
            });

            it('token 1 details', async function () {
                const {
                    _editionId,
                    _editionSize,
                    _editionSupply,
                    _artistAccount,
                    _owner,
                    _tokenURI
                } = await this.token.tokenDetails(tokenIdOne);

                _editionId.should.be.bignumber.equal(_editionId);
                _editionSize.should.be.bignumber.equal(editionSize);
                _editionSupply.should.be.bignumber.equal('2');
                _artistAccount.should.be.equal(artistAccountOne);
                _owner.should.be.equal(tokenOwnerOne);
                _tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
            });

            it('token 2 details', async function () {
                const {
                    _editionId,
                    _editionSize,
                    _editionSupply,
                    _artistAccount,
                    _owner,
                    _tokenURI
                } = await this.token.tokenDetails(tokenIdTwo);

                _editionId.should.be.bignumber.equal(_editionId);
                _editionSize.should.be.bignumber.equal(editionSize);
                _editionSupply.should.be.bignumber.equal('2');
                _artistAccount.should.be.equal(artistAccountOne);
                _owner.should.be.equal(tokenOwnerTwo);
                _tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
            });

            it('will exhaust the rest of the tokens in the edition', async function () {

                // Mint 8 more tokens
                for (let i = 0; i < 8; i++) {
                    await this.token.mintTo(tokenOwnerTwo, editionId, {from: creator});
                }

                const totalRemaining = await this.token.totalRemaining(editionId);
                totalRemaining.should.be.bignumber.equal('0');

                // Check edition sells out
                await shouldFail(
                    this.token.mintTo(tokenOwnerTwo, editionId, {from: creator}), 'Edition sold out'
                );

                const {
                    _editionSize,
                    _editionSupply,
                    _artistCommission,
                    _artistAccount,
                    _active,
                    _tokenURI
                } = await this.token.editionDetails(editionId);
                _editionSize.should.be.bignumber.equal(editionSize);
                _editionSupply.should.be.bignumber.equal('10');
                _artistCommission.should.be.bignumber.equal(commission);
                _artistAccount.should.be.equal(artistAccountOne);
                _tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
                _active.should.be.equal(true);
            });

        });

        describe('validation', async function () {

            it('cant create edition of the same ID', async function () {

            });

            it('cant create edition of ID zero', async function () {

            });

            it('cant create edition with size of zero', async function () {

            });

            it('cant create edition which overlaps a previous one', async function () {

            });

            it('cant create edition with no artist address', async function () {

            });

            it('cant create edition with no artist commission less than zero', async function () {

            });

            it('cant create edition with no artist commission more than 100', async function () {

            });

        });

        describe('edition controls', async function () {

            it('can disable editions', async function () {

            });

            it('can enable editions', async function () {

            });

            it('can update artist account', async function () {

            });

            it('can update artist account', async function () {

            });

            it('can update artist commission', async function () {

            });

            it('can update token URI', async function () {

            });

        });

        describe('edition controls', async function () {

            it('can update base URI', async function () {

            });

        });

    });
});
