const {BN, constants, expectEvent, shouldFail} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const RendarToken = artifacts.require('RendarToken.sol');

contract('Rendar Token Tests', function ([_, creator, tokenOwnerOne, tokenOwnerTwo, artistAccountOne, artistAccountTwo, ...accounts]) {

    const tokenURI = '123abc456def987';

    beforeEach(async function () {
        this.token = await RendarToken.new({from: creator});
    });

    describe('name() and symbol()', async function () {
        it('name()', async function () {
            const name = await this.token.name();
            name.should.be.equal('RendarToken');
        });
        it('symbol()', async function () {
            const symbol = await this.token.symbol();
            symbol.should.be.equal('RNDR');
        });
    });

    describe('creating editions', async function () {

        const editionOneId = new BN('1000');
        const editionSize = new BN('10');
        const commission = new BN('10');

        const tokenIdOne = new BN('1000');
        const tokenIdTwo = new BN('1001');

        describe('can create an edition', async function () {

            beforeEach(async function () {
                await this.token.createEdition(
                    editionSize,
                    commission,
                    artistAccountOne,
                    tokenURI,
                    {from: creator}
                );
            });

            it('totalRemaining()', async function () {
                const totalRemaining = await this.token.totalRemaining(editionOneId);
                totalRemaining.should.be.bignumber.equal('10');
            });

            it('editionTokenUri()', async function () {
                const editionTokenUri = await this.token.editionTokenUri(editionOneId);
                editionTokenUri.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
            });

            it('highestEditionNumber()', async function () {
                const highestEditionNumber = await this.token.highestEditionNumber();
                highestEditionNumber.should.be.bignumber.equal(editionOneId);
            });

            it('totalTokensMinted()', async function () {
                const totalTokensMinted = await this.token.totalTokensMinted();
                totalTokensMinted.should.be.bignumber.equal('0');
            });

            it('editionSize()', async function () {
                const editionSize = await this.token.editionSize(editionOneId);
                editionSize.should.be.bignumber.equal(editionSize);
            });

            it('editionSupply()', async function () {
                const editionSupply = await this.token.editionSupply(editionOneId);
                editionSupply.should.be.bignumber.equal('0');
            });

            it('artistCommission()', async function () {
                const artistCommission = await this.token.artistCommission(editionOneId);
                artistCommission.should.be.bignumber.equal(commission);
            });

            it('artistAccount()', async function () {
                const artistAccount = await this.token.artistAccount(editionOneId);
                artistAccount.should.be.equal(artistAccountOne);
            });

            it('active()', async function () {
                const active = await this.token.active(editionOneId);
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
                } = await this.token.editionDetails(editionOneId);
                _editionSize.should.be.bignumber.equal(editionSize);
                _editionSupply.should.be.bignumber.equal('0');
                _artistCommission.should.be.bignumber.equal(commission);
                _artistAccount.should.be.equal(artistAccountOne);
                _tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
                _active.should.be.equal(true);
            });

        });

        describe('can create multiple editions', async function () {

            const editionSize = new BN('100');
            const commission = new BN('10');

            const editionTwoId = new BN('2000');
            const editionTwoTokenIdOne = new BN('2000');

            beforeEach(async function () {
                await this.token.createEdition(
                    editionSize,
                    commission,
                    artistAccountOne,
                    tokenURI,
                    {from: creator}
                );

                await this.token.createEdition(
                    editionSize,
                    commission,
                    artistAccountOne,
                    tokenURI,
                    {from: creator}
                );
            });

            describe(`Edition (${editionOneId})`, async function () {

                beforeEach(async function () {
                    await this.token.mintTo(tokenOwnerTwo, editionOneId, {from: creator});
                });

                it(`editionDetails(${editionOneId})`, async function () {
                    const {
                        _editionSize,
                        _editionSupply,
                        _artistCommission,
                        _artistAccount,
                        _active,
                        _tokenURI
                    } = await this.token.editionDetails(editionOneId);
                    _editionSize.should.be.bignumber.equal(editionSize);
                    _editionSupply.should.be.bignumber.equal('1');
                    _artistCommission.should.be.bignumber.equal(commission);
                    _artistAccount.should.be.equal(artistAccountOne);
                    _tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
                    _active.should.be.equal(true);
                });

                it('buying a token', async function () {
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
                    _editionSupply.should.be.bignumber.equal('1');
                    _artistAccount.should.be.equal(artistAccountOne);
                    _owner.should.be.equal(tokenOwnerTwo);
                    _tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
                });

                it('totalTokensMinted()', async function () {
                    const totalTokensMinted = await this.token.totalTokensMinted();
                    totalTokensMinted.should.be.bignumber.equal('1');
                });

                it('totalRemaining()', async function () {
                    const totalRemaining = await this.token.totalRemaining(editionOneId);
                    totalRemaining.should.be.bignumber.equal(editionSize.sub(new BN('1')));
                });
            });

            describe(`Edition (${editionTwoId})`, async function () {

                beforeEach(async function () {
                    await this.token.mintTo(tokenOwnerTwo, editionTwoId, {from: creator});
                    await this.token.mintTo(tokenOwnerTwo, editionTwoId, {from: creator});
                });

                it(`editionDetails(${editionTwoId})`, async function () {
                    const {
                        _editionSize,
                        _editionSupply,
                        _artistCommission,
                        _artistAccount,
                        _active,
                        _tokenURI
                    } = await this.token.editionDetails(editionTwoId);
                    _editionSize.should.be.bignumber.equal(editionSize);
                    _editionSupply.should.be.bignumber.equal('2');
                    _artistCommission.should.be.bignumber.equal(commission);
                    _artistAccount.should.be.equal(artistAccountOne);
                    _tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
                    _active.should.be.equal(true);
                });

                it('buying a token', async function () {
                    const {
                        _editionId,
                        _editionSize,
                        _editionSupply,
                        _artistAccount,
                        _owner,
                        _tokenURI
                    } = await this.token.tokenDetails(editionTwoId);

                    _editionId.should.be.bignumber.equal(editionTwoTokenIdOne);
                    _editionSize.should.be.bignumber.equal(editionSize);
                    _editionSupply.should.be.bignumber.equal('2');
                    _artistAccount.should.be.equal(artistAccountOne);
                    _owner.should.be.equal(tokenOwnerTwo);
                    _tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
                });

                it('totalTokensMinted()', async function () {
                    const totalTokensMinted = await this.token.totalTokensMinted();
                    totalTokensMinted.should.be.bignumber.equal('2');
                });

                it('totalRemaining()', async function () {
                    const totalRemaining = await this.token.totalRemaining(editionTwoId);
                    totalRemaining.should.be.bignumber.equal(editionSize.sub(new BN('2')));
                });
            });

        });

        describe('can create tokens from editions', async function () {

            beforeEach(async function () {
                await this.token.createEdition(
                    editionSize,
                    commission,
                    artistAccountOne,
                    tokenURI,
                    {from: creator}
                );
            });

            beforeEach(async function () {
                await this.token.mintTo(tokenOwnerOne, editionOneId, {from: creator});
                await this.token.mintTo(tokenOwnerTwo, editionOneId, {from: creator});
            });

            it('totalTokensMinted()', async function () {
                const totalTokensMinted = await this.token.totalTokensMinted();
                totalTokensMinted.should.be.bignumber.equal('2');
            });

            it('totalRemaining()', async function () {
                const totalRemaining = await this.token.totalRemaining(editionOneId);
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
                } = await this.token.editionDetails(editionOneId);
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
                    await this.token.mintTo(tokenOwnerTwo, editionOneId, {from: creator});
                }

                const totalRemaining = await this.token.totalRemaining(editionOneId);
                totalRemaining.should.be.bignumber.equal('0');

                // Check edition sells out
                await shouldFail(
                    this.token.mintTo(tokenOwnerTwo, editionOneId, {from: creator}), 'Edition sold out'
                );

                const {
                    _editionSize,
                    _editionSupply,
                    _artistCommission,
                    _artistAccount,
                    _active,
                    _tokenURI
                } = await this.token.editionDetails(editionOneId);
                _editionSize.should.be.bignumber.equal(editionSize);
                _editionSupply.should.be.bignumber.equal('10');
                _artistCommission.should.be.bignumber.equal(commission);
                _artistAccount.should.be.equal(artistAccountOne);
                _tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
                _active.should.be.equal(true);
            });

        });

        describe('validation', async function () {

            it('cant create edition with size of zero', async function () {
                await shouldFail.reverting.withMessage(
                    this.token.createEdition(
                        0,
                        commission,
                        artistAccountOne,
                        tokenURI,
                        {from: creator}
                    ),
                    'Edition size invalid'
                );
            });

            it('cant create edition size of more than the step', async function () {
                await shouldFail.reverting.withMessage(
                    this.token.createEdition(
                        new BN('1001'),
                        commission,
                        artistAccountOne,
                        tokenURI,
                        {from: creator}
                    ),
                    'Edition size invalid'
                );
            });

            it('cant create edition with no artist address', async function () {
                await shouldFail.reverting.withMessage(
                    this.token.createEdition(
                        new BN('10'),
                        commission,
                        ZERO_ADDRESS,
                        tokenURI,
                        {from: creator}
                    ),
                    'Artist account missing'
                );
            });

            it('cant create edition with no artist commission less than zero', async function () {
                await shouldFail.reverting.withMessage(
                    this.token.createEdition(
                        new BN('10'),
                        new BN('-1'),
                        artistAccountOne,
                        tokenURI,
                        {from: creator}
                    ),
                    'Artist commission invalid'
                );
            });

            it('cant create edition with no artist commission more than 100', async function () {
                await shouldFail.reverting.withMessage(
                    this.token.createEdition(
                        new BN('10'),
                        new BN('101'),
                        artistAccountOne,
                        tokenURI,
                        {from: creator}
                    ),
                    'Artist commission invalid'
                );
            });

            it('cant create edition with missing token URI', async function () {
                await shouldFail.reverting.withMessage(
                    this.token.createEdition(
                        new BN('10'),
                        new BN('10'),
                        artistAccountOne,
                        '',
                        {from: creator}
                    ),
                    'Token URI invalid'
                );
            });

        });

        describe('edition controls', async function () {

            beforeEach(async function () {
                await this.token.createEdition(
                    editionSize,
                    commission,
                    artistAccountOne,
                    tokenURI,
                    {from: creator}
                );
            });

            it('can disable then enable editions', async function () {
                let isActive = await this.token.active(editionOneId);
                isActive.should.be.equal(true);

                await this.token.disableEdition(editionOneId, {from: creator});

                isActive = await this.token.active(editionOneId);
                isActive.should.be.equal(false);

                await this.token.enableEdition(editionOneId, {from: creator});

                isActive = await this.token.active(editionOneId);
                isActive.should.be.equal(true);
            });

            it('can update artist account', async function () {
                let artistAccount = await this.token.artistAccount(editionOneId);
                artistAccount.should.be.equal(artistAccountOne);

                await this.token.updateArtistAccount(editionOneId, artistAccountTwo, {from: creator});

                artistAccount = await this.token.artistAccount(editionOneId);
                artistAccount.should.be.equal(artistAccountTwo);
            });

            it('can update artist commission', async function () {
                let artistCommission = await this.token.artistCommission(editionOneId);
                artistCommission.should.be.bignumber.equal(commission);

                await this.token.updateArtistCommission(editionOneId, new BN('23'), {from: creator});

                artistCommission = await this.token.artistCommission(editionOneId);
                artistCommission.should.be.bignumber.equal(new BN('23'));
            });

            it('can update edition token URI', async function () {
                let tokenURI = await this.token.editionTokenUri(editionOneId);
                tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');

                await this.token.updateEditionTokenUri(editionOneId, 'aaaaaaaaaa', {from: creator});

                tokenURI = await this.token.editionTokenUri(editionOneId);
                tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/aaaaaaaaaa');
            });

            it('can update base URI', async function () {
                let tokenURI = await this.token.editionTokenUri(editionOneId);
                tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');

                await this.token.updateTokenBaseURI('https://new.ipfs.infura.io/', {from: creator});

                tokenURI = await this.token.editionTokenUri(editionOneId);
                tokenURI.should.be.equal('https://new.ipfs.infura.io/123abc456def987');
            });

            it('cannot update base URI with empty value', async function () {
                await shouldFail.reverting.withMessage(
                    this.token.updateTokenBaseURI('', {from: creator}),
                    'Base URI invalid'
                );
            });

        });

    });

    describe('purchasing editions', async function () {

        const editionId = new BN('1000');
        const editionSize = new BN('5');

        beforeEach(async function () {
            await this.token.createEdition(
                editionSize,
                new BN('10'),
                artistAccountOne,
                tokenURI,
                {from: creator}
            );
        });

        it('can only purchase when edition is active', async function () {
            const {logs} = await this.token.mintTo(tokenOwnerOne, editionId, {from: creator});
            expectEvent.inLogs(logs, 'Transfer', {
                from: ZERO_ADDRESS,
                to: tokenOwnerOne,
                tokenId: new BN('1000')
            });

            await this.token.disableEdition(editionId, {from: creator});

            await shouldFail.reverting.withMessage(
                this.token.mintTo(tokenOwnerOne, editionId, {from: creator}),
                'Edition disabled'
            );

            await this.token.enableEdition(editionId, {from: creator});

            const {logs: newLogs} = await this.token.mintTo(tokenOwnerOne, editionId, {from: creator});
            expectEvent.inLogs(newLogs, 'Transfer', {
                from: ZERO_ADDRESS,
                to: tokenOwnerOne,
                tokenId: new BN('1001')
            });
        });

        it('can only mint with valid edition ID', async function () {
            await shouldFail.reverting.withMessage(
                this.token.mintTo(tokenOwnerOne, new BN('99999'), {from: creator}),
                'Edition ID invalid'
            );
        });

        describe('once tokens have been purchased', async function () {

            it('can only mint when edition isn\'t sold out', async function () {
                for (let i = 0; i < 5;) {
                    const {logs} = await this.token.mintTo(tokenOwnerOne, editionId, {from: creator});
                    expectEvent.inLogs(logs, 'Transfer', {
                        from: ZERO_ADDRESS,
                        to: tokenOwnerOne,
                        tokenId: editionId.add(new BN(i))
                    });
                    i++;
                }

                await shouldFail.reverting.withMessage(
                    this.token.mintTo(tokenOwnerOne, editionId, {from: creator}),
                    'Edition sold out'
                );
            });

            it('can mint() to caller', async function () {
                const {logs} = await this.token.mint(editionId, {from: creator});
                expectEvent.inLogs(logs, 'Transfer', {
                    from: ZERO_ADDRESS,
                    to: creator,
                    tokenId: new BN('1000')
                });
            });

            it('can generate tokenURI() for token', async function () {
                await this.token.mint(editionId, {from: creator});
                const tokenURI = await this.token.tokenURI(new BN('1000'));
                tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123abc456def987');
            });

            it('fails to get tokenDetails() when token does not exists', async function () {
                await shouldFail.reverting.withMessage(
                    this.token.tokenDetails(new BN('9999'), {from: creator}),
                    'Token ID does not exist'
                );
            });

            it('fails to get tokenURI() when token does not exists', async function () {
                await shouldFail.reverting.withMessage(
                    this.token.tokenURI(new BN('9999'), {from: creator}),
                    'Token ID does not exist'
                );
            });
        });

    });
});
