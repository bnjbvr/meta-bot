var request = require('request');

var KNOWN_FRAMEWORKS = ['react', 'angular', 'jquery', 'backbone', 'meteor'];
var KNOWN_KEYWORDS = ['ember.js', 'emberjs', 'node.js', 'nodejs', 'crockford',
                      'eich', 'rhino', 'spidermonkey', 'v8', 'spartan',
                      'chakra', 'webkit', 'blink', 'jsc', 'turbofan'];
var PRE_LOADED_TWEETS = 10;
var TWEETS = [];

var OWNER = '';
var NICK = '';

var SET_CENSORSHIP = null;

module.exports = function(config, censorship) {
    for (var i = 0; i < KNOWN_FRAMEWORKS.length; i++) {
        var fw = KNOWN_FRAMEWORKS[i];
        KNOWN_KEYWORDS.push(fw + 'js');
        KNOWN_KEYWORDS.push(fw + '.js');
    }
    KNOWN_KEYWORDS = KNOWN_KEYWORDS.concat(KNOWN_FRAMEWORKS);

    OWNER = config.owner;
    NICK = config.nick;
    PRE_LOADED_TWEETS = (config.horsejs && config.horsejs.preloadTweets) || PRE_LOADED_TWEETS;

    repeatPromise(getTweet, PRE_LOADED_TWEETS).then(function(tweets) {
        console.log('preloaded tweets', tweets);
        for (var i = 0; i < tweets.length; i++) {
            maybeCacheTweet(tweets[i]);
        }
        TWEETS = tweets;
    }, function(err) {
        console.error('error when preloading tweets:', err.message, err.stack);
    });

    SET_CENSORSHIP = function(chan) {
        return censorship(Math.random(), chan, NICK + ' shut up', DUMMY_CALLBACK, DUMMY_CALLBACK);
    };

    return horsejs;
}

var KEYWORD_MAP = {};

function maybeCacheTweet(tweet) {
    for (var j = 0; j < KNOWN_KEYWORDS.length; j++) {
        var keyword = KNOWN_KEYWORDS[j];
        if (tweet.toLowerCase().indexOf(keyword) === -1) {
            continue;
        }
        console.log('Found:', keyword, 'in', tweet);
        KEYWORD_MAP[keyword] = KEYWORD_MAP[keyword] || [];
        KEYWORD_MAP[keyword].push(tweet);
    }
}

function getTweet() {
    return new Promise(function(ok, nope) {
        if (TWEETS.length)
            return ok(TWEETS.pop());

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
            ok(json.text);
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

function horsejs(from, chan, message, say, next)
{
    if (message.indexOf(NICK) !== -1) {
        getTweet().then(function (tweet) {
            maybeCacheTweet(tweet);
            say(chan, tweet);
            SET_CENSORSHIP(chan);
        }).catch(function(err) {
            say(OWNER, 'Internal error:' + err)
        });
        // Don't call next().
        return;
    }

    for (var kw in KEYWORD_MAP) {
        if (message.toLowerCase().indexOf(kw) === -1) {
            continue;
        }
        var tweets = KEYWORD_MAP[kw];
        var index = Math.random() * tweets.length | 0;
        say(chan, tweets[index]);
        SET_CENSORSHIP(chan);
        tweets.splice(index, 1);
        // Don't call next.
        return;
    }

    return next();
}

