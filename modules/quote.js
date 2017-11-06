var utils = require('../utils');

var CARRY_ON = utils.CARRY_ON;
var ABORT = utils.ABORT;

var log = utils.makeLogger('quote');

var QUOTES = {};
var FILENAME = '';
var BACKLOG = {};
var BACKLOG_MEMORY

var ADD_QUOTE_REGEXP = /^!aq (\S*) (\S*)\s*$/;
var REMOVE_QUOTE_REGEXP = /^!rq (\S*)\s*$/;
var QUOTE_REGEXP = /^!q (\S*)( (\S*))?\s*$/;

function onMessage(say, from, chan, message) {
    var tryAQ = ADD_QUOTE_REGEXP.exec(message);
    if (tryAQ !== null) {
        var who = tryAQ[1];
        var keyword = tryAQ[2];

        var backlog = BACKLOG[who] || [];

        var what = null;
        for (var i = 0; i < backlog.length; i++) {
            var line = backlog[i];
            if (line.indexOf(keyword) >= 0) {
                what = line;
                break;
            }
        }

        if (what === null)
            return CARRY_ON;

        say(chan, from + ', quote added for ' + who + '.');
        QUOTES[who] = QUOTES[who] || [];
        QUOTES[who].push({
            what: what,
            when: Date.now()
        });

        utils.writeFileAsync(FILENAME, QUOTES);
        return ABORT;
    }

    var tryQ = QUOTE_REGEXP.exec(message);
    if (tryQ !== null) {
        var who = tryQ[1];

        if (typeof QUOTES[who] === 'undefined') {
            say(chan, "no quotes for " + who);
            return CARRY_ON;
        }

        var maybeWhat = tryQ[3];
        var q = QUOTES[who];
        for (var i = 0; i < q.length; i++) {
            if (typeof maybeWhat === 'undefined' || q[i].what.indexOf(maybeWhat) >= 0) {
                var when = (new Date(q[i].when)).toLocaleString().replace('GMT', 'UTC');
                say(chan, who + ' - ' + when + ' - ' + q[i].what);
            }
        }

        return ABORT;
    }

    var tryRQ = REMOVE_QUOTE_REGEXP.exec(message);
    if (tryRQ !== null) {
        var what = tryRQ[1];
        if (typeof QUOTES[from] === 'undefined') {
            return CARRY_ON;
        }
        var q = QUOTES[from];
        for (var i = 0; i < q.length; i++) {
            if (q[i].what.indexOf(what) >= 0) {
                say(chan, from + ', removed your quote containing `' + what + '`.');

                q.splice(i, 1);
                utils.writeFileAsync(FILENAME, QUOTES);

                return ABORT;
            }
        }
        say(chan, from + ", didn't found your quote.");
    }

    BACKLOG[from] = BACKLOG[from] || [];
    if (BACKLOG[from].length >= BACKLOG_MEMORY) {
        BACKLOG[from].shift();
    }
    BACKLOG[from].push(message);

    return CARRY_ON;
}

module.exports = function(context, params) {
    FILENAME = params.filename || 'quotes.dat';
    QUOTES = JSON.parse(utils.readFile(FILENAME) || '{}');

    BACKLOG_MEMORY = params.backlog_memory || 10;

    var numQuotes = 0;
    for (var who in QUOTES) {
        numQuotes += QUOTES[who].length;
    }

    log('Setting up module with file=', FILENAME, ', backlog_memory=', BACKLOG_MEMORY);
    log(numQuotes, 'known quotes');

    return {
        listeners: {
            message: onMessage
        },
        exports: {
            description: "Fortunes-like module: save quotes of people for later out-of-context lulz.",
            help: "- To save SOMEBODY's quote, assuming this quote includes the text 'HELLO', just do !aq SOMEBODY HELLO\n" +
                "This bot has been configured to memorize the last " + BACKLOG_MEMORY + " messages of each person only.\n" +
                "- To get SOMEBODY's quotes, just say: !q SOMEBODY [EXCERPT]?\n" +
                "- To get one of your quotes removed, just say: !rq EXCERPT"
        }
    };
}
