var irc = require('irc');
var path = require('path');

var utils = require('./utils');
var config = require('./config');

var log = utils.makeLogger('main');

function registerModule(context, listeners, desc) {
    if (!desc.enabled)
        return;

    var relativePath = path.join('modules', desc.name);

    // Each module returns an object with the shape:
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

        // If this is the first module listening a key, create the listeners
        // array.
        listeners[key] = listeners[key] || [];

        // Pushes an entry describing the module functions to call.
        listeners[key].push({
            name: desc.name,
            funcs: funcs
        });

        context.exports[desc.name] = module.exports;
    }

    if (typeof module.afterRegister === 'function') {
        context.afterRegister.push(module.afterRegister);
    }
}

function triggerAfterRegister(context) {
    for (let func of context.afterRegister) {
        func(context);
    }
    delete context.afterRegister;
}

function setupListener(context, client, key, descs) {
    let say = client.say.bind(client);

    log('Setting up listener', key);

    client.on(key, function() {
        // Pass the 'say' function and the listener arguments.
        var args = [say].concat([].slice.call(arguments));

        // Special treatments.
        if (key === 'message') {
            // Replace 'chan' by 'from' if it's a private message.
            if (args[2] === context.nick) {
                args[2] = args[1];
            }
        }

        log('Calling listeners for', key);

        // Start with listeners.
        out:
        for (let desc of descs) {
            for (let func of desc.funcs) {
                var carryOn;
                try {
                    carryOn = func.apply(null, args);
                } catch(e) {
                    log('Error when applying listener for', desc.name, ':\n', e.toString());
                }
                if (typeof carryOn !== 'undefined' && !carryOn) {
                    log('Module', desc.name, 'is aborting, stopping.');
                    break out;
                }
            }
        }
    });
}

function run(config)
{
    let client = new irc.Client(config.server, config.nick, {
        debug: true,
        channels: config.channels,
        userName: config.userName,
        realName: config.realName,
        retryDelay: 120000
    });

    let context = {
        owner: config.owner,
        nick: config.nick,
        exports: {},
        afterRegister: []
    };

    // Maps event => [{ name: String, funcs: [Function]}]
    let listeners = {};

    for (let moduleDesc of config.modules) {
        registerModule(context, listeners, moduleDesc);
    }
    triggerAfterRegister(context);

    for (let key in listeners) {
        setupListener(context, client, key, listeners[key]);
    }
}

run(config);
