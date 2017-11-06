var fs = require('fs');

exports.CARRY_ON = true;
exports.ABORT = false;

exports.readFile = function(filename) {
    return fs.readFileSync(filename, {flag: 'a+', encoding: 'utf-8'});
}

exports.writeFileAsync = function(filename, data) {
    fs.writeFile(filename,
                 JSON.stringify(data, null, 4),
                 {flag: 'w+', encoding: 'utf-8'},
                 function(err) {
        if (err) {
            console.error("when writing file with filename", filename, ":", err.message, err.stack);
        }
    });
}

exports.makeLogger = function(prefix) {
    return function() {
        var args = [].slice.call(arguments);
        args = [prefix, '--'].concat(args);
        console.log.apply(console, args);
    }
}
