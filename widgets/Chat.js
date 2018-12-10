/**
 * # Chat
 * Copyright(c) 2018 Stefano Balietti
 * MIT Licensed
 *
 * Creates a simple configurable chat
 *
 * // TODO: add is...typing
 * // TODO: add bootstrap badge to count msg when collapsed
 * // TODO: check on data if message comes back
 * // TODO: fix no names and map
 * // TODO: check if removing privateData works (battery ended here).
 * // TODO: add proper inline doc
 *
 * www.nodegame.org
 */
(function(node) {

    "use strict";

    var NDDB =  node.NDDB;

    node.widgets.register('Chat', Chat);

    // ## Texts.

    Chat.texts = {
        me: 'Me',
        outgoing: function(w, data) {
            // Id could be defined as a specific to (not used now).
            return '<span class="chat_me">' + w.getText('me') +
                '</span>: </span class="chat_msg">' + data.msg + '</span>';
        },
        incoming: function(w, data) {
            return '<span class="chat_others">' +
                w.senderToNameMap[data.id] +
                '</span>: </span class="chat_msg">' + data.msg + '</span>';
        },
        quit: function(w, data) {
            return w.senderToNameMap[data.id] + ' quit the chat';
        }
    };

    // ## Meta-data

    Chat.version = '1.0.0';
    Chat.description = 'Offers a uni-/bi-directional communication interface ' +
        'between players, or between players and the server.';

    Chat.title = 'Chat';
    Chat.className = 'chat';

    // ## Dependencies

    Chat.dependencies = {
        JSUS: {}
    };

    /**
     * ## Chat constructor
     *
     * `Chat` is a simple configurable chat
     *
     * @see Chat.init
     */
    function Chat() {

        /**
         * ### Chat.chatEvent
         *
         * The suffix used to fire chat events
         *
         * Default: 'CHAT'
         */
        this.chatEvent = null;

        /**
         * ### Chat.stats
         *
         * Some basic statistics about message counts
         *
         * @see Chat.submit
         */
        this.stats = {
            received: 0,
            sent: 0,
            unread: 0
        };

        /**
         * ### Chat.receiverOnly
         *
         * If TRUE, users cannot send messages (no submit and textarea)
         *
         * @see Chat.submit
         */
        this.receiverOnly = false;

        /**
         * ### Chat.storeMsgs
         *
         * If TRUE, a copy of sent and received messages is stored in db
         *
         * @see Chat.db
         */
        this.storeMsgs = false;

        /**
         * ### Chat.db
         *
         * An NDDB database for storing incoming and outgoing messages
         *
         * @see Chat.storeMsgs
         */
        this.db = null;

        /**
         * ### Chat.chatDiv
         *
         * The DIV wherein to display the chat
         */
        this.chatDiv = null;

        /**
         * ### Chat.textarea
         *
         * The textarea wherein to write and read
         */
        this.textarea = null;

        /**
         * ### Chat.submit
         *
         * The submit button
         */
        this.submit = null;

        /**
         * ### Chat.submitText
         *
         * The text on the submit button
         */
        this.submitText = null;

        /**
         * ### Chat.displayNames
         *
         * Array of names of the recipient/s of the message
         */
        this.displayNames = null;

        /**
         * ### Chat.recipientsIds
         *
         * Array of ids of the recipient/s of the message
         */
        this.recipientsIds = null;

        /**
         * ### Chat.recipientToNameMap
         *
         * Map recipients ids to names
         */
        this.recipientToNameMap = null;

        /**
         * ### Chat.recipientToSenderMap
         *
         * Map recipients ids to names
         */
        this.recipientToSenderMap = null;

        /**
         * ### Chat.senderToNameMap
         *
         * Map recipients ids to sender ids
         *
         * Note: The 'from' field of a message can be different
         * from the 'to' field of its reply (e.g., for MONITOR)
         */
        this.senderToNameMap = null;
    }

    // ## Chat methods

    /**
     * ### Chat.init
     *
     * Initializes the widget
     *
     * @param {object} options Optional. Configuration options.
     *
     * The  options object can have the following attributes:
     *   - `receiverOnly`: If TRUE, no message can be sent
     *   - `submitText`: The text of the submit button
     *   - `chatEvent`: The event to fire when sending/receiving a message
     *   - `displayName`: Function which displays the sender's name
     */
    Chat.prototype.init = function(options) {
        var tmp, i, rec;
        options = options || {};


        // Chat id.
        tmp = options.chatEvent;
        if (tmp) {
            if ('string' !== typeof tmp) {
                throw new TypeError('Chat.init: chatEvent must be a non-' +
                                    'empty string or undefined. Found: ' + tmp);
            }
            this.chatEvent = options.chatEvent;
        }
        else {
            this.chatEvent = 'CHAT';
        }

        // Store.
        this.storeMsgs = !!options.storeMsgs;
        if (this.storeMsgs) {
            if (!this.db) this.db = new NDDB();
        }

        // Participants.
        tmp = options.participants;
        if (!J.isArray(tmp) || !tmp.length) {
            throw new TypeError('Chat.init: participants must be ' +
                                'a non-empty array. Found: ' + tmp);
        }

        // Build maps.
        this.recipientsIds = new Array(tmp.length);
        this.recipientToSenderMap = {};
        this.recipientToNameMap = {};
        this.senderToNameMap = {};
        for (i = 0; i < tmp.length; i++) {
            if ('string' === typeof tmp[i]) {
                this.recipientsIds[i] = tmp[i];
                this.recipientToNameMap[tmp[i]] = tmp[i];
                this.recipientToSenderMap[tmp[i]] = tmp[i];
                this.senderToNameMap[tmp[i]] = tmp[i];
            }
            else if ('object' === typeof tmp[i]) {
                rec = tmp[i].recipient;
                this.recipientsIds[i] = rec;
                this.recipientToSenderMap[rec] = tmp[i].sender || rec;
                this.recipientToNameMap[rec] = tmp[i].name || rec;
                this.senderToNameMap[tmp[i].sender || rec] =
                    this.recipientToNameMap[rec];
            }
            else {
                throw new TypeError('Chat.init: particpants array must ' +
                                    'contain string or object. Found: ' +
                                    tmp[i]);
            }
        }

        // Chat button text.
        tmp = options.submitText;
        if (tmp) {
            if ('string' === typeof tmp) {
                throw new TypeError('Chat.init: submitText must be a non-' +
                                    'empty string or undefined. Found: ' + tmp);
            }
            this.submitText = options.submitText;
        }
        else {
            this.submitText = 'Chat';
        }

        // Other.
        this.uncollapseOnMsg = options.uncollapseOnMsg || false;
    };


    Chat.prototype.append = function() {
        var that;
        var inputGroup, span, ids;

        this.chatDiv = W.get('div', { className: 'chat_chat' });
        this.bodyDiv.appendChild(this.chatDiv);

        if (!this.receiverOnly) {
            that = this;

            // Input group.
            inputGroup = document.createElement('div');
            inputGroup.className = 'input-group';
            // Span group.
            span = document.createElement('span');
            span.className = 'input-group-btn';

            this.textarea = W.get('textarea', {
                className: 'chat_textarea form-control'
            });

            // Create buttons to send messages, if allowed.
            this.submit = W.get('button', {
                innerHTML: this.submitText,
                // className: 'btn btn-sm btn-secondary'
                className: 'btn btn-default chat_submit'
            });

            ids = this.recipientsIds;
            this.submit.onclick = function() {
                var msg, to;
                msg = that.readTextarea();
                if (msg === '') {
                    node.warn('no text, no chat message sent.');
                    return;
                }
                // Simplify things, if there is only one recipient.
                to = ids.length === 1 ? ids[0] : ids;
                that.writeMsg('outgoing', { msg: msg }); // to not used now.
                node.say(that.chatEvent, to, msg);
            };

            inputGroup.appendChild(this.textarea);
            span.appendChild(this.submit);
            inputGroup.appendChild(span);
            this.bodyDiv.appendChild(inputGroup);
        }
    };

    Chat.prototype.readTextarea = function() {
        var txt;
        txt = this.textarea.value;
        this.textarea.value = '';
        return txt.trim();
    };

    Chat.prototype.writeMsg = function(code, data) {
        W.add('span', this.chatDiv, { innerHTML: this.getText(code, data) });
        W.writeln('', this.chatDiv);
        this.chatDiv.scrollTop = this.chatDiv.scrollHeight;
    };

    Chat.prototype.listeners = function() {
        var that = this;

        node.on.data(this.chatEvent, function(msg) {
            if (!that.handleMsg(msg)) return;
            that.stats.received++;
            // Store message if so requested.
            if (that.storeMsgs) {
                that.db.insert({
                    from: msg.from,
                    text: msg.data,
                    time: node.timer.getTimeSince('step'),
                    timestamp: J.now()
                });
            }
            that.writeMsg('incoming', { msg: msg.data, id: msg.from });
        });

        node.on.data(this.chatEvent + '_QUIT', function(msg) {
            if (!that.handleMsg(msg)) return;
            that.writeMsg('quit', { id: msg.from });
        });
    };

    Chat.prototype.handleMsg = function(msg) {
        var from, args;
        from = msg.from;
        if (from === node.player.id || from === node.player.sid) {
            node.warn('Chat: your own message came back: ' + msg.id);
            return false;
        }
        if (this.isCollapsed()) {
            if (this.uncollapseOnMsg) {
                this.uncollapse();
            }
            else {
                // TODO: highlight better. Play sound?
                this.setTitle('<strong>' + this.title + '</strong>');
                this.stats.unread++;
            }
        }
        return true;
    };

    Chat.prototype.destroy = function() {
        node.say(this.chatEvent + '_QUIT', this.recipientsIds);
    };

    Chat.prototype.getValues = function() {
        var out;
        out = {
            names: this.displayNames,
            participants: this.participants,
            totSent: this.stats.sent,
            totReceived: this.stats.received,
            totUnread: this.stats.unread
        };
        if (this.db) out.msgs = db.fetch();
        return out;
    };

})(node);
