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

function setupListener(context, client, say, key, descs) {
    log('Setting up listener', key);

    client.on(key, function() {
        // Pass the 'say' function and the listener arguments.
        var args = [].slice.call(arguments);
        args = [say].concat(args);

        // Special handlings
        if (key === 'message') {
            // Replace 'chan' by 'from' if it's a private message.
            if (args[2] === context.nick) {
                args[2] = args[1];
            }
        }

        log('Calling listeners for', key);

        // Start with listeners.
        var foundMatchingListener = false;
        for (var i = 0; i < descs.length; i++) {
            if (foundMatchingListener) {
                break;
            }

            var desc = descs[i];
            for (var j = 0; j < desc.funcs.length; j++) {
                var keepOn = false;

                try {
                    keepOn = desc.funcs[j].apply(null, args);
                } catch(e) {
                    log('Error when applying listener for', desc.name, ':\n', e.toString());
                }

                if (!keepOn) {
                    log('Module', desc.name, 'is aborting, stopping.');
                    foundMatchingListener = true;
                }
            }
        }

        if (context.enablePTP && key == 'message' && !foundMatchingListener && args[3].indexOf(context.nick) === 0) {
            say(args[2], args[1] + ": PTP");
        }
    });
}

function importModule(context, listeners, desc) {
    if (!desc.enabled)
        return;

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

        var entry = {
            name: desc.name,
            funcs: funcs
        };

        if (desc.deferInit) {
            // TODO works only correctly when there's one deferred module, meh,
            // who needs more?
            listeners[key].unshift(entry);
        } else {
            listeners[key].push(entry);
        }

        context.exports[desc.name] = module.exports;
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

    var context = {
        owner: config.owner,
        nick: config.nick,
        enablePTP: config.enablePTP,
        exports: {}
    };

    // Determine order of module imports.
    var startModules = [];
    var endModules = [];
    for (var i = 0; i < config.modules.length; i++) {
        var desc = config.modules[i];
        if (desc.deferInit)
            endModules.push(desc);
        else
            startModules.push(desc);
    }

    // Maps event => [{ name: String, enabled: Boolean, funcs: [Function]}]
    var listeners = {};

    // Trigger module imports.
    for (var i = 0; i < startModules.length; i++) {
        importModule(context, listeners, startModules[i]);
    }
    for (var i = 0; i < endModules.length; i++) {
        importModule(context, listeners, endModules[i]);
    }

    for (var key in listeners) {
        setupListener(context, client, say, key, listeners[key]);
    }
}

run(config);
