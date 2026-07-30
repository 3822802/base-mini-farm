// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IGameToken {
    function mint(address to, uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;
}

interface IGameNFT {
    function mint(address to) external returns (uint256);
}

interface IGameBadges {
    function mint(address to, uint256 id) external;
}

interface IGameLeaderboard {
    struct Player {
        uint256 tokensBought;
        uint256 nftsRedeemed;
        uint256 points;
        uint32 checkins;
        uint32 streak;
        uint32 lastDay;
        bool seen;
    }
    function recordBuy(address who, uint256 tokensOut) external returns (Player memory);
    function recordRedeem(address who) external returns (Player memory);
}

/// @title GameHub — точка входа. Одна подпись = несколько контрактов.
///
/// Кнопка 1 buyTokens(): ETH → токен + запись в лидерборд + возможный бейдж.
/// Кнопка 2 redeemNft(): токен → NFT + запись в лидерборд + возможный бейдж.
///
/// БЕЗОПАСНОСТЬ (см. также аудит):
/// • Владелец НЕ может забрать токены/NFT/бейджи пользователей — таких функций
///   нет. Единственная денежная функция withdraw() выводит только ETH-выручку.
/// • Цены immutable, адреса всех контрактов immutable — подменить нельзя.
/// • Нет delegatecall/selfdestruct/tx.origin/произвольных вызовов.
/// • Все внешние вызовы — только к своим token/nft/badges/board.
/// • Реентранси: nonReentrant + CEI. Внешние минты (NFT _safeMint и badge
///   _mint у ERC-1155 имеют колбэк получателю) идут ПОСЛЕ изменения состояния.
contract GameHub is Ownable, ReentrancyGuard {
    IGameToken public immutable token;
    IGameNFT public immutable nft;
    IGameBadges public immutable badges;
    IGameLeaderboard public immutable board;

    uint256 public immutable tokensPerEth; // токенов (wei) за 1 ETH
    uint256 public immutable nftPrice;     // цена NFT в токенах (wei)

    // Пороги ачивок — публичные константы, чтобы фронт мог их показать.
    uint256 public constant BADGE_FIRST_BUY = 1;
    uint256 public constant BADGE_COLLECTOR = 2;
    uint256 public constant BADGE_REGULAR = 3;
    uint32 public constant COLLECTOR_NFTS = 5;
    uint32 public constant REGULAR_CHECKINS = 7;

    /// Кому какой бейдж уже выдавали. Авторитетный учёт «когда-либо выдан»:
    /// в отличие от badges.balanceOf, перевод бейджа этого не сбросит, поэтому
    /// повторно тот же бейдж на тот же адрес не начеканить.
    mapping(address => mapping(uint256 => bool)) public awarded;

    event Bought(address indexed player, uint256 ethIn, uint256 tokensOut);
    event Redeemed(address indexed player, uint256 indexed tokenId, uint256 pricePaid);
    event BadgeAwarded(address indexed player, uint256 indexed badgeId);
    event Withdraw(address indexed to, uint256 amount);

    error NoValue();
    error NothingToBuy();
    error ZeroAddress();
    error WithdrawFailed();

    constructor(
        address token_,
        address nft_,
        address badges_,
        address board_,
        uint256 tokensPerEth_,
        uint256 nftPrice_
    ) Ownable(msg.sender) {
        if (
            token_ == address(0) ||
            nft_ == address(0) ||
            badges_ == address(0) ||
            board_ == address(0)
        ) revert ZeroAddress();
        token = IGameToken(token_);
        nft = IGameNFT(nft_);
        badges = IGameBadges(badges_);
        board = IGameLeaderboard(board_);
        tokensPerEth = tokensPerEth_;
        nftPrice = nftPrice_;
    }

    // ── Кнопка 1: ETH → токен + лидерборд + бейдж ──────────────────────────
    function buyTokens() external payable nonReentrant {
        if (msg.value == 0) revert NoValue();
        uint256 out = (msg.value * tokensPerEth) / 1 ether;
        if (out == 0) revert NothingToBuy();

        // Состояние в лидерборде — до внешних минтов (CEI).
        IGameLeaderboard.Player memory p = board.recordBuy(msg.sender, out);
        token.mint(msg.sender, out); // ERC-20 mint — колбэка получателю нет
        _maybeAward(msg.sender, p);  // бейджи (у ERC-1155 mint колбэк) — под guard
        emit Bought(msg.sender, msg.value, out);
    }

    // ── Кнопка 2: токен → NFT + лидерборд + бейдж ──────────────────────────
    function redeemNft() external nonReentrant {
        // Оплата (нужен approve хабу на nftPrice). Атомарно ревертнется без него.
        token.burnFrom(msg.sender, nftPrice);
        // Состояние — до минтов.
        IGameLeaderboard.Player memory p = board.recordRedeem(msg.sender);
        uint256 id = nft.mint(msg.sender); // _mint без колбэка (совместимость смарт-кошельков)
        _maybeAward(msg.sender, p);
        emit Redeemed(msg.sender, id, nftPrice);
    }

    // ── Вывод ТОЛЬКО ETH-выручки. Активы юзеров недоступны. ─────────────────
    function withdraw(address payable to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = address(this).balance;
        (bool ok, ) = to.call{value: bal}("");
        if (!ok) revert WithdrawFailed();
        emit Withdraw(to, bal);
    }

    // ── Выдача ачивок по вехам ──────────────────────────────────────────────
    function _maybeAward(address who, IGameLeaderboard.Player memory p) private {
        _grant(who, BADGE_FIRST_BUY, p.tokensBought > 0);
        _grant(who, BADGE_COLLECTOR, p.nftsRedeemed >= COLLECTOR_NFTS);
        _grant(who, BADGE_REGULAR, p.checkins >= REGULAR_CHECKINS);
    }

    /// Выдать бейдж, если веха достигнута и он ещё не выдавался этому адресу.
    /// Минт обёрнут в try/catch НАМЕРЕННО: если кошелёк-получатель не умеет
    /// принимать ERC-1155 (смарт-кошельки Base App), бейдж просто пропускается,
    /// а основное действие (покупка/редем) проходит. Флаг awarded ставим только
    /// при успешном минте — иначе веха останется «незакрытой» и попробуем позже.
    function _grant(address who, uint256 id, bool qualified) private {
        if (!qualified || awarded[who][id]) return;
        try badges.mint(who, id) {
            awarded[who][id] = true;
            emit BadgeAwarded(who, id);
        } catch {}
    }
}
