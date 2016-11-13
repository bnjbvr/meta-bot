var utils = require('../utils');

var OWNER = '';
var KARMA = {};

var plusplus = null;
var minusminus = null;

var log = utils.makeLogger('bodyguard');

function bodyguard(say, from, chan, message) {
    if (message.indexOf(OWNER + '--') !== -1) {
        log('Protection activated!');

        say(chan, OWNER + '++');
        plusplus(OWNER);

        say(chan, from + '--');
        minusminus(from);
    }
    return true;
}

module.exports = function(context, params) {
    OWNER = params.owner;

    if (typeof OWNER === 'undefined') {
        log('Bodyguard expects a param called "owner", aborting setup.');
        return {};
    }

    plusplus = context.exports.karma.plusplus;
    minusminus = context.exports.karma.minusminus;

    log('Setting up module to protect:', OWNER);

    return {
        listeners: {
            message: bodyguard
        }
    };
}

