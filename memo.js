var utils = require('./utils');

var MEMOS = {};
var FILENAME = '';
var BOT_NICK = '';

module.exports = function(config) {
    FILENAME = (config.memo && config.memo.filename) || 'memo.dat';
    MEMOS = JSON.parse(utils.readFile(FILENAME) || '{}');
    BOT_NICK = config.nick;
    return {
        onMessage: addMemo,
        join: onJoin,
        names: onNames
    };
}

function addMemo(from, chan, message, say, next) {
    if (message.indexOf("!memo") === 0) {
        var cmd = message.split('!memo');
        if (cmd.length < 2)
            return next();

        cmd = cmd[1].trim();
        if (!cmd)
            return next();

        cmd = cmd.split(' ');
        if (cmd.length < 2)
            return next();

        var who = cmd.shift();
        if (who === BOT_NICK)
            return next();

        var what = cmd.join(' ');

        say(chan, from + ', memo added for ' + who + '.');

        MEMOS[chan] = MEMOS[chan] || {};
        MEMOS[chan][who] = MEMOS[chan][who] || [];

        MEMOS[chan][who].push({
            from: from,
            what: what,
            when: Date.now()
        });

        utils.writeFileAsync(FILENAME, JSON.stringify(MEMOS));
        return;
    }

    next();
}

function releaseMemos(say, chan, nick) {
    if (typeof MEMOS[chan] === 'undefined')
        return;

    if (typeof MEMOS[chan][nick] === 'undefined')
        return;

    var memos = MEMOS[chan][nick];
    if (!memos.length)
        return;

    while (memos.length) {
        var memo = memos.shift();
        var when = (new Date(memo.when)).toLocaleString().replace('GMT', 'UTC');
        say(chan, nick + ', ' + memo.from + ' left this for you: "' + memo.what + '" (' + when + ')');
    }

    utils.writeFileAsync(FILENAME, JSON.stringify(MEMOS));
}

function onNames(say, chan, nicks) {
    if (typeof nicks !== 'object')
        return;

    for (var nick in nicks) {
        releaseMemos(say, chan, nick);
    }
}

function onJoin(say, chan, nick, message) {
    if (nick === BOT_NICK)
        return;
    releaseMemos(say, chan, nick);
}
