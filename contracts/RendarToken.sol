pragma solidity ^0.5.0;

import 'openzeppelin-solidity/contracts/token/ERC721/ERC721.sol';
import 'openzeppelin-solidity/contracts/token/ERC721/ERC721Enumerable.sol';
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/access/roles/WhitelistedRole.sol";

import "./Strings.sol";
import "./CustomERC721Metadata.sol";

contract RendarToken is CustomERC721Metadata, WhitelistedRole {
    using SafeMath for uint256;

    ////////////
    // Events //
    ////////////

    // Emitted on every edition created
    event EditionCreated(
        uint256 indexed _editionId
    );

    ///////////////
    // Variables //
    ///////////////

    string public tokenBaseURI = "https://ipfs.infura.io/ipfs/";

    // Edition construct
    struct EditionDetails {
        uint256 editionId;              // top level edition identifier
        uint256 editionSize;            // max size of the edition
        uint256 editionSupply;          // number of tokens purchased from the edition
        uint256 priceInWei;             // price per token for this edition
        uint256 artistCommission;       // commission the artist wants for this editions
        address payable artistAccount;  // the account the send the commission to
        bool active;                    // Edition is active or not
        string tokenURI;                // NFT token metadata URL
    }

    // FIXME should this be configurable?
    // Edition step
    uint256 public editionStep = 1000;

    // A count of the total number of token minted
    uint256 public totalTokensMinted;

    // A pointer to the last/highest edition number created
    uint256 public highestEditionNumber;

    // A list of all created editions
    uint256[] public createdEditions;

    // Rendar commission account
    address payable public rendarAddress;

    // tokenId : editionId
    mapping(uint256 => uint256) internal tokenIdToEditionId;

    // editionId : EditionDetails
    mapping(uint256 => EditionDetails) internal editionIdToEditionDetails;

    ///////////////
    // Modifiers //
    ///////////////

    modifier onlyActiveEdition(uint256 _editionId) {
        require(editionIdToEditionDetails[_editionId].active, "Edition disabled");
        _;
    }

    modifier onlyValidEdition(uint256 _editionId) {
        require(editionIdToEditionDetails[_editionId].editionId > 0, "Edition ID invalid");
        _;
    }

    modifier onlyAvailableEdition(uint256 _editionId) {
        require(editionIdToEditionDetails[_editionId].editionSupply < editionIdToEditionDetails[_editionId].editionSize, "Edition sold out");
        _;
    }

    modifier onlyValidTokenId(uint256 _tokenId) {
        require(_exists(_tokenId), "Token ID does not exist");
        _;
    }

    /////////////////
    // Constructor //
    /////////////////

    constructor(address payable _rendarAddress) CustomERC721Metadata("RendarToken", "RNDR") public {
        super.addWhitelisted(msg.sender);
        rendarAddress = _rendarAddress;
    }

    //////////////////////////////
    // Token Creation Functions //
    //////////////////////////////

    function purchase(uint256 _editionId) public payable returns (uint256 _tokenId) {
        return purchaseTo(msg.sender, _editionId);
    }

    function purchaseTo(address _to, uint256 _editionId)
    onlyActiveEdition(_editionId)
    onlyAvailableEdition(_editionId)
    public payable returns (uint256 _tokenId) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];
        require(msg.value >= _editionDetails.priceInWei, "Not enough ETH");

        // Generate token
        uint256 tokenId = _internalMint(_to, _editionId);

        // Split funds between Rendar and Artist
        _splitFunds(_editionDetails.priceInWei, _editionDetails.artistAccount, _editionDetails.artistCommission);

        return tokenId;
    }

    function _splitFunds(uint256 _priceInWei, address payable _artistsAccount, uint256 _artistsCommission) internal {
        if (_priceInWei > 0) {

            if (_artistsCommission > 0) {

                uint256 artistPayment = _priceInWei.div(100).mul(_artistsCommission);
                _artistsAccount.transfer(artistPayment);

                uint256 remainingCommission = msg.value.sub(artistPayment);
                rendarAddress.transfer(remainingCommission);
            } else {

                rendarAddress.transfer(msg.value);
            }
        }
    }

    /*
     * Whitelist only function for minting tokens from an edition to the callers address, does not require payment
     */
    function mint(uint256 _editionId) public returns (uint256 _tokenId) {
        return mintTo(msg.sender, _editionId);
    }

    /*
     * Whitelist only function for minting tokens from an edition to a specific address, does not require payment
     */
    function mintTo(address _to, uint256 _editionId)
    onlyWhitelisted
    onlyValidEdition(_editionId)
    onlyAvailableEdition(_editionId)
    public returns (uint256 _tokenId) {
        return _internalMint(_to, _editionId);
    }

    /*
     * Whitelist only function for minting multiple tokens from an edition to a specific address, does not require payment
     */
    function mintMultipleTo(address _to, uint256 _editionId, uint256 _total)
    onlyWhitelisted
    onlyValidEdition(_editionId)
    public returns (uint256[] memory _tokenIds) {

        uint256 remainingInEdition = editionIdToEditionDetails[_editionId].editionSize - editionIdToEditionDetails[_editionId].editionSupply;
        require(remainingInEdition >= _total, "Not enough left in edition");

        uint256[] memory tokens;
        for (uint i = 0; i < _total; i++) {
            tokens[i] = _internalMint(_to, _editionId);
        }
        return tokens;
    }

    function _internalMint(address _to, uint256 _editionId) internal returns (uint256 _tokenId) {
        uint256 tokenId = _nextTokenId(_editionId);

        _mint(_to, tokenId);

        tokenIdToEditionId[tokenId] = _editionId;

        return tokenId;
    }

    /*
     * Function for burning tokens if you are the owner
     */
    function burn(uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Caller is not owner nor approved");
        _burn(tokenId);
        delete tokenIdToEditionId[tokenId];
    }

    /*
     * Admin only function for burning tokens
     */
    function adminBurn(uint256 tokenId) onlyWhitelisted public {
        _burn(tokenId);
        delete tokenIdToEditionId[tokenId];
    }

    //////////////////////////////////
    // Edition Management Functions //
    //////////////////////////////////

    function createEdition(
        uint256 _editionSize,
        uint256 _priceInWei,
        uint256 _artistCommission,
        address payable _artistAccount,
        string memory _tokenURI
    ) public onlyWhitelisted returns (bool _created) {

        // Guards for edition creation logic
        require(_editionSize > 0 && _editionSize <= editionStep, "Edition size invalid");
        require(_artistCommission >= 0 && _artistCommission <= 100, "Artist commission invalid");
        require(_artistAccount != address(0), "Artist account missing");
        require(bytes(_tokenURI).length != 0, "Token URI invalid");

        // Generate new edition number based on step
        uint256 _editionId = highestEditionNumber.add(editionStep);

        // Create edition
        editionIdToEditionDetails[_editionId] = EditionDetails(
            _editionId,
            _editionSize,
            0, // default non purchased
            _priceInWei,
            _artistCommission,
            _artistAccount,
            true, // default active
            _tokenURI
        );

        highestEditionNumber = _editionId;

        createdEditions.push(_editionId);

        // Emit event
        emit EditionCreated(_editionId);

        return true;
    }

    function _nextTokenId(uint256 _editionId) internal returns (uint256) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];

        // get next tokenID = max size + current supply
        uint256 tokenId = _editionDetails.editionId.add(_editionDetails.editionSupply);

        // Bump number totalSupply
        _editionDetails.editionSupply = _editionDetails.editionSupply.add(1);

        // Record another mint
        totalTokensMinted = totalTokensMinted.add(1);

        // Construct next token ID e.g. 100000 + 1 = ID of 100001 (this first in the edition set)
        return tokenId;
    }

    function disableEdition(uint256 _editionId)
    external
    onlyWhitelisted
    onlyValidEdition(_editionId) {
        editionIdToEditionDetails[_editionId].active = false;
    }

    function enableEdition(uint256 _editionId)
    external
    onlyWhitelisted
    onlyValidEdition(_editionId) {
        editionIdToEditionDetails[_editionId].active = true;
    }

    function updateArtistAccount(uint256 _editionId, address payable _artistAccount)
    external
    onlyWhitelisted
    onlyValidEdition(_editionId) {
        editionIdToEditionDetails[_editionId].artistAccount = _artistAccount;
    }

    function updateArtistCommission(uint256 _editionId, uint256 _artistCommission)
    external
    onlyWhitelisted
    onlyValidEdition(_editionId) {
        editionIdToEditionDetails[_editionId].artistCommission = _artistCommission;
    }

    function updateEditionTokenUri(uint256 _editionId, string calldata _tokenURI)
    external
    onlyWhitelisted
    onlyValidEdition(_editionId) {
        editionIdToEditionDetails[_editionId].tokenURI = _tokenURI;
    }

    function updatePrice(uint256 _editionId, uint256 _priceInWei)
    external
    onlyWhitelisted
    onlyValidEdition(_editionId) {
        editionIdToEditionDetails[_editionId].priceInWei = _priceInWei;
    }

    //////////////////////////
    // Management functions //
    //////////////////////////

    function updateTokenBaseURI(string calldata _newBaseURI)
    external
    onlyWhitelisted {
        require(bytes(_newBaseURI).length != 0, "Base URI invalid");
        tokenBaseURI = _newBaseURI;
    }

    function updateRendarAddress(address payable _rendarAddress)
    external
    onlyWhitelisted {
        rendarAddress = _rendarAddress;
    }

    ////////////////////////
    // Accessor functions //
    ////////////////////////

    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        return _tokensOfOwner(owner);
    }

    function tokenURI(uint256 _tokenId)
    external view
    onlyValidTokenId(_tokenId)
    returns (string memory) {
        return Strings.strConcat(tokenBaseURI, editionIdToEditionDetails[_tokenId].tokenURI);
    }

    function editionTokenUri(uint256 _editionId)
    public view
    returns (string memory _tokenUri) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];
        return Strings.strConcat(tokenBaseURI, _editionDetails.tokenURI);
    }

    function editionSize(uint256 _editionId)
    public view
    returns (uint256 _totalRemaining) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];
        return _editionDetails.editionSize;
    }

    function editionSupply(uint256 _editionId)
    public view
    returns (uint256 _editionSupply) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];
        return _editionDetails.editionSupply;
    }

    function editionPrice(uint256 _editionId)
    public view
    returns (uint256 _priceInWei) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];
        return _editionDetails.priceInWei;
    }

    function artistInfo(uint256 _editionId)
    public view
    returns (address _artistAccount, uint256 _artistCommission) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];
        return (_editionDetails.artistAccount, _editionDetails.artistCommission);
    }

    function artistCommission(uint256 _editionId)
    public view
    returns (uint256 _artistCommission) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];
        return _editionDetails.artistCommission;
    }

    function artistAccount(uint256 _editionId)
    public view
    returns (address _artistAccount) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];
        return _editionDetails.artistAccount;
    }

    function active(uint256 _editionId)
    public view
    returns (bool _active) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];
        return _editionDetails.active;
    }

    function allEditions() public view returns (uint256[] memory _editionIds) {
        return createdEditions;
    }

    function editionDetails(uint256 _editionId) public view onlyValidEdition(_editionId)
    returns (
        uint256 _editionSize,
        uint256 _editionSupply,
        uint256 _priceInWei,
        uint256 _artistCommission,
        address _artistAccount,
        bool _active,
        string memory _tokenURI
    ) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];
        return (
        _editionDetails.editionSize,
        _editionDetails.editionSupply,
        _editionDetails.priceInWei,
        _editionDetails.artistCommission,
        _editionDetails.artistAccount,
        _editionDetails.active,
        Strings.strConcat(tokenBaseURI, _editionDetails.tokenURI)
        );
    }

    function totalRemaining(uint256 _editionId) public view returns (uint256) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];
        return _editionDetails.editionSize.sub(_editionDetails.editionSupply);
    }

    function tokenDetails(uint256 _tokenId) public view onlyValidTokenId(_tokenId)
    returns (
        uint256 _editionId,
        uint256 _editionSize,
        uint256 _editionSupply,
        address _artistAccount,
        address _owner,
        string memory _tokenURI
    ) {
        uint256 editionId = tokenIdToEditionId[_tokenId];
        EditionDetails storage _editionDetails = editionIdToEditionDetails[editionId];
        return (
        editionId,
        _editionDetails.editionSize,
        _editionDetails.editionSupply,
        _editionDetails.artistAccount,
        ownerOf(_tokenId),
        Strings.strConcat(tokenBaseURI, _editionDetails.tokenURI)
        );
    }

}
