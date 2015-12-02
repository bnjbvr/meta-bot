var utils = require('./utils');

var QUOTES = {};
var FILENAME = '';
var BACKLOG = {};
var BACKLOG_MEMORY

module.exports = function(config) {
    FILENAME = (config.quotes && config.quotes.filename) || 'quotes.dat';
    QUOTES = JSON.parse(utils.readFile(FILENAME) || '{}');
    BACKLOG_MEMORY = (config.quotes && +config.quotes.backlog_memory) || 10;
    return quote;
}

function quote(from, chan, message, say, next) {
    if (message.indexOf("!aq") === 0) {
        var cmd = message.split('!aq');
        if (cmd.length < 2)
            return next();

        cmd = cmd[1].trim();
        if (!cmd)
            return next();

        cmd = cmd.split(' ');
        if (cmd.length < 2)
            return next();

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
            return next();

        say(chan, from + ', quote added for ' + who + ': "' + what + '".');
        QUOTES[who] = QUOTES[who] || [];
        QUOTES[who].push({
            what: what,
            when: Date.now()
        });

        utils.writeFileAsync(FILENAME, JSON.stringify(QUOTES));
        return next();
    }

    if (message.indexOf("!q") === 0) {
        var who = message.split('!q');
        if (who.length < 2)
            return next();

        who = who[1].trim().split(' ')[0];
        if (!who)
            return next();

        who = who.trim();
        if (typeof QUOTES[who] === 'undefined') {
            say(chan, "no quotes for " + who);
            return next();
        }

        var q = QUOTES[who];
        for (var i = 0; i < q.length; i++) {
            say(chan, who + ' - ' + (new Date(q[i].when)).toLocaleString() + ' - ' + q[i].what);
        }
        return next();
    }

    BACKLOG[from] = BACKLOG[from] || [];
    if (BACKLOG[from].length >= BACKLOG_MEMORY) {
        BACKLOG[from].shift();
    }
    BACKLOG[from].push(message);
    next();
}

