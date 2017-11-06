var utils = require('../utils');

var CARRY_ON = utils.CARRY_ON;
var ABORT = utils.ABORT;

var log = utils.makeLogger('quote');

var QUOTES = {};
var FILENAME = '';
var BACKLOG = {};
var BACKLOG_MEMORY

function onMessage(say, from, chan, message) {
    if (message.indexOf("!aq") === 0) {
        var cmd = message.split('!aq');
        if (cmd.length < 2)
            return CARRY_ON;

        cmd = cmd[1].trim();
        if (!cmd)
            return CARRY_ON;

        cmd = cmd.split(' ');
        if (cmd.length < 2)
            return CARRY_ON;

        var who = cmd.shift();

        var backlog = BACKLOG[who] || [];
        var what = null;
        for (var i = 0; i < backlog.length; i++) {
            var line = backlog[i];
            for (var j = 0; j < cmd.length; j++) {
                if (line.indexOf(cmd[j]) !== -1) {
                    what = line;
                    break;
                }
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

    if (message.indexOf("!q") === 0) {
        var who = message.split('!q');
        if (who.length < 2)
            return CARRY_ON;

        who = who[1].trim().split(' ')[0];
        if (!who)
            return CARRY_ON;

        who = who.trim();
        if (typeof QUOTES[who] === 'undefined') {
            say(chan, "no quotes for " + who);
            return CARRY_ON;
        }

        var q = QUOTES[who];
        for (var i = 0; i < q.length; i++) {
            var when = (new Date(q[i].when)).toLocaleString().replace('GMT', 'UTC');
            say(chan, who + ' - ' + when + ' - ' + q[i].what);
        }
        return ABORT;
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
                "- To get SOMEBODY's quotes, just say: !q SOMEBODY"
        }
    };
}
