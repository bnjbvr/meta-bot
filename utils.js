var fs = require('fs');

exports.readFile = function(filename) {
    return fs.readFileSync(filename, {flag: 'a+', encoding: 'utf-8'});
}

exports.writeFileAsync = function(filename, data) {
    fs.writeFile(filename, data, {flag: 'w+', encoding: 'utf-8'}, function(err) {
        if (err)
            console.error("when writing karmas: ", err.message, err.stack);
    });
}

exports.makeLogger = function(prefix) {
    return function() {
        var args = [].slice.call(arguments);
        args = [prefix, '--'].concat(args);
        console.log.apply(console, args);
    }
}
