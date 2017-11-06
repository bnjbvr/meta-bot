const SECONDS = 1000; // ms
const MINUTES = SECONDS * 60;
const HOURS = MINUTES * 60;

module.exports = {
    //server: 'irc.mozilla.org',
    server: 'irc.freenode.org',
    channels: ['#horsejs'],

    owner: 'bnjbvr',

    nick: 'chevaljs',
    userName: 'chevaljs',
    realName: 'chevaljs',

    modules: [
        {
            name: 'help',
            enabled: true, // if enabled, will react on !help messages.
        },
        {
            name: 'preview-url',
            enabled: true // if enabled, will fetch the title of URLs written by people in the channel.
        },
        {
            name: 'ignore',
            enabled: true,
            params: {
                ignorees: ['bnjbvr|ignored'],  // a list of nicks to ignore.
                bots: true                     // if true, will ignore people with "bot" in their name.
            }
        },
        {
            name: 'karma',
            enabled: true,
            params: {
                filename: 'data/karma.dat',
                debouncing_rate: 5 * SECONDS
            }
        },
        {
            name: 'bodyguard',
            enabled: true,
            params: {
                owner: 'bnjbvr'
            }
        },
        {
            name: 'memo',
            enabled: true,
            params: {
                filename: 'data/memo.dat'
            }
        },
        {
            name: 'quote',
            enabled: true,
            params: {
                filename: 'data/quotes.dat',
                backlog_memory: 10
            }
        },
        {
            name: 'censorship',
            enabled: true,
            params: {
                periodMap: {
                    '#horsejs': 5 * SECONDS
                },
                defaultPeriod: 10 * SECONDS
            }
        },
        {
            name: 'horse',
            enabled: true,
            params: {
                preloadTweets: 1,   // Number of tweets to pre-load at start.
                censorship: true    // Will self-censor after horsejs-ing if set to true.
            }
        },
    ]
}
