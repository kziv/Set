/**
 * Set game
 * JavaScript version of the popular card game Set
 * @author Karen Ziv <karen@perlessence.com>
 * @see    http://wiki.github.com/foobarbazquux/Set - code documentation
 * @see    http://www.setgame.com/set/index.html - official game site
 **/
(function() {

    var Dom   = YAHOO.util.Dom;
    var Event = YAHOO.util.Event;

    YAHOO.namespace('Perlessence.Set');

    Event.onDOMReady(function() { new YAHOO.Perlessence.Set(); } );
    YAHOO.Perlessence.Set = function() {

        this.score        = 0;  // Current score (number of Sets found)
        this.initial_size = 12; // Size of initial board, in number of cards
        this.cur_cards    = []; // Currently selected cards (card number)
        this.errors       = []; // Error stack for non-Set trios
        this.sets         = []; // All currently possible sets (please optimize to use this more)

        // All the available card attributes. There is one card for every combination
        // of each attribute value (i.e. total cards = shape.length * color.length * count.length * fill.length)
        this.attributes   = {shape : ['squiggle', 'diamond', 'pill'],
                             color : ['red', 'purple', 'green'],
                             count : [1, 2, 3],
                             fill  : ['solid', 'semi', 'empty']
                            };

        var card_counter = 1;
        this.cards = [];
        // For each fill...
        for (var fill_val = 0; fill_val < this.attributes.fill.length; fill_val++) {
            // For each shape...
            for (var shape_val = 0; shape_val < this.attributes.shape.length; shape_val++) {
                // For each color...
                for (var color_val = 0; color_val < this.attributes.color.length; color_val++) {
                    // For each count...
                    for (var count_val = 0; count_val < this.attributes.count.length; count_val++) {
                        // Create a card with these attributes
                        this.cards[card_counter] = {status: 0, fill: fill_val, shape: shape_val, color: color_val, count: count_val};
                        card_counter++;
                    }
                }
            }
        }
        this.unused_cards = this.cards.length - 1; // Number of unused cards

        // Converts the card bits into readable text
        this.translateCard = function(card) {
            if (this.attributes.count[card.count] == 1) {
                return '1 ' + this.attributes.color[card.color] + ' ' + this.attributes.fill[card.fill] + ' ' + this.attributes.shape[card.shape];
            }
            else {
                return this.attributes.count[card.count] + ' ' + this.attributes.color[card.color] + ' ' + this.attributes.fill[card.fill] + ' ' + this.attributes.shape[card.shape] + 's';
            }
        }
        
        // Adds a card to the board
        this.addCard = function() {

            // Don't bother trying to add a card if we've exceeded the total number
            // of cards
            if (this.board.length >= (this.cards.length - 1)) {
                return false;
            }
            
            this.board.push(new YAHOO.widget.Button({ type      : 'checkbox',
                                                      name      : 'cards[]',
                                                      container : 'game',
                                                      onclick   : {fn: this.toggleCard, obj: this}
                                                    }));
            this.getNewCard(this.board.length - 1);
        }

        // Removes a card from the board
        this.removeCard = function(i) {

            // Make sure this button exists
            if (!this.board[i]) {
                return false;
            }
            
            // Undo the YUI buttonness and remove the card from the board
            this.board[i].destroy();
            this.board.splice(i, 1);
            
        }
        
        // Initial board fill : make the buttons and assign cards to them
        this.board = [];        
        for (var i = 0; i < this.initial_size; i++) {
            this.addCard();
        }

        // Set the listeners for the option buttons
        Event.addListener('find_sets', 'click', this.tutorialFindSets, this, true);
        Event.addListener('find_third', 'click', this.tutorialFinishSet, this, true);
        Event.addListener('add_row', 'click', this.addRow, this, true);
        
    };

    /**
     * Adds another row of cards to the playing field
     * Expands the size of the playing field to accomodate another row
     * of cards and adds 3 cards to the field.
     **/
    YAHOO.Perlessence.Set.prototype.addRow = function() {

        for (var i=0; i<3; i++) {
            this.addCard();
        }
        
    }
    
    YAHOO.Perlessence.Set.prototype.getNewCard = function(btn_num) {

        // If there are no more unused cards left, get out of here
        if (!this.unused_cards) {
            return;
        }
        
        var cards = this.cards;
        function getAvailableCard() {
            var random = Math.floor(Math.random()*81) + 1; // Get a random number from 1-81
            return (!cards[random].status) ? random : getAvailableCard();
        }

        var card = getAvailableCard();

        this.board[btn_num].set('value', card);
        this.board[btn_num].set('title', this.attributes.count[ cards[card].count ].toString() + ' ' + this.attributes.fill[ cards[card].fill ] + ' ' + this.attributes.color[ cards[card].color ] + ' ' + this.attributes.shape[ cards[card].shape] );
        this.board[btn_num].set('label', 'Card ' + card.toString() );
        
        var real_btn = this.board[btn_num].getElementsByTagName('button');
        Dom.setStyle(real_btn[0], 'background', 'url(cards/'+ card.toString() +'.gif)');
        
        this.cards[card].status = -1;
        this.unused_cards--;
        return card;
    };

    /**
     * Tutorial mode shows third card
     **/
    YAHOO.Perlessence.Set.prototype.tutorialFinishSet = function() {

        // Exactly two cards must be selected
        if (this.cur_cards.length != 2) {
            alert('You must first select two cards for comparison.');
            return false;
        }

        var that = this;
        
        /**
         * Finds what the third card would be to make a set from two cards
         * Takes two cards and returns the third card that would fill out the
         * Set. 
         * @param {obj} First card in Set
         * @param {obj} Second card in Set
         * @param {bool} (optional, default = false) Check for the third card on the board
         * @return {obj} The card that finishes the Set
         **/
        function findThird(card_1, card_2) {

            // Find the missing third attribute value given the other two values
            function missingAttributeValue(attribute, val1, val2) {
                for (var i = 0; i < that.attributes[attribute].length; i++) {
                    if (i != val1 && i != val2) {
                        return i;
                    }
                }
            }

            // Populate the values for each attribute of the third card
            var third_card = {};
            for (attribute in that.attributes) {
                third_card[attribute] = (card_1[attribute] == card_2[attribute]) ? card_1[attribute] : missingAttributeValue(attribute, card_1[attribute], card_2[attribute]);
            }
            return third_card;
        }
        
        third_card = findThird(this.cards[this.cur_cards[0]], this.cards[this.cur_cards[1]], true);
        
        // Validate that the found card is on the board
        var found = false;

        // For each card on the board...
        for (var i=0; i<this.board.length; i++) {
            
            // Do all the properties match what we're looking for? If so, then the card is on the board
            var match = true;
            for (attribute in this.attributes) {
                if (third_card[attribute] != this.cards[this.board[i].get('value')][attribute]) {
                    match = false;
                    break;
                }
            }
            if (!match) {
                continue;
            }
            else {
                // Set the focus to the found button so it can be styled
                this.board[i].focus();
                return true;
            }
        }

        var msg = 'The third card would be ' + this.translateCard(third_card);
        msg += ".\nThis card is not on the board.";
        alert(msg);
        for (var i=0; i<this.board.length; i++) {
            this.board[i].set('checked', false);
        }
        this.cur_cards = [];
        return false;
        
    }


    /**
     * Tutorial for showing all sets
     **/
    YAHOO.Perlessence.Set.prototype.tutorialFindSets = function() {

        if (!this.findAllSets()) {
            alert("There are no more Sets. You should reset the game and start over.");
            return false;
        }
        var msg = '';
        if (this.sets.length == 1) {
            msg = 'There is 1 possible Set.';
        }
        else {
            msg = 'There are ' + this.sets.length + ' possible Sets.';
        }
        for (var i=0; i<this.sets.length; i++) {
            msg += "\n- Cards ";
            for (var j=0; j<this.sets[i].length; j++) {
                if (j) {
                    msg += ', ';
                }
                msg += this.sets[i][j] + 1;
            }
        }
        alert(msg);
        return true;
    }
        
    /**
     * Finds all sets on the playing field
     **/
    YAHOO.Perlessence.Set.prototype.findAllSets = function() {

        // Reset the sets container
        this.sets = [];
        
        // For each card on the board
        for (var first_card=0; first_card<this.board.length; first_card++) {

            // For each card after the first card
            for (var second_card=(first_card+1); second_card<this.board.length; second_card++) {
                
                // For each card after the second card
                for (var third_card=(second_card+1); third_card<this.board.length; third_card++) {
                    if (this.checkSet(this.cards[this.board[first_card].get('value')], this.cards[this.board[second_card].get('value')], this.cards[this.board[third_card].get('value')])) {
                        this.sets.push([first_card, second_card, third_card]);
                    }
                }
            }
                 
        }

        return this.sets.length;
    };
        
    /**
     * Handler for selected/unselected card
     * Checks if there are 3 selected cards. If so, makes the call to validate
     * the Set. If not, adds the card to the selected card stack.
     **/
    YAHOO.Perlessence.Set.prototype.toggleCard = function(e, scope) {
        
        if (this.get('checked')) {

            // Don't allow more than 3 cards to be selected at once
            if (scope.cur_cards.length == 3) {
                this.set('checked', false);
                return;
            }

            // Add this card to the selected card stack if
            scope.cur_cards.push(this.get('value'));
            
            // If 3 cards are selected, validate the Set
            if (scope.cur_cards.length == 3) {
                
                if (scope.checkSet(scope.cards[ scope.cur_cards[0] ], scope.cards[ scope.cur_cards[1] ], scope.cards[ scope.cur_cards[2] ])) {

                    // Set the selected cards to discarded
                    for (var i = 0; i < 3; i++) {
                        scope.cards[ scope.cur_cards[i] ].status = 1;
                        for (var j = 0; j < scope.board.length; j++) {
                            if (scope.board[j].get('value') == scope.cur_cards[i]) {

                                if (scope.board.length > scope.initial_size) {
                                    scope.removeCard(j);
                                }
                                else {
                                    scope.getNewCard(j);
                                    scope.board[j].set('checked', false);
                                }

                            }
                        }
                    }
                    
                    // I don't care how naughty innerHTML is, this is an easy way to update the score
                    scope.score++;                    
                    Dom.get('score').innerHTML = scope.score.toString();

                    // If there are no more sets, let the player know
                    if (!scope.findAllSets()) {
                        alert('No more sets!');
                    }
                }
                else {
                    var err_str = "Not a set!\n";
                    for (var i = 0; i < scope.errors.length; i++) {
                        err_str += '- ' + scope.errors[i] + "\n";
                    }
                    alert(err_str);                    
                    for (var i = 0; i < scope.board.length; i++) {
                        scope.board[i].set('checked', false);
                    }
                }

                scope.cur_cards = [];

            }

        }
        else {
            for (var i = 0; i < scope.cur_cards.length; i++) {
                if (scope.cur_cards[i] == this.get('value')) {
                    scope.cur_cards.splice(i, 1);
                    break;
                }
            }
        }

    };

    /**
     * Determines if 3 cards make a set
     * For each of the 4 set properties (color, shape, count, fill), determines if
     * the 3 cards are all the same or all different in value. For example, for the color
     * property the cards can be (one red, one green, one purple) or all red or all green
     * or all purple. The only time the 3 cards make a set is if each property passes the
     * all same or all different test.
     * @return {bool} Whether or not the three cards make a set
     **/
    YAHOO.Perlessence.Set.prototype.checkSet = function(card_1, card_2, card_3) {

        function isSame(val1, val2, val3) {
            return (val1 == val2 && val2 == val3);
        }

        function isDifferent(val1, val2, val3) {
            return !(val1 == val2 || val1 == val3 || val2 == val3);
        }

        // Clear the error stack for new trio verification
        this.errors = [];

        // For each property, the 3 values must be all the same or all different        
        for (attribute in this.attributes) {
            if (!isSame(card_1[attribute], card_2[attribute], card_3[attribute]) && !isDifferent(card_1[attribute], card_2[attribute], card_3[attribute])) {
                this.errors.push(attribute);
            }
        }

        return !!!(this.errors.length);

    };
                                                           
}());
