var fs = require('fs');

var FILENAME;
var KARMAS = {};

var BLOCKED = {};
var DEBOUNCING_RATE = 5000; // ms

function loadKarmas() {
    var content;
    try {
        content = fs.readFileSync(FILENAME, {flag: 'a+', encoding: 'utf-8'}) || '{}';
        KARMAS = JSON.parse(content);
    } catch(e) {
        console.error("when loading karmas:", e.message, e.stack);
    }
}

function writeKarmas() {
    fs.writeFile(FILENAME, JSON.stringify(KARMAS), {flag: 'w+', encoding: 'utf-8'}, function(err) {
        if (err)
            console.error("when writing karmas: ", err.message, err.stack);
    });
}

module.exports = function(config) {
    FILENAME = (config.karma && config.karma.filename) || 'karma.dat';
    DEBOUNCING_RATE = (config.karma && config.karma.debouncing_rate) || DEBOUNCING_RATE;
    loadKarmas();
    return karmabot;
};

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

function applyKarma(from, who, val) {
    var modifier = val === '++' ? +1 : -1;
    KARMAS[who] = getKarma(who) + modifier;

    var key = from + '-' + who;
    BLOCKED[key] = true;
    setTimeout(function() {
        delete BLOCKED[key];
    }, DEBOUNCING_RATE);

    writeKarmas();
}

function isBlocked(from, who) {
    return typeof BLOCKED[from + '-' + who] !== 'undefined';
}

function karmabot(from, chan, message, say, next) {
    var who;

    if (message.indexOf('karma') === 0) {
        who = message.split('karma')[1];
        if (!who)
            return next();
        who = who.trim().split(' ')[0];
        if (!who)
            return next();
        say(chan, who + " has a karma of " + getKarma(who));
        return next();
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
            return next();
        }

        if (from === who) {
            say(chan, "one can't apply karma to themselves");
            return next();
        }

        if (isBlocked(from, who)) {
            say(chan, "too many karma actions towards " + who + " from " + from + ", aborting");
            return next();
        }

        applyKarma(from, who, action);
        return next();
    }

    return next();
}

