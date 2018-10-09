var bodyParser = require("body-parser");
var express = require("express");
var request = require("request");

var utils = require("../utils");
var log = utils.makeLogger("gitlab-notifications");

var SHORTEN_URL = function(url, callback) {
  callback(url);
};

function configureUrlShortener(lstu) {
  if (lstu[lstu.length - 1] !== "/") {
    lstu += "/";
  }
  SHORTEN_URL = function shortenUrl(url, callback) {
    request(
      lstu + "a",
      { method: "POST", form: { lsturl: url, format: "json" } },
      function(err, res, body) {
        try {
          body = JSON.parse(body);
        } catch (err) {
          body = { err: "cant parse JSON" };
        }
        if (err || !body.success) {
          console.error(
            "Error when shortening link: ",
            res ? "(status: " + res.statusCode + ")" : "(no response)",
            "\nerror:",
            err,
            "\nfailure reason:",
            body.msg
          );
          callback(url);
        } else {
          callback(body.short);
        }
      }
    );
  };
}

module.exports = function(context, params) {
  // Bind recipients to notifications.
  let hookToChannel = {};
  for (let who in params.reports) {
    let hooks = params.reports[who];
    for (var i = 0; i < hooks.length; i++) {
      let hook = hooks[i];

      let actual_who;
      if (who.startsWith("u_")) {
        actual_who = who.substr(2);
      } else if (who.startsWith("c_")) {
        actual_who = "#" + who.substr(2);
      } else {
        throw new Error(
          "unknown user kind: must start with u_ for users, c_ for channels"
        );
      }

      (hookToChannel[hook] = hookToChannel[hook] || []).push(actual_who);
    }
  }

  // Configure URL shortener, if necessary.
  if (params.lstu && params.lstu.length) {
    configureUrlShortener(params.lstu);
  }

  const boundSay = context.say;
  function makeSay(body) {
    var whom = hookToChannel[body.object_kind] || [];
    return function say(msgs) {
      if (!whom.length) {
        return;
      }
      if (msgs) {
        if (msgs instanceof Array) {
          for (var i = 0; i < msgs.length; i++) boundSay(whom, msgs[i]);
        } else {
          boundSay(whom, msgs);
        }
      }
    };
  }

  var app = express();
  app.use(bodyParser.json()); // for parsing application/json
  app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

  app.post("/", function(req, res) {
    var body = req.body || {};
    var msgs = null;
    if (body.object_kind && HANDLERS[body.object_kind])
      HANDLERS[body.object_kind](body, makeSay(body), params);
    else console.log("Unhandled object_kind:", body.object_kind);
    res.sendStatus(200);
  });

  app.listen(params.port, params.host, function() {
    log(`gitlab notification server running on ${params.host}:${params.port}`);
  });

  return {
    listeners: {},
    exports: {
      description: "Gitlab to IRC notifications.",
      help: "Gitlab to IRC notifications."
    }
  };
};

function conjugatePast(verb) {
  // Make action displayable (e.g., open -> opened, close -> closed, merge -> merged).
  return verb + (verb.substr(-1) === "e" ? "" : "e") + "d";
}

const LAST_ISSUE_ACTION = {};

const HANDLERS = {
  push: function(body, say, params) {
    var user = body.user_username;
    var projectName = body.project.name;

    var commits = body.commits;
    var numCommits = body.total_commits_count;

    var branchName = body.ref.replace("refs/heads/", "");
    var found = false;
    for (var i = 0; i < params.branches.length; i++) {
      if (branchName === params.branches[i]) {
        found = true;
        break;
      }
    }
    if (!found) return;

    var msg = null;
    if (!numCommits) {
      // Special case: a branch was created or deleted.
      var action = "created";
      if (body.after === "0000000000000000000000000000000000000000")
        action = "deleted";
      msg =
        user +
        " " +
        action +
        " branch " +
        branchName +
        " on " +
        projectName +
        ".";
      say(msg);
    } else {
      var maybeS = numCommits === 1 ? "" : "s";
      var lastCommit = commits[commits.length - 1];
      var lastCommitMessage = lastCommit.message
        .trim()
        .split("\n")[0]
        .trim();
      SHORTEN_URL(lastCommit.url, function(shortUrl) {
        msg = user + " pushed on " + projectName + "@" + branchName + ": ";
        if (numCommits === 1) {
          msg += lastCommitMessage + " " + shortUrl;
        } else {
          msg +=
            commits.length +
            " commits (last: " +
            lastCommitMessage +
            ") " +
            shortUrl;
        }
        say(msg);
      });
    }
  },

  issue: function(body, say) {
    var user = body.user.username;
    var projectName = body.project.name;

    var issue = body.object_attributes;
    var issueNumber = issue.iid;
    var issueTitle = issue.title.trim();
    var issueState = issue.state;
    var url = issue.url;

    // Don't trigger the hook on issue's update;
    if (issue.action === "update") return;

    // Don't trigger several close event.
    if (issue.action === LAST_ISSUE_ACTION[issue.iid]) return;
    LAST_ISSUE_ACTION[issue.iid] = issue.action;

    var displayedAction = conjugatePast(issue.action);

    SHORTEN_URL(url, function(shortUrl) {
      var msg =
        user +
        " " +
        displayedAction +
        " issue #" +
        issueNumber +
        ' ("' +
        issueTitle +
        '") on ' +
        projectName +
        " " +
        shortUrl;
      say(msg);
    });
  },

  merge_request: function(body, say) {
    var user = body.user.username;

    var request = body.object_attributes;

    var projectName = request.target.name;

    var from = request.source_branch;
    var to = request.target_branch;

    var id = request.iid;
    var title = request.title.trim();
    var url = request.url;
    var state = request.state;

    // Don't trigger the hook on mr's updates.
    if (request.action === "update") {
      return;
    }

    var displayedAction = conjugatePast(request.action);

    SHORTEN_URL(url, function(shortUrl) {
      var msg =
        user +
        " " +
        displayedAction +
        " MR !" +
        id +
        " (" +
        from +
        "->" +
        to +
        ": " +
        title +
        ") " +
        " on " +
        projectName +
        "; " +
        shortUrl;
      say(msg);
    });
  },

  build: function(body, say) {
    var id = body.build_id;
    var status = body.build_status;

    var isFinished = body.build_finished_at !== null;
    var duration = body.build_duration;

    var projectName = body.project_name;
    var stage = body.build_stage;

    var msg =
      projectName +
      ": build #" +
      id +
      " (" +
      stage +
      ") changed status: " +
      status;
    if (isFinished) msg += " (finished in " + duration + " seconds.)";

    say(msg);
  }
};
