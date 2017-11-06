var utils = require('../utils');
var request = require('request');

// Constant
var KNOWN_FRAMEWORKS = ['react', 'angular', 'jquery', 'backbone', 'meteor', 'vue',
                        'mocha', 'jest'];

var KNOWN_KEYWORDS = ['ember.js', 'emberjs', 'node.js', 'nodejs', 'crockford',
                      'eich', 'rhino', 'spidermonkey', 'v8', 'spartan',
                      'chakra', 'webkit', 'blink', 'jsc', 'turbofan', 'tc39',
                      'wasm', 'webassembly', 'webasm', 'ecma262', 'ecmascript'];

var PRE_LOADED_TWEETS = 10;

var DESCRIPTION = "It's all about entertainment, isn't it?";
var HELP = "Ping horsejs and they will deliver you a fresh, randomly selected tweet from the twitter account @horsejs. Also reacts on JS-related keywords."

// Global values
var TWEETS = [];

var OWNER = '';
var NICK = '';

var maybeSetCensorship = null;
var keywordMap = {};

var log = utils.makeLogger('horse');

function maybeCacheTweet(tweet) {
    for (var j = 0; j < KNOWN_KEYWORDS.length; j++) {
        var keyword = KNOWN_KEYWORDS[j];
        if (tweet.toLowerCase().indexOf(keyword) === -1) {
            continue;
        }
        log('Found:', keyword, 'in', tweet);
        keywordMap[keyword] = keywordMap[keyword] || [];
        keywordMap[keyword].push(tweet);
    }
}

function getTweet() {
    return new Promise(function(ok, nope) {
        var resolved = false;
        if (TWEETS.length) {
            ok(TWEETS.pop());
            resolved = true;
        }

        request({
            uri: "http://javascript.horse/random.json"
        }, function(err, resp, body) {
            if (err) {
                nope(err);
                return;
            }

            var json;
            try {
                json = JSON.parse(body);
            } catch (err) {
                nope('Error when retrieving the json feed:'+ err);
            }

            var tweet = json.text;
            if (resolved) {
                maybeCacheTweet(tweet);
                TWEETS.push(tweet);
            } else {
                ok(tweet);
            }
        });
    });
}

function repeatPromise(promiseFactory, repeats) {
    return new Promise(function(ok, nope) {
        var promises = [];
        for (var i = 0; i < repeats; i++) {
            promises.push(promiseFactory());
        }
        Promise.all(promises).then(ok, nope);
    });
}

function onMessage(say, from, chan, message)
{
    for (var kw in keywordMap) {
        if (message.toLowerCase().indexOf(kw) === -1) {
            continue;
        }

        var tweets = keywordMap[kw];
        var index = Math.random() * tweets.length | 0;

        say(chan, tweets[index]);
        if (maybeSetCensorship)
            maybeSetCensorship(chan);

        tweets.splice(index, 1);
        return utils.ABORT;
    }

    var privateMessage = from === chan;

    if (privateMessage || message.indexOf(NICK) >= 0) {
        getTweet().then(function (tweet) {
            say(chan, tweet);
            if (maybeSetCensorship)
                maybeSetCensorship(chan);
        }).catch(function(err) {
            say(OWNER, 'Internal error:' + err)
        });
        return utils.ABORT;
    }

    return utils.CARRY_ON;
}

module.exports = function(context, params) {
    for (var i = 0; i < KNOWN_FRAMEWORKS.length; i++) {
        var fw = KNOWN_FRAMEWORKS[i];
        KNOWN_KEYWORDS.push(fw + 'js');
        KNOWN_KEYWORDS.push(fw + '.js');
    }
    KNOWN_KEYWORDS = KNOWN_KEYWORDS.concat(KNOWN_FRAMEWORKS);

    OWNER = context.owner;
    NICK = context.nick;

    var numPreloadTweets = params.preloadTweets || PRE_LOADED_TWEETS;

    repeatPromise(getTweet, numPreloadTweets).then(function(tweets) {
        log('preloaded tweets', tweets);
        for (var i = 0; i < tweets.length; i++) {
            maybeCacheTweet(tweets[i]);
        }
        TWEETS = tweets;
    }, function(err) {
        log('error when preloading tweets:', err.message, err.stack);
    });

    if (params.censorship && typeof context.exports.censorship === 'object') {
        maybeSetCensorship = function(chan) {
            return context.exports.censorship.set(chan);
        };
    }

    return {
        exports: {
            description: DESCRIPTION,
            help: HELP
        },
        listeners: {
            message: onMessage
        }
    }
}
