// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title GameBadges — ачивки-бейджи (ERC-1155).
///
/// Хаб выдаёт бейдж за веху (первая покупка, коллекционер, регуляр).
/// БЕЗОПАСНОСТЬ:
/// • Минтит ТОЛЬКО хаб — у владельца функции mint нет.
/// • Хаб привязывается один раз (setHub).
/// • setURI меняет только адрес метаданных бейджей (картинка/описание),
///   на владение не влияет.
/// • Бейджи переводимы как обычный ERC-1155 — никаких скрытых блокировок.
contract GameBadges is ERC1155, Ownable {
    address public hub;

    event HubSet(address indexed hub);

    error HubAlreadySet();
    error ZeroHub();
    error OnlyHub();

    constructor(string memory uri_) ERC1155(uri_) Ownable(msg.sender) {}

    function setHub(address hub_) external onlyOwner {
        if (hub != address(0)) revert HubAlreadySet();
        if (hub_ == address(0)) revert ZeroHub();
        hub = hub_;
        emit HubSet(hub_);
    }

    function setURI(string calldata newuri) external onlyOwner {
        _setURI(newuri);
    }

    /// Выдать один бейдж данного id. Только хаб.
    function mint(address to, uint256 id) external {
        if (msg.sender != hub) revert OnlyHub();
        _mint(to, id, 1, "");
    }
}
