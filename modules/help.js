var utils = require('../utils');

var log = utils.makeLogger('help');

var NICK = null;
var descriptions = {};
var topics = {};

function help(say, from, chan, message) {
    var topic = null;
    var trigger = false;

    var privateMessage = from === chan;

    if (message.indexOf('!help') === 0) {
        trigger = true;
        topic = message.split('!help')[1];
        topic = topic && topic.trim().split(' ')[0];
    } else if ((message.indexOf(NICK) !== -1 || privateMessage)
               && message.indexOf('help') !== -1) {
        trigger = true;
        topic = message.split('help')[1];
        topic = topic && topic.trim().split(' ')[0];
    }

    if (!trigger)
        return true;

    if (!privateMessage)
        say(chan, from + ", see private messages.");

    if (topic) {
        if (typeof topics[topic] === 'undefined') {
            say(from, "no help found for " + topic + ".");
        } else {
            say(from, topics[topic]);
        }
    } else {
        say(from, "This is an instance of meta-bot (https://github.com/bnjbvr/meta-bot), a generic IRC bot that can be extended with modules to perform basic tasks.");
        say(from, "The following modules are enabled (and have a description):");
        for (var name in descriptions) {
            say(from, '- ' + name + ': ' + descriptions[name]);
        }
        say(from, "You can ask for more help about a specific module with !help MODULE_NAME.");
    }

    return false;
}

module.exports = function(context, params) {
    NICK = context.nick;

    log('Help module alive, waiting for help registrations.');

    function registerHelp(context) {
        log('Registering help...');

        var numDescriptions = 0, numTopics = 0;
        for (var name in context.exports) {
            var module = context.exports[name] || {};

            if (typeof module.help !== 'undefined') {
                topics[name] = module.help;
                numTopics++;
            }

            if (typeof module.description !== 'undefined') {
                descriptions[name] = module.description;
                numDescriptions++;
            }
        }

        log('Module set up:', numDescriptions, 'descriptions and', numTopics, 'topics found.');
    }

    return {
        listeners: {
            message: help
        },
        afterRegister: registerHelp
    }
}
