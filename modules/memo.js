var utils = require("../utils");

var CARRY_ON = utils.CARRY_ON;
var ABORT = utils.ABORT;

var MEMOS = {};
var FILENAME = "";
var BOT_NICK = "";

var log = utils.makeLogger("memo");

function onMessage(say, from, chan, message) {
  if (message.indexOf("!memo") !== 0) {
    return CARRY_ON;
  }

  var cmd = message.split("!memo");
  if (cmd.length < 2) return CARRY_ON;

  cmd = cmd[1].trim();
  if (!cmd) return CARRY_ON;

  cmd = cmd.split(" ");
  if (cmd.length < 2) return CARRY_ON;

  var who = cmd.shift();
  if (who === BOT_NICK) return CARRY_ON;

  var what = cmd.join(" ");

  say(chan, from + ", memo added.");

  MEMOS[chan] = MEMOS[chan] || {};
  MEMOS[chan][who] = MEMOS[chan][who] || [];

  MEMOS[chan][who].push({
    from: from,
    what: what,
    when: Date.now()
  });

  utils.writeFileAsync(FILENAME, MEMOS);
  return ABORT;
}

function releaseMemos(say, chan, nick) {
  if (typeof MEMOS[chan] === "undefined") return;

  if (typeof MEMOS[chan][nick] === "undefined") return;

  var memos = MEMOS[chan][nick];
  if (!memos.length) return;

  while (memos.length) {
    var memo = memos.shift();
    var when = new Date(memo.when).toLocaleString().replace("GMT", "UTC");
    say(
      chan,
      nick +
        ", " +
        memo.from +
        ' left this for you: "' +
        memo.what +
        '" (' +
        when +
        ")"
    );
  }

  delete MEMOS[chan][nick];

  utils.writeFileAsync(FILENAME, MEMOS);
}

function onNames(say, chan, nicks) {
  if (typeof nicks !== "object") {
    return;
  }
  for (var nick in nicks) {
    releaseMemos(say, chan, nick);
  }
}

function onJoin(say, chan, nick, message) {
  if (nick === BOT_NICK) return;
  releaseMemos(say, chan, nick);
}

function onNickChange(say, oldNick, newNick, chan, message) {
  if (oldNick === BOT_NICK || newNick === BOT_NICK) return;
  releaseMemos(say, chan, newNick);
}

module.exports = function(context, params) {
  FILENAME = params.filename || "memo.dat";
  MEMOS = JSON.parse(utils.readFile(FILENAME) || "{}");

  BOT_NICK = context.nick;

  var numMemos = 0;
  for (var chan in MEMOS) {
    for (var memos in MEMOS[chan]) numMemos += MEMOS[chan][memos].length;
  }

  log("Setting up module:", numMemos, "memos awaiting to be released.");

  return {
    listeners: {
      message: onMessage,
      join: onJoin,
      nick: onNickChange,
      names: onNames
    },
    exports: {
      description:
        "Give a way to store memos for people to read later when they reconnect.",
      help:
        "- To push a memo to the user SOMEBODY with content 'HELLO YOU', do !memo SOMEBODY HELLO YOU\n" +
        "The next time the user will reconnect, the memo will be publicly released in the same channel as you saved it and addressed to this person."
    }
  };
};
