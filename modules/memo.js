var utils = require('../utils');

var MEMOS = {};
var FILENAME = '';
var BOT_NICK = '';

var log = utils.makeLogger('memo');

function addMemo(say, from, chan, message) {
    if (message.indexOf("!memo") === 0) {
        var cmd = message.split('!memo');
        if (cmd.length < 2)
            return true;

        cmd = cmd[1].trim();
        if (!cmd)
            return true;

        cmd = cmd.split(' ');
        if (cmd.length < 2)
            return true;

        var who = cmd.shift();
        if (who === BOT_NICK)
            return true;

        var what = cmd.join(' ');

        say(chan, from + ', memo added.');

        MEMOS[chan] = MEMOS[chan] || {};
        MEMOS[chan][who] = MEMOS[chan][who] || [];

        MEMOS[chan][who].push({
            from: from,
            what: what,
            when: Date.now()
        });

        utils.writeFileAsync(FILENAME, JSON.stringify(MEMOS));
        return false;
    }

    return true;
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
        return true;

    for (var nick in nicks) {
        releaseMemos(say, chan, nick);
    }

    return true;
}

function onJoin(say, chan, nick, message) {
    if (nick === BOT_NICK)
        return true;

    releaseMemos(say, chan, nick);
    return true;
}

module.exports = function(context, params) {
    FILENAME = params.filename || 'memo.dat';
    MEMOS = JSON.parse(utils.readFile(FILENAME) || '{}');

    BOT_NICK = context.nick;

    var numMemos = 0;
    for (var chan in MEMOS) {
        for (var memos in MEMOS[chan])
            numMemos += MEMOS[chan][memos].length;
    }

    log('Setting up module:', numMemos, 'memos awaiting to be released.');

    return {
        listeners: {
            message: addMemo,
            join: onJoin,
            names: onNames
        }
    };
}
