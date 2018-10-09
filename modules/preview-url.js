var utils = require("../utils");

var log = utils.makeLogger("preview-url");

var request = require("request");
var cheerio = require("cheerio");

var URL_REGEXP = /(http(s)?:\/\/(\S*))/;

var OLD_FILENAME = "";
var ENABLE_OLD = false;
var oldMap = {};

function cleanURL(url) {
  let cleanedURL = url;

  // Remove everything after # if present.
  let hashPos = url.indexOf("#");
  if (hashPos >= 0) {
    cleanedURL = url.substr(0, hashPos);
  }

  // Add trailing slash if there's no ? and . in the last block after the
  // last forward slash.
  let split = url.split("/");
  let lastSplit = split[split.length - 1];
  if (
    lastSplit.indexOf("?") === -1 &&
    lastSplit.indexOf(".") === -1 &&
    !cleanedURL.endsWith("/")
  ) {
    cleanedURL += "/";
  }

  return cleanedURL;
}

const TWITTER_REGEXP = /^http(s)?:\/\/(www\.)?twitter.com/;

function findTitle(url, $) {
  if (TWITTER_REGEXP.exec(url)) {
    // Title is more informative on twitter tweets.
    return $("head title").text();
  }

  return (
    $('head meta[property="og:title"]').attr("content") ||
    $("head title").text()
  );
}

function onMessage(say, from, chan, message) {
  if (message.indexOf("#nospoil") !== -1) {
    return;
  }

  let tryRegexp = URL_REGEXP.exec(message);
  if (tryRegexp === null) {
    return;
  }
  let url = cleanURL(tryRegexp[1]);

  let sayOld = null;
  if (ENABLE_OLD) {
    if (
      typeof oldMap[chan] !== "undefined" &&
      typeof oldMap[chan][url] !== "undefined"
    ) {
      let entry = oldMap[chan][url];
      if (entry.who !== from) {
        // #old the person who said it.
        sayOld = () => {
          let localeString = new Date(entry.when)
            .toLocaleString()
            .replace("GMT", "UTC");
          say(
            chan,
            "#old, " + entry.who + " already posted it on " + localeString
          );
        };
      }
    } else {
      oldMap[chan] = oldMap[chan] || {};
      oldMap[chan][url] = {
        who: from,
        when: Date.now()
      };
      utils.writeFileAsync(OLD_FILENAME, oldMap);
    }
  }

  request(url, function(err, res, body) {
    if (!res || res.statusCode !== 200) {
      return;
    }

    const $ = cheerio.load(body);
    const title = findTitle(url, $);
    if (!title.length) {
      return;
    }

    say(chan, title);
    if (sayOld) {
      sayOld();
    }
  });

  return utils.ABORT;
}

module.exports = function(context, params) {
  ENABLE_OLD = (params && params.old) || false;
  OLD_FILENAME = (params && params.oldFilename) || "old.data";
  oldMap = JSON.parse(utils.readFile(OLD_FILENAME) || "{}");

  var numURLs = 0;
  for (let chan in oldMap) {
    numURLs += Object.keys(oldMap[chan]).length;
  }
  log("Setting up module preview-url:", numURLs, "known URLs.");

  return {
    listeners: {
      message: onMessage
    },
    exports: {
      description: "Will print the title of all given URLs"
    }
  };
};
