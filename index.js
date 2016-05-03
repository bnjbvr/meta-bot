var irc = require('irc');

var config = require('./config');

var karma = require('./karma')(config);
var censorship = require('./censorship')(config);
var quotes = require('./quote')(config);
var memos = require('./memo')(config);

var bodyguard = require('./bodyguard')(config, karma);
var horse = require('./horse')(config, censorship);

var onMessageListeners = [];
var otherListeners = [];

addExtension(bodyguard);
addExtension(karma);
addExtension(memos);
addExtension(censorship);
addExtension(quotes);
addExtension(horse);

var ignorees = ['mrgiggles', config.nick];
function ignore(from) {
    return ignorees.indexOf(from) !== -1 ||
           from.indexOf('bot') !== -1;
}

function addExtension(importedModule)
{
    if (typeof importedModule === 'function') {
        onMessageListeners.push(importedModule);
    } else {
        onMessageListeners.push(importedModule.onMessage);
        for (var i in importedModule) {
            if (i === 'onMessage')
                continue;

            console.log('adding listener for', i);
            otherListeners.push({
                key: i,
                listener: importedModule[i]
            });
        }
    }
}

function run()
{
    var client = new irc.Client(config.server, config.nick, {
        debug: true,
        channels: config.channels,
        userName: config.userName,
        realName: config.realName,
        retryDelay: 120000
    });

    var say = client.say.bind(client);
    function callNext(index, from, chan, message) {
        if (index >= onMessageListeners.length)
            return;
        if (typeof onMessageListeners[index] !== 'function')
            return;
        if (ignore(from))
            return;
        onMessageListeners[index](from, chan, message, say, function() {
            callNext(index + 1, from, chan, message);
        });
    }

    client.on('message', function(from, chan, message) {
        callNext(0, from, chan, message);
    });

    for (var i = 0; i < otherListeners.length; i++) {
        var pair = otherListeners[i];
        client.on(pair.key, function() {
            var args = [].slice.call(arguments);
            args = [say].concat(args);
            pair.listener.apply(null, args);
        });
    }
}

run(config);
