var irc = require('irc');
var request = require('request');
var config = require('./config');

function ignore(from) {
    return from.indexOf('firebot') !== -1 || from.indexOf('mrgiggles') !== -1;
}

function getTweet(cb) {
    request({
        uri: "http://javascript.horse"
    }, function(err, resp, body) {
        var sub = body.substr(body.indexOf('tweet-text'), 1000);
        sub = sub.substr(12, 1000);
        sub = sub.substr(0, sub.indexOf('</p>'));
        cb(sub);
    });
}

function horsejs(client)
{
    client.addListener('message', function (from, chan, message) {
        if (ignore(from))
            return;

        if (message.indexOf('horsejs') !== -1) {
            getTweet(function (tweet) {
                client.say(chan, tweet);
            });
        }
    });
}

var extensions = [horsejs];

function run()
{
    var client = new irc.Client(config.server, config.nick, {
        debug: true,
        channels: config.channels,
        userName: config.userName,
        realName: config.realName,
        retryDelay: 120000
    });

    for (var i = 0, e = extensions.length; i < e; ++i) {
        extensions[i](client);
    }
}

function changeName()
{
    var names = ['john', 'mark', 'robert', 'rubber', 'patrick', 'wu', 'lulz', 'troll', 'wat'];
    var number = Math.floor(Math.random() * 255);
    var usedName = names[Math.floor(Math.random() * names.length)] + number;
    return {
        nick: usedName,
        userName: usedName,
        realName: usedName
    }
}

run(config);
