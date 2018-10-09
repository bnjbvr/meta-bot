var utils = require("../utils");

var CARRY_ON = utils.CARRY_ON;
var ABORT = utils.ABORT;

var FILENAME;
var KARMAS = {};

var BLOCKED = {};
var DEBOUNCING_RATE = 5000; // ms

var log = utils.makeLogger("karma");

function loadKarmas() {
  var content;
  try {
    content = utils.readFile(FILENAME) || "{}";
    KARMAS = JSON.parse(content);
  } catch (e) {
    log("error when loading karmas:", e.message, e.stack);
  }
}

function findWho(msg, sep) {
  var who = msg.split(sep);
  if (!who.length) return;
  who = who[0].trim().split(" ");
  if (!who.length) return;
  return who[who.length - 1];
}

function getKarma(who) {
  KARMAS[who] = KARMAS[who] || 0;
  return KARMAS[who];
}

function applyKarma(who, val) {
  KARMAS[who] = getKarma(who) + val;
  utils.writeFileAsync(FILENAME, KARMAS);
}

var R_KARMA = /^!karma (\S+)/;
var R_PLUS = /(?!.*(\+)\1{2})(\S+)(\+){2}/;
var R_MINUS = /(?!.*(-)\1{2})(\S+)(\-){2}/;

function onMessage(say, from, chan, message) {
  var who;

  var tryQ = R_KARMA.exec(message);
  if (tryQ !== null) {
    who = tryQ[1];
    if (!who || !who.length) return CARRY_ON;
    say(chan, who + " has a karma of " + getKarma(who));
    return ABORT;
  }

  var actions = [R_PLUS, R_MINUS];
  for (let action of actions) {
    var tryR = action.exec(message);
    if (tryR === null) {
      continue;
    }

    who = tryR[2];
    if (
      typeof who === "undefined" ||
      !who.length ||
      from === who ||
      typeof BLOCKED[from + "-" + who] !== "undefined"
    ) {
      return CARRY_ON;
    }

    applyKarma(who, action === R_PLUS ? 1 : -1);

    var key = from + "-" + who;
    BLOCKED[key] = true;
    setTimeout(function() {
      delete BLOCKED[key];
    }, DEBOUNCING_RATE);

    return ABORT;
  }

  return CARRY_ON;
}

module.exports = function(context, params) {
  FILENAME = params.filename || "karma.dat";
  DEBOUNCING_RATE = params.debouncing_rate || DEBOUNCING_RATE;

  loadKarmas();

  log(
    "Setting up module with filename=",
    FILENAME,
    "and debouncing_rate=",
    DEBOUNCING_RATE
  );
  log("Found karma for", Object.keys(KARMAS).length, "people");

  return {
    listeners: {
      message: onMessage
    },
    exports: {
      plusplus(somebody) {
        applyKarma(somebody, 1);
      },
      minusminus(somebody) {
        applyKarma(somebody, -1);
      },
      description: "Counts karma (i.e. instances of pseudo++ and pseudo--).",
      help:
        "- Whenever you add ++ or -- to a given name, it will affect this user's karma as saved in the database.\n" +
        "- To know the karma of somebody, just say: !karma nickname"
    }
  };
};
