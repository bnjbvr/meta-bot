var irc = require('irc');
var path = require('path');

var utils = require('./utils');
var config = require('./config');

var log = utils.makeLogger('main');

var ignorees = config.ignorees || [];

function ignore(nick) {
    return ignorees.indexOf(nick) !== -1 ||
           from.indexOf('bot') !== -1;
}

function setupListener(client, say, key, descs) {
    log('Setting up listener', key);

    client.on(key, function() {
        // Pass the 'say' function and the listener arguments.
        var args = [].slice.call(arguments);
        args = [say].concat(args);

        log('Calling listeners for', key);

        // Start with listeners.
        out:
            for (var i = 0; i < descs.length; i++) {
            var desc = descs[i];
            if (!desc.enabled)
                continue;

            for (var j = 0; j < desc.funcs.length; j++) {
                var keepOn = false;

                try {
                    keepOn = desc.funcs[j].apply(null, args);
                } catch(e) {
                    log('Error when applying listener for', desc.name, ':\n', e.toString());
                }

                if (!keepOn) {
                    log('Module', desc.name, 'is aborting, stopping.');
                    break out;
                }
            }
        }
    });
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

    var context = {
        owner: config.owner,
        nick: config.nick,
        exports: {}
    };

    // Maps event => [{ name: String, enabled: Boolean, funcs: [Function]}]
    var listeners = {};

    for (var i = 0; i < config.modules.length; i++) {
        var desc = config.modules[i];

        var relativePath = path.join('modules', desc.name);

        // Each module returns an object of the form:
        // {
        //  listeners: {
        //      listenerName: [func1, func2],
        //      otherListenerName: func
        //  }
        //  exports: { }
        // }
        var module = require('./' + relativePath)(context, desc.params);

        module.listeners = module.listeners || {};

        for (var key in module.listeners) {
            var funcs = module.listeners[key];
            if (!(funcs instanceof Array)) {
                funcs = [funcs];
            }

            listeners[key] = listeners[key] || [];

            listeners[key].push({
                name: desc.name,
                enabled: desc.enabled,
                funcs: funcs
            });

            context.exports[desc.name] = module.exports;
        }
    }

    for (var key in listeners) {
        setupListener(client, say, key, listeners[key]);
    }
}

run(config);
