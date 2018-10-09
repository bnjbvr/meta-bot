var cheerio = require("cheerio");
var request = require("request");

var utils = require("../utils");
var log = utils.makeLogger("gitlab-helpers");

const ISSUE_REGEXP = /(?:\s|^)#(\d+)/g;
const MERGE_REQUEST_REGEXP = /(?:\s|^)!(\d+)/g;

const CHAN_MESSAGE_COUNTERS = {};
const MENTION_CACHE = {};

var PARAMS;
var NICK;

module.exports = function(context, params) {
  NICK = context.nick;
  PARAMS = params;

  // Sanitize projectUrl
  if (typeof PARAMS.projectUrl !== "undefined") {
    var url = "" + PARAMS.projectUrl;
    if (url[url.length - 1] !== "/") {
      url += "/";
    }
    PARAMS.projectUrl = url;
  }

  log(`set up gitlab helpers for ${PARAMS.projectUrl}`);

  return {
    listeners: {
      message: onMessage
    },
    exports: {
      description: "Gitlab helpers to mention issues and merge requests.",
      help: "Gitlab helpers to mention issues and merge requests."
    }
  };
};

function onMessage(say, from, chan, message) {
  CHAN_MESSAGE_COUNTERS[chan] = (CHAN_MESSAGE_COUNTERS[chan] || 0) + 1;

  var matches = null;
  while ((matches = ISSUE_REGEXP.exec(message)) !== null) {
    var issueId = matches[1];
    fetch_and_say(say, true, issueId, from, chan);
  }

  while ((matches = MERGE_REQUEST_REGEXP.exec(message)) !== null) {
    var mrId = matches[1];
    fetch_and_say(say, false, mrId, from, chan);
  }
}

function fetch_and_say(say, isIssue, id, from, chan) {
  var cacheKey = chan + "-" + (isIssue ? "issue" : "mr") + id;

  // Don't mention if it's been already mentioned in the last
  // PARAMS.cacheDuration messages.
  var mentionCounter = MENTION_CACHE[cacheKey];
  if (typeof mentionCounter !== "undefined") {
    if (CHAN_MESSAGE_COUNTERS[chan] - mentionCounter <= PARAMS.cacheDuration) {
      return;
    }
  }

  var path, text_prefix;
  if (isIssue) {
    path = "issues/";
    text_prefix = "Issue #";
  } else {
    path = "merge_requests/";
    text_prefix = "Merge request !";
  }

  var to = chan === NICK ? from : chan;

  var url = PARAMS.projectUrl + path + id;
  request(url, function(err, res, body) {
    if (res && res.statusCode === 200) {
      var title = cheerio
        .load(body)("head title")
        .text();
      if (title.length) {
        say(to, title);
        say(to, url);
      } else {
        say(to, text_prefix + id + ": " + url);
      }
    }
    MENTION_CACHE[cacheKey] = CHAN_MESSAGE_COUNTERS[chan];
  });
}

(function testIssueRegexp() {
  function test(input, expected) {
    var match = ISSUE_REGEXP.exec(input);
    var found = 0;
    while (match !== null) {
      if (match[1] !== expected[found].toString()) {
        throw new Error("should have found " + expected[found]);
      }
      found++;
      match = ISSUE_REGEXP.exec(input);
    }
    if (expected.length !== found) {
      throw new Error(
        "missing expected occurrences: " +
          expected.length +
          "vs expected " +
          found
      );
    }
    ISSUE_REGEXP.lastIndex = 0;
  }

  test("hello #301 jeej", [301]);
  test("#302 lol", [302]);
  test("lol#303", []);
  test("lol #303", [303]);
  test("\t#304", [304]);
  test(" #305", [305]);
  test("hello#305 #306 jeej#42 #307 #lol # #308", [306, 307, 308]);
})();
