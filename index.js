var irc = require('irc');

var config = require('./config');

var horse = require('./horse')(config);
var karma = require('./karma')(config);
var bodyguard = require('./bodyguard')(config, karma);
var censorship = require('./censorship')(config);

var extensions = [bodyguard, karma, censorship, horse];

var ignorees = ['mrgiggles', config.nick];
function ignore(from) {
    return ignorees.indexOf(from) !== -1 ||
           from.indexOf('bot') !== -1;
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

    var onMessageListeners = extensions;

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
}

run(config);
