var irc = require('irc');
var request = require('request');
var config = require('./config');

var ignorees = ['firebot', 'mrgiggles', config.nick];

function ignore(from) {
    for (var i = 0; i < ignorees.length; i++) {
        if (from.indexOf(ignorees[i]) !== -1)
           return true;
    }
    return false;
}

function getTweet() {
    return new Promise(function(ok, nope) {
        request({
            uri: "http://javascript.horse/random.json"
        }, function(err, resp, body) {
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
        var results = [];

        var promise = promiseFactory();
        for (var i = 0; i < repeats; i++) {
            var oldPromise = promise;
            promise = promiseFactory();
            oldPromise.then(function(res) {
                results.push(res);
                return promise;
            }, nope);
        }

        // Final promise
        promise.then(function(res) {
            results.push(res);
            ok(results);
        }, nope);
    });
}

function horsejs(client)
{
    var keywordMap = {};

    const KNOWN_KEYWORDS = ['ember', 'node', 'react', 'angular', 'jquery', 'backbone', 'meteor',
        'crockford', 'eich', 'rhino', 'spidermonkey', 'v8', 'spartan', 'chakra', 'webkit', 'blink',
        'jsc'];

    const PRE_LOADED_TWEETS = config.preloadTweets;
    const DEFAULT_CENSORSHIP_PERIOD = config.defaultCensorshipPeriod;
    var censorshipMap = config.censorshipPeriodMap;

    var shutupMap = {};

    function maybeCacheTweet(tweet) {
        for (var j = 0; j < KNOWN_KEYWORDS.length; j++) {
            var keyword = KNOWN_KEYWORDS[j];
            if (tweet.toLowerCase().indexOf(keyword) !== -1) {
                console.log('Found:', keyword, 'in', tweet);
                keywordMap[keyword] = keywordMap[keyword] || [];
                keywordMap[keyword].push(tweet);
            }
        }
    }

    function setCensorship(chan) {
        var censorshipPeriod = censorshipMap[chan] || DEFAULT_CENSORSHIP_PERIOD;
        shutupMap[chan] = true;
        setTimeout(function() {
            shutupMap[chan] = false;
        }, censorshipPeriod);
    }

    repeatPromise(getTweet, PRE_LOADED_TWEETS).then(function(tweets) {

        console.log('preloaded tweets', tweets);

        for (var i = 0; i < tweets.length; i++) {
            maybeCacheTweet(tweets[i]);
        }

        console.log('setting up client');

        client.addListener('message', function (from, chan, message) {
            if (ignore(from) || shutupMap[chan])
                return;

            if (message.indexOf('horsejs') !== -1) {

                if (message.indexOf('shut up') !== -1 || message.indexOf('shutup') !== -1) {
                    setCensorship(chan);
                    return;
                }

                getTweet().then(function (tweet) {
                    client.say(chan, tweet);
                }).catch(function(err) {
                    client.say(chan, 'Internal error:' + err)
                });
                return;
            }

            for (var kw in keywordMap) {
                if (message.toLowerCase().indexOf(kw) !== -1) {
                    var tweets = keywordMap[kw];
                    client.say(chan, tweets[Math.random() * tweets.length | 0]);
                    setCensorship(chan);
                    break;
                }
            }
        });

    }, function(err) {
        console.error('internal error:', err);
    });
}

var extensions = [horsejs];

function run()
{
    var client = new irc.Client(config.server, config.nick, {
        debug: true,
        channels: config.channels,
        userName: config.userName,
        realName: config.realName,
        retryDelay: 120000
    });

    for (var i = 0, e = extensions.length; i < e; ++i) {
        extensions[i](client);
    }
}

function changeName()
{
    var names = ['john', 'mark', 'robert', 'rubber', 'patrick', 'wu', 'lulz', 'troll', 'wat'];
    var number = Math.floor(Math.random() * 255);
    var usedName = names[Math.floor(Math.random() * names.length)] + number;
    return {
        nick: usedName,
        userName: usedName,
        realName: usedName
    }
}

run(config);
