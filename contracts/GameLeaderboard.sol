// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title GameLeaderboard — общий учёт активности игроков.
///
/// БЕЗОПАСНОСТЬ:
/// • Писать может ТОЛЬКО хаб (onlyHub). Хаб привязывается один раз (setHub) —
///   нет бэкдора «переназначить писателя и накрутить очки».
/// • Здесь нет денег и активов — только счётчики. Владелец ничего не выводит.
/// • Ранжирование лидерборда — офчейн по событиям; на цепочке циклов нет.
contract GameLeaderboard is Ownable {
    address public hub;

    struct Player {
        uint256 tokensBought; // всего куплено токенов (wei)
        uint256 nftsRedeemed; // всего получено NFT
        uint256 points;       // очки
        uint32 checkins;      // всего чек-инов
        uint32 streak;        // текущий стрик по дням
        uint32 lastDay;       // индекс последнего дня чек-ина
        bool seen;            // видели ли игрока раньше
    }

    mapping(address => Player) public players;
    uint256 public totalPlayers;

    event HubSet(address indexed hub);
    event CheckedIn(address indexed player, uint32 day, uint32 streak, uint32 totalCheckins);
    event PointsAdded(address indexed player, uint256 added, uint256 total);
    event BuyRecorded(address indexed player, uint256 tokensOut);
    event RedeemRecorded(address indexed player, uint256 totalNfts);

    error HubAlreadySet();
    error ZeroHub();
    error OnlyHub();

    modifier onlyHub() {
        if (msg.sender != hub) revert OnlyHub();
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setHub(address hub_) external onlyOwner {
        if (hub != address(0)) revert HubAlreadySet();
        if (hub_ == address(0)) revert ZeroHub();
        hub = hub_;
        emit HubSet(hub_);
    }

    /// Запись покупки токена. Возвращает свежий снимок игрока — хабу он нужен,
    /// чтобы решить, не пора ли выдать ачивку.
    function recordBuy(address who, uint256 tokensOut) external onlyHub returns (Player memory) {
        Player storage p = _touch(who);
        p.tokensBought += tokensOut;
        _checkin(p, who);
        _award(p, who, 10 + tokensOut / 1e18); // база + за каждый целый токен
        emit BuyRecorded(who, tokensOut);
        return p;
    }

    /// Запись получения NFT.
    function recordRedeem(address who) external onlyHub returns (Player memory) {
        Player storage p = _touch(who);
        p.nftsRedeemed += 1;
        _checkin(p, who);
        _award(p, who, 50);
        emit RedeemRecorded(who, p.nftsRedeemed);
        return p;
    }

    function getPlayer(address who) external view returns (Player memory) {
        return players[who];
    }

    // ── Внутреннее ─────────────────────────────────────────────────────────
    function _touch(address who) private returns (Player storage p) {
        p = players[who];
        if (!p.seen) {
            p.seen = true;
            totalPlayers += 1;
        }
    }

    function _checkin(Player storage p, address who) private {
        uint32 today = uint32(block.timestamp / 1 days);
        if (p.lastDay == today) return; // уже отмечался сегодня
        if (p.lastDay != 0 && today == p.lastDay + 1) {
            p.streak += 1;
        } else {
            p.streak = 1;
        }
        p.lastDay = today;
        p.checkins += 1;
        emit CheckedIn(who, today, p.streak, p.checkins);
    }

    function _award(Player storage p, address who, uint256 pts) private {
        p.points += pts;
        emit PointsAdded(who, pts, p.points);
    }
}
