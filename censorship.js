const SECONDS = 1000; // ms
const MINUTES = SECONDS * 60;
const HOURS = MINUTES * 60;

var DEFAULT_CENSORSHIP_PERIOD = 5 * MINUTES;
var CENSORSHIP_MAP = {};
var NICK = '';

module.exports = function(config) {
    DEFAULT_CENSORSHIP_PERIOD = (config.censorship && +config.censorship.defaultPeriod) || 5 * MINUTES;
    CENSORSHIP_MAP = (config.censorship && config.censorship.periodMap) || {};
    NICK = config.nick;
    return censorship;
}

var SHUTUPMAP = {};

function censorship(from, chan, message, say, next) {
    if (message.indexOf(NICK) !== -1 &&
        (message.indexOf('shut up') !== -1 || message.indexOf('shutup') !== -1))
    {
        var censorshipPeriod = CENSORSHIP_MAP[chan] || DEFAULT_CENSORSHIP_PERIOD;

        SHUTUPMAP[chan] = true;
        console.log(Date.now(), "setting up censorship in ", chan);
        setTimeout(function() {
            console.log(Date.now(), "removing censorship in ", chan);
            delete SHUTUPMAP[chan];
        }, censorshipPeriod);

        // Don't call next.
        return;
    }

    if (typeof SHUTUPMAP[chan] === 'undefined')
        next();
}
