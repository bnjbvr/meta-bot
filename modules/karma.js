var utils = require('../utils');

var FILENAME;
var KARMAS = {};

var BLOCKED = {};
var DEBOUNCING_RATE = 5000; // ms

var log = utils.makeLogger('karma');

function loadKarmas() {
    var content;
    try {
        content = utils.readFile(FILENAME) || '{}';
        KARMAS = JSON.parse(content);
    } catch(e) {
        log("error when loading karmas:", e.message, e.stack);
    }
}

function writeKarmas() {
    utils.writeFileAsync(FILENAME, JSON.stringify(KARMAS));
}

function findWho(msg, sep) {
    var who = msg.split(sep);
    if (!who.length)
        return;
    who = who[0].trim().split(' ');
    if (!who.length)
        return;
    return who[who.length - 1];
}

function getKarma(who) {
    KARMAS[who] = KARMAS[who] || 0;
    return KARMAS[who];
}

function applyKarma(who, val) {
    var modifier = val === '++' ? +1 : -1;
    KARMAS[who] = getKarma(who) + modifier;
    writeKarmas();
}

function applyKarmaAndBlock(from, who, val) {
    applyKarma(who, val);

    var key = from + '-' + who;
    BLOCKED[key] = true;
    setTimeout(function() {
        delete BLOCKED[key];
    }, DEBOUNCING_RATE);
}

function isBlocked(from, who) {
    return typeof BLOCKED[from + '-' + who] !== 'undefined';
}

function karmabot(say, from, chan, message) {
    var who;

    if (message.indexOf('!karma') === 0) {
        who = message.split('!karma')[1];
        if (!who)
            return true;

        who = who.trim().split(' ')[0];
        if (!who)
            return true;

        say(chan, who + " has a karma of " + getKarma(who));
        return false;
    }

    var actions = ['++', '--'];
    for (var i = 0; i < actions.length; i++) {

        var action = actions[i];
        if (message.indexOf(action) === -1) {
            continue;
        }

        who = findWho(message, action);

        if (typeof who === 'undefined') {
            say(chan, "I don't know who is " + who);
            return false;
        }

        if (from === who) {
            say(chan, "one can't apply karma to themselves!");
            return false;
        }

        if (isBlocked(from, who)) {
            say(chan, "trying to apply karma too fast, aborting.");
            return false;
        }

        applyKarmaAndBlock(from, who, action);
        return true;
    }

    return true;
}

module.exports = function(context, params) {
    FILENAME = params.filename || 'karma.dat';
    DEBOUNCING_RATE = params.debouncing_rate || DEBOUNCING_RATE;

    loadKarmas();

    log('Setting up module with filename=', FILENAME, ' and debouncing_rate=', DEBOUNCING_RATE);
    log('Found karma for', Object.keys(KARMAS).length, 'people');

    return {
        listeners: {
            message: karmabot
        },
        exports: {
            plusplus(somebody) {
                applyKarma(somebody, '++');
            },
            minusminus(somebody) {
                applyKarma(somebody, '--');
            },
            description: "Counts karma (i.e. instances of pseudo++ and pseudo--).",
            help: "- Whenever you add ++ or -- to a given name, it will affect this user's karma as saved in the database.\n" +
                "- To know the karma of somebody, just say: !karma nickname"
        }
    }
};
