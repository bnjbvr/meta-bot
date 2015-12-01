var OWNER = '';
var KARMA = {};

module.exports = function(config, karma) {
    OWNER = config.owner;
    KARMA = karma;
    return bodyguard;
}

var DUMMY_CALLBACK = function() {};

function bodyguard(from, chan, message, say, next) {
    if (message.indexOf(OWNER + '--') !== -1) {
        say(chan, OWNER + '++');
        say(chan, from + '--');
        // Craft special messages so that karma gets taken into account
        KARMA(Math.random(), chan, OWNER + '++', DUMMY_CALLBACK, DUMMY_CALLBACK);
        KARMA(Math.random(), chan, from + '--', DUMMY_CALLBACK, DUMMY_CALLBACK);
    }
    next();
}

