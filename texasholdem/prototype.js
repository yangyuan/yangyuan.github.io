// https://en.wikipedia.org/wiki/Standard_52-card_deck

/**
 * Poker card class.
 */
class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }

    get id() { return this.suit * 16 + ((this.rank>11)?this.rank+1:this.rank); }

    get name() { return CardUtils.getCardName(this); }

    get unicode() {
        // \u{1F0A0} == \uD83C\uDCA0
        return String.fromCharCode(0xD83C) + String.fromCharCode(0xDC90 + this.id);
    }
}

class CardUtils {

    static getSuitName(suit) {
        switch (suit) {
            case Suit.SPADE:
                return 'Spade';
            case Suit.HEART:
                return 'Heart';
            case Suit.DIAMOND:
                return 'Diamond';
            case Suit.CLUB:
                return 'Club';
            case Suit.NONE:
            default:
                return 'UnKnown';
        }
    }

    static getRankName(suit) {
        switch (suit) {
            case Suit.ACE:
                return 'Ace';
            case Suit.RANK2:
                return 'Rank2';
            case Suit.RANK3:
                return 'Rank3';
            case Suit.RANK4:
                return 'Rank4';
            case Suit.RANK5:
                return 'Rank5';
            case Suit.RANK6:
                return 'Rank6';
            case Suit.RANK7:
                return 'Rank7';
            case Suit.RANK8:
                return 'Rank8';
            case Suit.RANK9:
                return 'Rank9';
            case Suit.RANK10:
                return 'Rank10';
            case Suit.JACK:
                return 'Jack';
            case Suit.QUEEN:
                return 'Queen';
            case Suit.KING:
                return 'King';
            case Suit.NONE:
            default:
                return 'UnKnown';
        }
    }

    static getCardFromId(id) {
        let suit = Math.floor(id/16);
        let rank = id%16;
        rank = ((rank>11)?rank-1:rank);
        return new Card(suit, rank);
    }

    static getCardName(card) {
        return card.suit + ' ' + card.rank;
    }

    static getCardWeight(card) {
        return this.getRankWeight(card.rank);
    }

    static getRankWeight(rank) {
        if (rank < Rank.ACE && rank > Rank.KING) {
            return 0;
        }

        if (rank == Rank.ACE) {
            return rank + 13;
        }

        return rank;
    }
}

/**
 * Poker suits.
 * @enum {number}
 */
const Suit = {
    NONE: 0,
    SPADE: 1,
    HEART: 2,
    DIAMOND: 3,
    CLUB: 4
};

/**
 * Poker ranks.
 * @enum {number}
 */
const Rank = {
    NONE: 0,
    ACE: 1,
    RANK2: 2,
    RANK3: 3,
    RANK4: 4,
    RANK5: 5,
    RANK6: 6,
    RANK7: 7,
    RANK8: 8,
    RANK9: 9,
    RANK10: 10,
    JACK: 11,
    QUEEN: 12,
    KING: 13
};

/**
 * Texas hold 'em hand ranks.
 * @enum {number}
 */
const HandRank = {
    HIGH_CARD: 0,
    PAIR: 1,
    TWO_PAIRS: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8,
    ROYAL_FLUSH: 9
};

/**
 * Texas hold 'em hand.
 */
class Hand {
    constructor(handRank,
            leadingRank = Rank.NONE,
            secondRank = Rank.NONE,
            thirdRank = Rank.NONE,
            forthRank = Rank.NONE,
            fifthRank = Rank.NONE,
            suit = Suit.NONE) {

        this.handRank = handRank;
        this.suit = suit;
        this.ranks = [leadingRank, secondRank, thirdRank, forthRank, fifthRank];
    }

    get weight() {
        return this.handRank * 0xF00000
        + CardUtils.getRankWeight(this.ranks[0]) * 0x010000
        + CardUtils.getRankWeight(this.ranks[1]) * 0x001000
        + CardUtils.getRankWeight(this.ranks[2]) * 0x000100
        + CardUtils.getRankWeight(this.ranks[3]) * 0x000010
        + CardUtils.getRankWeight(this.ranks[4]);
    }
}

class HandUtils {
    static findCardsByHand(hand, cards, extraCards)
    {
        let targetCards = cards;
        if (extraCards != undefined) {
            targetCards = cards.concat(extraCards);
        }
        
        let findAndRemoveCard = function (cards, suit, rank) {
            let index = 0;
            for (let card of cards) {
                if ((suit == Suit.NONE || card.suit == suit) && (rank == Rank.NONE || card.rank == rank)) {
                    cards.splice(index, 1);
                    return card;
                }

                index++;
            }
        };

        let findCardForHighCard = function (hand, cards) {
            let tmpCards = cards.slice();
            let ret = [];
            for (let i=0; i<5; i++) {
                let c = findAndRemoveCard(tmpCards, Suit.NONE, hand.ranks[i]);
                ret.push(c);
            }
            return ret;
        };

        let findCardForFlush = function (hand, cards) {
            let tmpCards = cards.slice();
            let ret = [];
            for (let i=0; i<5; i++) {
                let c = findAndRemoveCard(tmpCards, hand.suit, hand.ranks[i]);
                ret.push(c);
            }
            return ret;
        };

        let findCardForStraight = function (hand, cards) {
            let tmpCards = cards.slice();
            let ret = [];
            let rank = hand.ranks[0];
            for (let i=0; i<5; i++) {
                console.log(rank);
                console.log(tmpCards);
                let c = findAndRemoveCard(tmpCards, Suit.NONE, rank);
                ret.push(c);

                rank --;
                if (rank <= 0) {
                    rank += 13;
                }
            }
            return ret;
        };

        let findCardForFullHouse = function (hand, cards) {
            let tmpCards = cards.slice();
            let ret = [];
            for (let i=0; i<3; i++) {
                let c = findAndRemoveCard(tmpCards, Suit.NONE, hand.ranks[0]);
                ret.push(c);
            }
            for (let i=0; i<2; i++) {
                let c = findAndRemoveCard(tmpCards, Suit.NONE, hand.ranks[1]);
                ret.push(c);
            }
            return ret;
        };

        let findCardForThreeOfAKind = function (hand, cards) {
            let tmpCards = cards.slice();
            let ret = [];
            for (let i=0; i<3; i++) {
                let c = findAndRemoveCard(tmpCards, Suit.NONE, hand.ranks[0]);
                ret.push(c);
            }
            for (let i=0; i<2; i++) {
                let c = findAndRemoveCard(tmpCards, Suit.NONE, hand.ranks[1+i]);
                ret.push(c);
            }
            return ret;
        };

        let findCardForTwoPairs = function (hand, cards) {
            let tmpCards = cards.slice();
            let ret = [];
            for (let i=0; i<2; i++) {
                let c = findAndRemoveCard(tmpCards, Suit.NONE, hand.ranks[0]);
                ret.push(c);
            }
            for (let i=0; i<2; i++) {
                let c = findAndRemoveCard(tmpCards, Suit.NONE, hand.ranks[1]);
                ret.push(c);
            }
            {
                let c = findAndRemoveCard(tmpCards, Suit.NONE, hand.ranks[2]);
                ret.push(c);
            }
            return ret;
        };

        let findCardForPair = function (hand, cards) {
            let tmpCards = cards.slice();
            let ret = [];
            for (let i=0; i<2; i++) {
                let c = findAndRemoveCard(tmpCards, Suit.NONE, hand.ranks[0]);
                ret.push(c);
            }
            for (let i=1; i<4; i++) {
                let c = findAndRemoveCard(tmpCards, Suit.NONE, hand.ranks[i]);
                ret.push(c);
            }
            return ret;
        };

        let findCardForFourOfAKind = function (hand, cards) {
            let tmpCards = cards.slice();
            let ret = [];
            for (let i=0; i<4; i++) {
                let c = findAndRemoveCard(tmpCards, Suit.NONE, hand.ranks[0]);
                ret.push(c);
            }
            {
                let c = findAndRemoveCard(tmpCards, Suit.NONE, hand.ranks[1]);
                ret.push(c);
            }
            return ret;
        };

        let findCardForStraightFlush = function (hand, cards) {
            let tmpCards = cards.slice();
            let ret = [];
            let rank = hand.ranks[0];
            for (let i=0; i<5; i++) {
                let c = findAndRemoveCard(tmpCards, hand.suit, rank);
                ret.push(c);

                rank --;
                if (rank <= 0) {
                    rank += 13;
                }
            }
            return ret;
        };

        let findCardForRoyalFlush = function (hand, cards) {
            let tmpCards = cards.slice();
            let ret = [];
            {
                let c = findAndRemoveCard(tmpCards, Suit.DIAMOND, Rank.ACE);
                ret.push(c);
            }
            for (let i=0; i<4; i++) {
                let c = findAndRemoveCard(tmpCards, Suit.DIAMOND, Rank.KING - i);
                ret.push(c);
            }
            return ret;
        };

        switch(hand.handRank) {
            case HandRank.HIGH_CARD:
                return findCardForHighCard (hand, targetCards);
            case HandRank.PAIR:
                return findCardForPair (hand, targetCards);
            case HandRank.TWO_PAIRS:
                return findCardForTwoPairs (hand, targetCards);
            case HandRank.THREE_OF_A_KIND:
                return findCardForThreeOfAKind (hand, targetCards);
            case HandRank.STRAIGHT:
                return findCardForStraight (hand, targetCards);
            case HandRank.FLUSH:
                return findCardForFlush (hand, targetCards);
            case HandRank.FULL_HOUSE:
                return findCardForFullHouse (hand, targetCards);
            case HandRank.FOUR_OF_A_KIND:
                return findCardForFourOfAKind (hand, targetCards);
            case HandRank.STRAIGHT_FLUSH:
                return findCardForStraightFlush (hand, targetCards);
            case HandRank.ROYAL_FLUSH:
                return findCardForRoyalFlush (hand, targetCards);
        }
    }

    static getHandName(hand) {
        switch(hand.handRank) {
            case HandRank.HIGH_CARD:
                return "High Card";
            case HandRank.PAIR:
                return "Pair";
            case HandRank.TWO_PAIRS:
                return "Tow Pairs";
            case HandRank.THREE_OF_A_KIND:
                return "Three of a Kind";
            case HandRank.STRAIGHT:
                return "Straight";
            case HandRank.FLUSH:
                return "Flush";
            case HandRank.FULL_HOUSE:
                return "Full House";
            case HandRank.FOUR_OF_A_KIND:
                return "Four of a Kind";
            case HandRank.STRAIGHT_FLUSH:
                return "Straight Flush";
            case HandRank.ROYAL_FLUSH:
                return "Royal Flush";
        }
    }
}

// The static class to analyze hand cards.
// Need refactoring
class HandRankingAnalyzer {
    // Find non-zero counts
    static getNumberOfNonZero(counts) {
        var numberOfNonZero = 0;

        for (var count of counts) {
            if (count > 0) {
                numberOfNonZero ++;
            }
        }

        return numberOfNonZero;
    }

    // Find max count
    static getMaxCount(counts) {
        var maxCount = 0;

        for (var count of counts) {
            if (count > maxCount) {
                maxCount = count;
            }
        }

        return maxCount;
    }

    // Find max rank combo, combo means things like '2,3,4' (3 combo) or '10,J,Q,K' (4 combo)
    // K-A can be combe, A-2 can be combo, but 'K,A,2' is not 3 combo
    static getMaxRankCombo(suitsCount) {
        var maxCombo = 0;
        var combo = 0;

        for (var suitCount of suitsCount) {
            if (suitCount > 0) {
                combo ++;
                if (combo > maxCombo) {
                    maxCombo = combo;
                }
            } else {
                combo = 0;
            }
        }

        // find any K-A combination
        if (suitsCount[0] > 0) {
            combo ++;
            if (combo > maxCombo) {
                maxCombo = combo;
            }
        }

        return maxCombo;
    }

    // generate a specific hand
    static generateFourOfAKind(ranksCount) {
        var cards = [Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE];
        for (var i=0; i<13; i++) {
            if (ranksCount[i] == 4) {
                cards[0] = i + 1;
            }
            
            if (ranksCount[i] == 1) {
                cards[1] = i + 1;
            }
        }

        return new Hand(HandRank.FOUR_OF_A_KIND, cards[0], cards[1], cards[2], cards[3], cards[4]);
    }

    // generate a specific hand
    static generateHighCard(ranksCount) {
        var cards = [Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE];
        var index = 0;
        for (var i=13; i>0; i--) {
            if (ranksCount[i%13] != 0) {
                cards[index] = i%13 + 1;
                index++;
            }
        }

        return new Hand(HandRank.HIGH_CARD, cards[0], cards[1], cards[2], cards[3], cards[4]);
    }

    // generate a specific hand
    static generatePair(ranksCount) {
        var cards = [Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE];
        var index = 1;
        for (var i=13; i>0; i--) {
            if (ranksCount[i%13] == 1) {
                cards[index] = i%13 + 1;
                index++;
            }
            if (ranksCount[i%13] == 2) {
                cards[0] = i%13 + 1;
            }
        }

        return new Hand(HandRank.PAIR, cards[0], cards[1], cards[2], cards[3], cards[4]);
    }

    // generate a specific hand
    static generateTwoPairs(ranksCount) {
        var cards = [Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE];
        var index1 = 2;
        var index2 = 0;
        for (var i=13; i>0; i--) {
            if (ranksCount[i%13] == 1) {
                cards[index1] = i%13 + 1;
                index1++;
            }
            if (ranksCount[i%13] == 2) {
                cards[index2] = i%13 + 1;
                index2++;
            }
        }

        return new Hand(HandRank.TWO_PAIRS, cards[0], cards[1], cards[2], cards[3], cards[4]);
    }

    // generate a specific hand
    static generateFlush(ranksCount, suitsCount) {
        var cards = [Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE];
        var leadingSuit = Suit.NONE;

        var index = 0;
        for (var i=13; i>0; i--) {
            if (ranksCount[i%13] != 0) {
                cards[index] = i%13 + 1;
                index++;
            }
        }

        for (var i=0; i<4; i++) {
            if (suitsCount[i] == 5) {
                leadingSuit = i+1;
            }
        }

        return new Hand(HandRank.FLUSH, cards[0], cards[1], cards[2], cards[3], cards[4], leadingSuit);
    }

    // generate a specific hand
    static generateFullHouse(ranksCount) {
        var cards = [Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE];

        for (var i=13; i>0; i--) {
            if (ranksCount[i%13] == 3) {
                cards[0] = i%13 + 1;
            }
            if (ranksCount[i%13] == 2) {
                cards[1] = i%13 + 1;
            }
        }

        return new Hand(HandRank.FULL_HOUSE, cards[0], cards[1], cards[2], cards[3], cards[4]);
    }

    // generate a specific hand
    static generateThreeOfAKind(ranksCount) {
        var cards = [Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE,Rank.NONE];

        var index = 1;
        for (var i=13; i>0; i--) {
            if (ranksCount[i%13] == 1) {
                cards[index] = i%13 + 1;
                index++;
            }
            if (ranksCount[i%13] == 3) {
                cards[0] = i%13 + 1;
            }
        }

        return new Hand(HandRank.THREE_OF_A_KIND, cards[0], cards[1], cards[2], cards[3], cards[4]);
    }
    
    // generate a specific hand
    static generateStraight(ranksCount) {
        var leadingRank = Rank.NONE;

        for (var i=12; i>0; i--) {
            if (ranksCount[i] == 1) {
                leadingRank = i + 1;
                break;
            }
        }

        if (leadingRank == Rank.KING && ranksCount[0] == 1) {
            leadingRank = Rank.ACE;
        }

        return new Hand(HandRank.STRAIGHT, leadingRank);
    }
    
    // generate a specific hand
    static generateStraightFlush(ranksCount, suitsCount) {
        var leadingRank = Rank.NONE;
        var leadingSuit = Suit.NONE;

        for (var i=12; i>0; i--) {
            if (ranksCount[i] == 1) {
                leadingRank = i + 1;
                break;
            }
        }

        if (leadingRank == Rank.KING && ranksCount[0] == 1) {
            leadingRank = Rank.ACE;
        }

        for (var i=0; i<4; i++) {
            if (suitsCount[i] == 5) {
                leadingSuit = i+1;
            }
        }

        return new Hand(HandRank.STRAIGHT_FLUSH, leadingRank, Rank.NONE, Rank.NONE, Rank.NONE, Rank.NONE, leadingSuit);
    }

    // generate a specific hand
    static generateRoyalFlush() {
        return new Hand(HandRank.ROYAL_FLUSH)
    }

    // generate a handranking from 5 cards
    static getRankingFromCards(cards) {
        var suitsCount = [0,0,0,0];
        var ranksCount = [0,0,0,0,0,0,0,0,0,0,0,0,0];

        for (var card of cards) {
            suitsCount[card.suit-1] += 1;
            ranksCount[card.rank-1] += 1;
        }

        var numberOfSuits = this.getNumberOfNonZero(suitsCount);
        var numberOfRanks = this.getNumberOfNonZero(ranksCount);
        var maxRankCount = this.getMaxCount(ranksCount);
        var maxRankCombo = this.getMaxRankCombo(ranksCount);

        if (numberOfSuits == 1 && numberOfRanks == 5 && maxRankCombo == 5) {
            if (cards[0].suit == Suit.DIAMOND && ranksCount[0] == 1) {
                // ROYAL_FLUSH
                return this.generateRoyalFlush();
            } else {
                // STRAIGHT_FLUSH
                return this.generateStraightFlush(ranksCount, suitsCount);
            }
        } else if (numberOfRanks == 2) {
            if (maxRankCount == 4) {
                // FOUR_OF_A_KIND
                return this.generateFourOfAKind(ranksCount);
            } else {
                // FULL_HOUSE
                return this.generateFullHouse(ranksCount);
            }
        } else if (numberOfSuits == 1) {
            // FLUSH
            return this.generateFlush(ranksCount, suitsCount);
        } else if (maxRankCombo == 5) {
            // STRAIGHT
            return this.generateStraight(ranksCount);
        } else if (numberOfRanks == 3) {
            if (maxRankCount == 3) {
                // THREE_OF_A_KIND
                return this.generateThreeOfAKind(ranksCount);
            } else {
                // TWO_PAIRS
                return this.generateTwoPairs(ranksCount);
            }
        } else if (numberOfRanks == 4) {
            // PAIRS
            return this.generatePair(ranksCount);
        } else {
            // HIGH_CARD
            return this.generateHighCard(ranksCount);
        }
    }

    // find best 5 cards from >5 cards
    static selectBestCards(cards)
    {
        var result = {results:[]};
        this.selectCards(cards, 5, [], result);

        var maxRankValue = 0;
        var maxHandRanking = {};
        var maxRankCards = [];

        for (var cards of result.results) {
            var handRanking = this.getRankingFromCards(cards);
            var cardValue = handRanking.weight;
            if (cardValue > maxRankValue) {
                maxRankCards = cards;
                maxRankValue = cardValue;
                maxHandRanking = handRanking;
            }
        }

        return maxRankCards;
    }
    
    // A resursive help function for selectBestCards.
    // This function will pick {remain} more cards from {cards}, and put them in {result}, the selected cards will be put in {selected}. 
    static selectCards(cards, remain, selected, result)
    {
        if (remain == 0) {
            result.results.push(selected);
            return;
        }
        if (cards.length == 0) {
            return;
        }

        let newSelected = selected.slice();
        newSelected.push(cards[0]);
        this.selectCards(cards.slice(1), remain-1, newSelected, result);
        this.selectCards(cards.slice(1), remain, selected, result);
    }
}

// GameStep enum
const GameStep = {
    NONE: 0,
    ANTE: 1,
    PREFLOP: 2,
    FLOP: 3,
    TURN: 4,
    RIVER: 5,
    SHOWDOWN: 6,
    END: 7
};

// BetType enum
const BetType = {
    NONE: 0,
    RAISE: 1,
    FOLLOW: 2, // Check/Call
    QUIT: 3
};


class GameStepHelper {
    static moveToNextStep(engine, players) {
        let step = engine.step;
        // first is holder, 2 player at least, first is holder
        switch(step) {
            case GameStep.NONE:
                // PREPARE
                // TODO
                return GameStep.ANTE;
            case GameStep.ANTE:
                // BLIND BET
                this.blindBet(players[1], 1);
                this.blindBet(players[2 % players.length], 2);
                return GameStep.PREFLOP;
            case GameStep.PREFLOP:
                this.givePlayerCards(engine, players);
                this.givePlayerCards(engine, players);
                // PREFLOP BET
                this.runBets(engine, players);
                return GameStep.FLOP;
            case GameStep.FLOP:
                this.showSharedCard(engine);
                this.showSharedCard(engine);
                this.showSharedCard(engine);
                // FLOP BET
                this.runBets(engine, players);
                return GameStep.TURN;
            case GameStep.TURN:
                this.showSharedCard(engine);
                // TURN BET
                this.runBets(engine, players);
                return GameStep.RIVER;
            case GameStep.RIVER:
                this.showSharedCard(engine);
                // RIVER BET
                this.runBets(engine, players);
                return GameStep.SHOWDOWN;
            case GameStep.SHOWDOWN:
                // PAY
                return GameStep.END;
        }
    }

    static givePlayerCards(engine, players) {
        for (let player of players) {
            let card = engine.deck.pop();
            player.handcards.push(card);
        }
    }

    static blindBet(player, numberOfBid) {
        return player.doBlindBet(numberOfBid);
    }

    static waitForBet(engine, player) {
        let bet = player.doBet(engine.highbets);

        if (engine.highbets < player.bets) {
            engine.highbets = player.bets;
        }

        return bet;
    }

    static showSharedCard(engine) {
        let card = engine.deck.pop();
        engine.sharedCards.push(card);
    }

    static runBets(engine, players) {
        while (true) {
            let allBided = false;
            let comboNoRaise = 0;
            let endBid = false;
            for (let player of players) {
                let bid = this.waitForBet(engine, player);
                if (bid.type == BetType.RAISE) {
                    comboNoRaise = 0;
                } else {
                    // quit or follow
                    comboNoRaise ++;
                }
                if ((comboNoRaise >= players.length - 1) && allBided) {
                    endBid = true;
                    break;
                }

                allBided = true;
            }
            
            if (endBid) {
                break;
            }
        }
    }
}


class Bet {
    constructor(type, size) {
        this.type = type;
        this.size = size;
    }
}


class Player {
    constructor(name) {
        this.id = Player.ids;
        Player.ids++;

        this.money = 0;
        if (name == undefined) {
            name = "Player " + this.id;
        }
        this.bets = 0;

        this.name = name;
        this.handcards = [];
    }

    doBet(targetNum) {
        let num = this.makeBet(targetNum);
        return new Bet(BetType.FOLLOW, num);
    }

    doBlindBet(num) {
        this.makeBet(num);

        return new Bet(BetType.FOLLOW, num);
    }
    
    makeBet(targetNum) {
        let num = targetNum - this.bets;

        this.money -= num;
        this.bets += num;

        return num;
    }
}

Player.ids = 0;



// The engine class, the entrance of most features.
class GameEngine {
    constructor() {
        this.deck = GameEngine.createDeck ();
        this.step = GameStep.NONE;
        this.sharedCards = [];
        this.pot = 0;
        this.highbets = 0;
    }

    static createDeck () {
        let deck = [];
        for (let rank=1; rank <= 13; rank++) {
            for (let suit=1; suit<= 4; suit++) {
                let c = new Card(suit, rank);
                deck.push(c);
            }
        }

        return deck;
    }

    static getHandFromCards(cards) {
        return HandRankingAnalyzer.getRankingFromCards(cards);
    }

    static selectBestCards(cards) {
        return HandRankingAnalyzer.selectBestCards(cards);
    }

    shuffleDeck() {
        let length = this.deck.length;
        while (length > 0) {
            let index = Math.floor(Math.random() * length);
            length--;
            let temp = this.deck[length];
            this.deck[length] = this.deck[index];
            this.deck[index] = temp;
        }
    }

    moveToNextStep(players) {
        this.step = GameStepHelper.moveToNextStep(this, players);
    }
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = exports = {
        GameEngine : GameEngine,
        Suit : Suit,
        Rank : Rank,
        Card : Card,
        CardUtils : CardUtils,
        HandRank : HandRank,
        Hand : Hand,
        HandUtils: HandUtils,
        GameStep : GameStep,
        Player : Player
    };
}
