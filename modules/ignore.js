var utils = require('../utils');

var ABORT = utils.ABORT;
var log = utils.makeLogger('ignorees');

var IGNOREES = [];
var IGNORE_BOTS = false;

function onMessage(say, from, chan, message) {
    for (let ignoree of IGNOREES) {
        if (from === ignoree)
            return ABORT;
    }
    if (IGNORE_BOTS && from.indexOf('bot') >= 0) {
        return ABORT;
    }
}

module.exports = function(context, params) {
    IGNOREES = params.ignorees || [];
    if (!(IGNOREES instanceof Array)) {
        IGNOREES = [IGNOREES];
    }

    IGNORE_BOTS = !!params.bots;

    log('Setting up module with ignorees=', IGNOREES.join(', '), 'and IGNORE_BOTS=', IGNORE_BOTS);

    return {
        listeners: {
            message: onMessage
        },
        exports: {
            description: "Can ignore persons taken on a list as well as bots",
        }
    }
};
