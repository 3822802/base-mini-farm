// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title GameToken — простой ERC-20 для фарм-апки.
///
/// БЕЗОПАСНОСТЬ — осознанные решения:
/// • Минтить может ТОЛЬКО хаб (GameHub), и только когда пользователь заплатил ETH.
///   У владельца НЕТ функции mint — никакого скрытого выпуска «себе».
/// • Хаб привязывается ОДИН раз (setHub). Переназначить нельзя — нет бэкдора
///   «сменил минтера и напечатал токенов».
/// • Нет комиссий на перевод, нет чёрных списков, нет паузы, нет rebase —
///   ничего, чем можно заблокировать продажу (honeypot) или обесценить баланс.
/// • Контракт не апгрейдится (нет proxy/delegatecall) — логику потом не подменят.
contract GameToken is ERC20, ERC20Burnable, Ownable {
    /// Единственный адрес, которому разрешён mint. Устанавливается один раз.
    address public hub;

    event HubSet(address indexed hub);

    error HubAlreadySet();
    error ZeroHub();
    error OnlyHub();

    constructor(string memory name_, string memory symbol_)
        ERC20(name_, symbol_)
        Ownable(msg.sender)
    {}

    /// Однократная привязка хаба. После установки поменять нельзя.
    function setHub(address hub_) external onlyOwner {
        if (hub != address(0)) revert HubAlreadySet();
        if (hub_ == address(0)) revert ZeroHub();
        hub = hub_;
        emit HubSet(hub_);
    }

    /// Выпуск токенов. Разрешён только хабу и только в рамках его логики
    /// (оплата ETH). Владелец сюда доступа не имеет.
    function mint(address to, uint256 amount) external {
        if (msg.sender != hub) revert OnlyHub();
        _mint(to, amount);
    }
}
