var utils = require("../utils");

const SECONDS = 1000; // ms
const MINUTES = SECONDS * 60;
const HOURS = MINUTES * 60;

var nick = "";
var defaultCensorshipPeriod = 5 * MINUTES;
var censorshipMap = {};
var abortMap = {};

var log = utils.makeLogger("censorship");

function set(chan) {
  abortMap[chan] = utils.ABORT;

  var censorshipPeriod = censorshipMap[chan] || defaultCensorshipPeriod;
  log(
    Date.now(),
    "setting up censorship in ",
    chan,
    "for",
    censorshipPeriod / 1000,
    "seconds"
  );

  setTimeout(function() {
    log(Date.now(), "removing censorship in ", chan);
    abortMap[chan] = utils.CARRY_ON;
  }, censorshipPeriod);
}

function onMessage(say, from, chan, message) {
  if (
    message.indexOf(nick) === 0 &&
    (message.indexOf("shut up") !== -1 || message.indexOf("shutup") !== -1)
  ) {
    set(chan);
    return utils.ABORT;
  }
  return abortMap[chan];
}

module.exports = function(context, params) {
  nick = context.nick;

  defaultCensorshipPeriod =
    typeof params.defaultPeriod !== "undefined"
      ? params.defaultPeriod
      : 5 * MINUTES;
  censorshipMap = params.periodMap || {};

  log(
    "Setting up module with default censorship period(",
    defaultCensorshipPeriod,
    ")"
  );

  return {
    listeners: {
      message: onMessage
    },
    exports: {
      set: set,
      description: "Makes the bot shut up.",
      help:
        "Say 'shut up' or 'shutup' to the bot to force it to silence for " +
        defaultCensorshipPeriod +
        " seconds."
    }
  };
};
