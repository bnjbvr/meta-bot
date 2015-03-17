var irc = require('irc');
var request = require('request');
var config = require('./config');

function ignore(from) {
    return from.indexOf('firebot') !== -1 || from.indexOf('mrgiggles') !== -1;
}

function getTweet(cb) {
    request({
        uri: "http://javascript.horse/random.json"
    }, function(err, resp, body) {
        var json;
        try {
            json = JSON.parse(body);
        } catch (err) {
            cb('Error when retrieving the json feed:'+ err);
        }
        cb(json.text);
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
