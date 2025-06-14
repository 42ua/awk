 "use strict";

$(function() {

  (function() {

    function b64DecodeUnicode(str) {
      return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    }

    var b64lastElement = null;

    function b64DecodeUserFriendly(str) {
      if (b64lastElement) {
        b64lastElement.remove();
        b64lastElement = null;
      }
      try {
        return b64DecodeUnicode(str);
      } catch (err) {
        b64lastElement = 
          $("<div class='alert alert-warning'>" +
          "<strong>Warning!</strong> base64 parse problem</div>"
        ).appendTo(".user-errors-here");
        throw err;
      }
    }

    var parseId, cacheInput, cacheArgs;

    function parse() {
      if (parseId) {
        clearTimeout(parseId);
      }

      parseId = setTimeout(function () {
        var input = b64DecodeUserFriendly($("#awk-base64-stdin").val()),
            args = $("#awk-cmd").val();

        if (cacheInput !== input || cacheArgs !== args){
          cacheInput = input;
          cacheArgs = args;
          $("#awk-stdin").val(input);
          $("#awk-stdout").val(fn_mawk(input, args).replace(/\n$/, ""));
        }

      }, 333);
    }

    $("#awk-base64-stdin").on('keyup input', parse);
    $("#awk-cmd").on('keyup input', parse);

  })();

  /* options */

  (function() {
    $(".awk-options.dropdown-menu li a").click(function() {
      var val = $(this).text();
      var newVal = ['-W help', '-W version'].indexOf(val) > -1 
        ? val
        : val + ' ' + $("#awk-cmd").val();
      $("#awk-cmd").val(newVal).keyup();
    });
  })();

  /* Github API */

  (function() {
    $("li a.gist-api").click(function() {

      var owner = "Zamko84";
      var repo = "snippets.awk.js";
      var branch = "main";
      var token = atob('QmVhcmVyIGdpdGh1Yl9wYXRfMTFCVFNDS05ZMG5aR0lTQ2hDUWg0Yl9sTWQ5S2VZMVREQ' +
                       'jlRTzI4a1hFMVkzT0RhSVhiWFB1NGNTTWc2eGxza05kUERWUlNUT05XZEEweWhydQ==');

      var files = [
        { name: "stdin", content: $("#awk-base64-stdin").val() },
        { name: "stdin_", content: $("#awk-stdin").val() },
        { name: "stdout", content: $("#awk-stdout").val() },
        { name: "args", content: $("#awk-cmd").val() }
      ];

      var dirID = Math.random().toString(36).substr(2);

      var commitSha;

      $.ajax({
        cache: false,
        type: "GET",
        url: `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
        headers: {
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Authorization': token
        }
      }).then(function(refResponse) {
        commitSha = refResponse.object.sha;
        return $.ajax({
          cache: false,
          type: "GET",
          url: `https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`,
          headers: {
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Authorization': token
          }
        });
      }).then(function(commitResponse) {
        var treeSha = commitResponse.tree.sha;
        var tree = files.map(function(file) {
          return {
            path: `base64awk/${dirID}/${file.name}`,
            mode: "100644",
            type: "blob",
            content: file.content
          };
        });
        return $.ajax({
          type: "POST",
          url: `https://api.github.com/repos/${owner}/${repo}/git/trees`,
          headers: {
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Authorization': token
          },
          contentType: 'application/json',
          data: JSON.stringify({
            base_tree: treeSha,
            tree: tree
          })
        });
      }).then(function(treeResponse) {
        var newTreeSha = treeResponse.sha;
        return $.ajax({
          type: "POST",
          url: `https://api.github.com/repos/${owner}/${repo}/git/commits`,
          headers: {
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Authorization': token
          },
          contentType: 'application/json',
          data: JSON.stringify({
            message: "Update files",
            tree: newTreeSha,
            parents: [commitSha]
          })
        });
      }).then(function(commitResponse) {
        var newCommitSha = commitResponse.sha;
        return $.ajax({
          type: "PATCH",
          url: `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
          headers: {
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Authorization': token
          },
          contentType: 'application/json',
          data: JSON.stringify({
            sha: newCommitSha
          })
        });
      }).done(function(response) {
        var sha = response.object.sha,
            url = `https://github.com/${owner}/${repo}/commit/${sha}`,
            my = $(location).attr('href').replace(/(#|\?).*$/, "") + '?gh=' + dirID;
        $(".user-errors-here").append( "<div class='alert alert-success alert-dismissible fade in' role=alert>" + 
          "<button type=button class=close data-dismiss=alert aria-label=Close><span aria-hidden=true>&times;</span></button>" + 
          "<strong>COMMIT:</strong> <a href='" + url + "'>" + sha + "</a> | " + 
          "<strong>Share:</strong> <a href='" + my + "'>me</a>" + 
          "</div>"
        );
      }).fail(function( e ) {
        $(".user-errors-here").append( "<div class='alert alert-danger alert-dismissible fade in' role=alert>" + 
          "<button type=button class=close data-dismiss=alert aria-label=Close><span aria-hidden=true>&times;</span></button>" + 
          "<strong>Holy guacamole!</strong> " + [e.status, e.statusText] + "</div>"
        );
      });
    });
  })();

});

/* Gist load or default */

(function() {
  var params    = new URLSearchParams(window.location.search),
      gistId    = params.get('gist') || '7f6aeb732c52126d653d1d81dde063d3',
      dirID     = params.get('gh'),
      doc_ready = $.Deferred();

  /* http://stackoverflow.com/q/10326398 */

  $(doc_ready.resolve);

  if (dirID) {
    var baseUrl = 'https://raw.githubusercontent.com/Zamko84/snippets.awk.js/main/base64awk/' + dirID;
    var content = $.when(
      $.get( baseUrl + '/args'),
      $.get( baseUrl + '/stdin'),
      doc_ready )
    .then(function( data_args, data_stdin ) {
      return { args: data_args[0], stdin: data_stdin[0] };
    });
  }
  else {
    var content = $.when(
      $.get( 'https://api.github.com/gists/' + gistId),
      doc_ready )
    .then(function( data ) {
      try { return { args: data[0].files.args.content, stdin: data[0].files.stdin.content }; }
      catch(e) { return $.Deferred().reject({ statusText: 'invalid gist format', status: -1 }); }
    });
  }

  content.then(function( data ) {
      var args  = data.args,
          rows  = args.split(/\r\n|\r|\n/).length,
          stdin = data.stdin;
      $("#awk-cmd").val(args).attr("rows", rows).css({"height": rows > 1 ? "auto" : "34px"});
      // document.ready() callbacks are called in the order they were registered.
      // If you register your testing callback first, it will be called first
      // keyup() listener is registered earlier in this file
      $("#awk-base64-stdin").val(stdin).keyup();
    })
    .fail(function( e ) {
      $(".user-errors-here").append( "<div class='alert alert-danger alert-dismissible fade in' role=alert>" +
        "<button type=button class=close data-dismiss=alert aria-label=Close><span aria-hidden=true>&times;</span></button>" +
        "<strong>Holy guacamole!</strong> " + [e.status, e.statusText] + "</div>"
      );
    });

})();