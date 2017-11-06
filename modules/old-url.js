var utils = require('../utils');

var log = utils.makeLogger('#old');

var request = require('request');

var oldMap = {};
var FILENAME = '';

var URL_REGEXP = /(http(s)?:\/\/(\S*))/;

function onMessage(say, from, chan, message) {
    var tryRegexp = URL_REGEXP.exec(message);
    if (tryRegexp === null)
        return;

    var url = tryRegexp[1];
    if (typeof oldMap[url] !== 'undefined') {
        var entry = oldMap[url];
        var localeString = new Date(entry.when).toLocaleString().replace('GMT', 'UTC');
        say(chan, '#old, ' + entry.who + ' already posted it on ' + localeString);
        return utils.ABORT;
    }

    request(url, function(err, res, body) {
        if (res && res.statusCode === 200) {
            oldMap[url] = {
                who: from,
                when: Date.now()
            };
            utils.writeFileAsync(FILENAME, oldMap);
        }
    });
}

module.exports = function(context, params) {
    FILENAME = (params && params.filename) || 'old.data';

    oldMap = JSON.parse(utils.readFile(FILENAME) || '{}');

    var numURLs = Object.keys(oldMap).length;
    log('Setting up module #old:', numURLs, 'known URLs.');

    return {
        listeners: {
            message: onMessage
        },
        exports: {
            description: "Will let you know every time you post an URL that's already been posted.",
        }
    }
};
