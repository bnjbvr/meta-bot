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
                preloadTweets: 1
            }
        }
    ]
}
