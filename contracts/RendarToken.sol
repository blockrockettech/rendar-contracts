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
        uint256 editionId;        // top level edition identifier
        uint256 editionSize;      // max size of the edition
        uint256 editionSupply;    // number of tokens purchased from the edition
        uint256 artistCommission; // commission the artist wants for this editions
        address artistAccount;    // the account the send the commission to
        string tokenURI;          // NFT token metadata URL
        bool active;              // Edition is active or not
    }

    // FIXME should this be configurable?
    // Edition step
    uint256 public editionStep = 1000;

    // A count of the total number of token minted
    uint256 public totalTokensMinted;

    // A pointer to the last/highest edition number created
    uint256 public highestEditionNumber;

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

    constructor() CustomERC721Metadata("RendarToken", "RNDR") public {
        super.addWhitelisted(msg.sender);
    }

    //////////////////////////////
    // Token Creation Functions //
    //////////////////////////////

    function mintTo(address _to, uint256 _editionId)
    onlyWhitelisted
    onlyValidEdition(_editionId)
    onlyAvailableEdition(_editionId)
    onlyActiveEdition(_editionId)
    public returns (uint256 _tokenId) {

        uint256 tokenId = _nextTokenId(_editionId);

        _mint(_to, tokenId);

        tokenIdToEditionId[tokenId] = _editionId;

        return tokenId;
    }

    function mint(uint256 _editionId) public returns (uint256 _tokenId) {
        return mintTo(msg.sender, _editionId);
    }

    function burn(uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Caller is not owner nor approved");
        _burn(tokenId);
    }

    //////////////////////////////////
    // Edition Management Functions //
    //////////////////////////////////

    function createEdition(
        uint256 _editionSize,
        uint256 _artistCommission,
        address _artistAccount,
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
            _artistCommission,
            _artistAccount,
            _tokenURI,
            true // default active
        );

        highestEditionNumber = _editionId;

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

    function updateArtistAccount(uint256 _editionId, address _artistAccount)
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

    //////////////////////////
    // Management functions //
    //////////////////////////

    function updateTokenBaseURI(string calldata _newBaseURI) external onlyWhitelisted {
        require(bytes(_newBaseURI).length != 0, "Base URI invalid");
        tokenBaseURI = _newBaseURI;
    }

    ////////////////////////
    // Accessor functions //
    ////////////////////////

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

    function editionDetails(uint256 _editionId) public view onlyValidEdition(_editionId)
    returns (
        uint256 _editionSize,
        uint256 _editionSupply,
        uint256 _artistCommission,
        address _artistAccount,
        bool _active,
        string memory _tokenURI
    ) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];
        return (
        _editionDetails.editionSize,
        _editionDetails.editionSupply,
        _editionDetails.artistCommission,
        _editionDetails.artistAccount,
        _editionDetails.active,
        editionTokenUri(_editionId)
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
