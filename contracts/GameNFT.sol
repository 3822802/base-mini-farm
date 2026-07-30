// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title GameNFT — награда, которую выдают за токены.
///
/// БЕЗОПАСНОСТЬ:
/// • Минтит ТОЛЬКО хаб (и только когда пользователь сжёг токены).
///   У владельца функции mint нет — нельзя начеканить NFT «себе».
/// • Хаб привязывается один раз (setHub) — нет бэкдора смены минтера.
/// • setBaseURI меняет только адрес метаданных (домен может смениться).
///   На владение NFT и на чужие активы это не влияет — только картинка/описание.
/// • Не апгрейдится.
contract GameNFT is ERC721, Ownable {
    address public hub;
    uint256 public nextId = 1; // id токенов идут по порядку с 1
    string private _base;      // базовый URI метаданных, напр. https://site/api/nft/

    event HubSet(address indexed hub);
    event BaseURISet(string baseURI);

    error HubAlreadySet();
    error ZeroHub();
    error OnlyHub();

    constructor(string memory name_, string memory symbol_, string memory baseURI_)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {
        _base = baseURI_;
        emit BaseURISet(baseURI_);
    }

    function setHub(address hub_) external onlyOwner {
        if (hub != address(0)) revert HubAlreadySet();
        if (hub_ == address(0)) revert ZeroHub();
        hub = hub_;
        emit HubSet(hub_);
    }

    /// Метаданные можно поправить (например, при смене домена). Это не даёт
    /// доступа к чужим NFT и не меняет владение — только ссылку на JSON/картинку.
    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _base = baseURI_;
        emit BaseURISet(baseURI_);
    }

    /// Выпуск NFT. Только хаб. Возвращает id выданного токена.
    /// Используем _mint, а НЕ _safeMint: смарт-кошельки Base App (Coinbase Smart
    /// Wallet) часто не реализуют onERC721Received, и _safeMint ревертил бы приём
    /// NFT у целевой аудитории. _mint отдаёт токен без колбэка; смарт-кошелёк
    /// всё равно может им распоряжаться обычным вызовом transfer.
    function mint(address to) external returns (uint256 id) {
        if (msg.sender != hub) revert OnlyHub();
        id = nextId++;
        _mint(to, id);
    }

    function _baseURI() internal view override returns (string memory) {
        return _base;
    }
}
