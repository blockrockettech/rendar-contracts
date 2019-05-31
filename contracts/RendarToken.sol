pragma solidity ^0.5.0;

import 'openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol';
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/access/roles/WhitelistedRole.sol";


import "./Strings.sol";

contract RendarToken is ERC721Full, WhitelistedRole {
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

    // A count of the total number of token minted
    uint256 public totalTokensMinted;

    // A pointer to the last/highest edition number created
    uint256 public highestEditionNumber;

    // Edition construct
    struct EditionDetails {
        uint256 editionId;
        uint256 editionSize;
        uint256 editionSupply;
        uint256 artistCommission;
        address artistAccount;
        string tokenURI;
        bool active;
    }

    // tokenId : editionId
    mapping(uint256 => uint256) internal tokenIdToEditionId;

    // editionId : EditionDetails
    mapping(uint256 => EditionDetails) internal editionIdToEditionDetails;

    ///////////////
    // Modifiers //
    ///////////////

    modifier onlyActiveEdition(uint256 _editionId) {
        require(editionIdToEditionDetails[_editionId].active, "Edition not active");
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

    constructor() ERC721Full("RendarToken", "RNDR") public {
    }

    //////////////////////////////
    // Token Creation Functions //
    //////////////////////////////

    function mintTokenTo(address _to, uint256 _editionId)
    onlyWhitelisted
    onlyValidEdition(_editionId)
    onlyAvailableEdition(_editionId)
    public returns (uint256 _tokenId) {
        require(editionIdToEditionDetails[_editionId].active, "Edition not active");

        uint256 tokenId = _nextTokenId(_editionId);

        _mint(_to, tokenId);
        _setTokenURI(tokenId, editionIdToEditionDetails[tokenId].tokenURI);

        return tokenId;
    }

    function mintToken(uint256 _editionId) public returns (uint256 _tokenId) {
        return mintTokenTo(msg.sender, _editionId);
    }

    //////////////////////////////////
    // Edition Management Functions //
    //////////////////////////////////

    function _nextTokenId(uint256 _editionId) internal returns (uint256) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];

        // Bump number totalSupply
        _editionDetails.editionSupply = _editionDetails.editionSupply.add(1);

        // Record another mint
        totalTokensMinted = totalTokensMinted.add(1);

        // Construct next token ID e.g. 100000 + 1 = ID of 100001 (this first in the edition set)
        return _editionDetails.editionId.add(_editionDetails.editionSupply);
    }

    function createEdition(
        uint256 _editionId,
        uint256 _editionSize,
        uint256 _artistCommission,
        address _artistAccount,
        string memory _tokenURI
    ) public onlyWhitelisted returns (bool _created) {

        // Guards for edition creation logic
        require(_editionId != 0, "Edition ID missing");
        require(_editionSize > 0, "Edition Size missing");
        require(_artistCommission <= 100 && _artistCommission >= 0, "Artist commission invalid");
        require(_artistAccount != address(0), "Artist account missing");
        require(bytes(_tokenURI).length != 0, "Base URI invalid");

        require(editionIdToEditionDetails[_editionId].editionId == 0, "Edition ID already used");

        // Create edition
        editionIdToEditionDetails[_editionId] = EditionDetails(
            _editionId,
            _editionSize,
            _artistCommission,
            0, // default non purchased
            _artistAccount,
            _tokenURI,
            true // default active
        );

        highestEditionNumber = _editionId;

        // Emit event
        emit EditionCreated(_editionId);

        return true;
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

    function updateTokenUri(uint256 _editionId, string calldata _tokenURI)
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

    function totalRemaining(uint256 _editionId)
    public view
    returns (uint256 _totalRemaining) {
        EditionDetails storage _editionDetails = editionIdToEditionDetails[_editionId];
        return _editionDetails.editionSize.sub(_editionDetails.editionSupply);
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
