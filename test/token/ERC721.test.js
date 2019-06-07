const {BN, constants, expectEvent, shouldFail, ether} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const {shouldBehaveLikeERC721} = require('./ERC721.behavior');
const RendarToken = artifacts.require('RendarToken.sol');

contract('ERC721', function ([_, creator, tokenOwner, other, artistAccount, ...accounts]) {

    const tokenURI = '123abc456def987';

    beforeEach(async function () {
        this.token = await RendarToken.new({from: creator});
    });

    shouldBehaveLikeERC721(creator, creator, accounts);

    describe('internal functions', function () {
        const editionId = new BN('1000');
        const tokenId = new BN('1000');
        const editionPrice = ether('1');

        describe('mintTo(address, uint256)', function () {

            beforeEach(async function () {
                await this.token.createEdition(
                    1,
                    editionPrice,
                    50,
                    artistAccount,
                    tokenURI,
                    {from: creator}
                );
            });

            it('reverts with a null destination address', async function () {
                await shouldFail(
                    this.token.mintTo(ZERO_ADDRESS, editionId, {from: creator}), 'ERC721: mint to the zero address'
                );
            });

            context('with minted token', async function () {
                beforeEach(async function () {
                    ({logs: this.logs} = await this.token.mintTo(tokenOwner, editionId, {from: creator}));
                });

                it('emits a Transfer event', function () {
                    expectEvent.inLogs(this.logs, 'Transfer', {from: ZERO_ADDRESS, to: tokenOwner, tokenId});
                });

                it('creates the token', async function () {
                    (await this.token.balanceOf(tokenOwner)).should.be.bignumber.equal('1');
                    (await this.token.ownerOf(tokenId)).should.be.equal(tokenOwner);
                });

                it('reverts when adding a token id that already exists', async function () {
                    await shouldFail(this.token.mintTo(tokenOwner, editionId, {from: creator}), 'Edition sold out.');
                });
            });
        });

        describe('_burn(uint256)', function () {
            const editionPrice = ether('1');

            beforeEach(async function () {
                await this.token.createEdition(
                    1,
                    editionPrice,
                    50,
                    artistAccount,
                    tokenURI,
                    {from: creator}
                );
            });

            it('reverts when burning a non-existent token id', async function () {
                await shouldFail(
                    this.token.methods['burn(uint256)'](tokenId), 'Owner query for nonexistent token'
                );
            });

            context('with minted token', function () {
                beforeEach(async function () {
                    await this.token.mintTo(tokenOwner, editionId, {from: creator});
                });

                context('with burnt token', function () {
                    beforeEach(async function () {
                        ({logs: this.logs} = await this.token.methods['burn(uint256)'](tokenId, {from: tokenOwner}));
                    });

                    it('emits a Transfer event', function () {
                        expectEvent.inLogs(this.logs, 'Transfer', {from: tokenOwner, to: ZERO_ADDRESS, tokenId});
                    });

                    it('deletes the token', async function () {
                        (await this.token.balanceOf(tokenOwner)).should.be.bignumber.equal('0');
                        await shouldFail(
                            this.token.ownerOf(tokenId), 'ERC721: owner query for nonexistent token'
                        );
                    });

                    it('reverts when burning a token id that has been deleted', async function () {
                        await shouldFail(
                            this.token.methods['burn(uint256)'](tokenId), 'ERC721: owner query for nonexistent token'
                        );
                    });
                });
            });
        });
    });
});
