var irc = require("irc");
var fs = require("fs");
var path = require("path");
var toml = require("toml");
var utils = require("./utils");

var log = utils.makeLogger("main");

function makeConfig(filename) {
  var config;
  try {
    config = toml.parse(fs.readFileSync(filename, "utf8"));
  } catch (err) {
    console.error(
      `Can't parse config.toml file, please fix it (line ${err.line}, column ${
        err.column
      })`
    );
    console.error(err.message);
    process.exit(-1);
  }
  return config;
}

function registerModule(context, listeners, name, params) {
  var relativePath = path.join("modules", name);

  // Each module returns an object with the shape:
  // {
  //  listeners: {
  //      listenerName: [func1, func2],
  //      otherListenerName: func
  //  }
  //  exports: { }
  // }
  var module;
  try {
    module = require("./" + relativePath)(context, params);
  } catch (err) {
    console.error(
      `Unable to load module ${name}. Are you sure it exists or it is well defined?`
    );
    return;
  }

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
      name: name,
      funcs: funcs
    });

    context.exports[name] = module.exports;
  }

  if (typeof module.afterRegister === "function") {
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

  log("Setting up listener", key);

  client.on(key, function() {
    // Pass the 'say' function and the listener arguments.
    var args = [say].concat([].slice.call(arguments));

    // Special treatments.
    if (key === "message") {
      // Replace 'chan' by 'from' if it's a private message.
      if (args[2] === context.nick) {
        args[2] = args[1];
      }
    }

    log("Calling listeners for", key);

    // Start with listeners.
    out: for (let desc of descs) {
      for (let func of desc.funcs) {
        var carryOn;
        try {
          carryOn = func.apply(null, args);
        } catch (e) {
          log(
            "Error when applying listener for",
            desc.name,
            ":\n",
            e.toString()
          );
        }
        if (typeof carryOn !== "undefined" && !carryOn) {
          log("Module", desc.name, "is aborting, stopping.");
          break out;
        }
      }
    }
  });
}

function run(config) {
  let client = new irc.Client(config.irc.server, config.irc.nick, {
    debug: true,
    channels: config.irc.channels,
    userName: config.irc.userName,
    realName: config.irc.realName,
    retryDelay: 120000
  });

  let context = {
    owner: config.irc.owner,
    nick: config.irc.nick,
    exports: {},
    afterRegister: []
  };

  // Maps event => [{ name: String, funcs: [Function]}]
  let listeners = {};

  for (let moduleName of config.modules.enabled) {
    let moduleParams = config.modules[moduleName] || {};
    registerModule(context, listeners, moduleName, moduleParams);
  }
  triggerAfterRegister(context);

  for (let key in listeners) {
    setupListener(context, client, key, listeners[key]);
  }
}

(function() {
  let args = require("yargs-parser")(process.argv.slice(2));
  let configFileName = args.config || "config.toml";
  run(makeConfig(configFileName));
})();
