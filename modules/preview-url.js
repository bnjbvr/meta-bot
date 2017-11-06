var utils = require('../utils');

var log = utils.makeLogger('preview-url');

var request = require('request');
var cheerio = require('cheerio');

var URL_REGEXP = /(http(s)?:\/\/(\S*))/;

function onMessage(say, from, chan, message) {
    var tryRegexp = URL_REGEXP.exec(message);
    if (tryRegexp === null)
        return;

    var url = tryRegexp[1];
    request(url, function(err, res, body) {
        if (res && res.statusCode === 200) {
            var title = cheerio.load(body)('head title').text();
            if (title.length) {
                say(chan, title);
            }
        }
    });
    return utils.ABORT;
}

module.exports = function(context, params) {
    log('Setting up module preview-url.');

    return {
        listeners: {
            message: onMessage
        },
        exports: {
            description: "Will print the title of all given URLs",
        }
    }
};
