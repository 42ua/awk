 "use strict";

$(function() {

  (function() {

    var parseId;

    function parse() {
      if (parseId) {
        clearTimeout(parseId);
      }

      parseId = setTimeout(function () {
        var input = $("#awk-stdin").val(),
            args = $("#awk-cmd").val(),
            output = fn_mawk(input, args);
        $("#awk-stdout").val(output.replace(/\n$/, ""));
      }, 333);
    }

    $("#awk-stdin").keyup(parse);
    $("#awk-cmd").keyup(parse);

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

  /* Gist API */

  (function() {
    $("li a.gist-api").click(function() {
      $.post('https://api.github.com/gists', 
        JSON.stringify({
          "description": "mawk.js",
          "files": {
            "stdin": {"content": $("#awk-stdin").val()},
            "stdout": {"content": $("#awk-stdout").val()},
            "args": {"content": $("#awk-cmd").val()}
          }
        })
      ).done(function(response) {
        var url = response.html_url,
            my = $(location).attr('href').replace(/(#|\?).*$/, "") + '?gist=' + response.id;
        $(".user-errors-here").append( "<div class='alert alert-success alert-dismissible fade in' role=alert>" + 
          "<button type=button class=close data-dismiss=alert aria-label=Close><span aria-hidden=true>&times;</span></button>" + 
          "<strong>GIST:</strong> <a href='" + url + "'>" + response.id + "</a> | " + 
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
  function getParameterByName(name, url) {
      if (!url) url = window.location.href;
      name = name.replace(/[\[\]]/g, "\\$&");
      var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
          results = regex.exec(url);
      if (!results) return null;
      if (!results[2]) return '';
      return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  var gistId = getParameterByName('gist') || '562542ca9f545cc917d834edb697f498',
      stdinGist = getParameterByName('stdin') || 'stdin',
      argsGist = getParameterByName('args') || 'args',
      doc_ready = $.Deferred();

  /* http://stackoverflow.com/q/10326398 */

  $(doc_ready.resolve);

  $.when( 
    $.get( 'https://api.github.com/gists/' + gistId),
    doc_ready )
  .then(function( data ) {
    var args = data[0].files[argsGist].content, 
        rows = args.split(/\r\n|\r|\n/).length,
        stdin = data[0].files[stdinGist].content;
    $("#awk-cmd").val(args).attr("rows", rows).css({"height": rows > 1 ? "auto" : "34px"});
    // document.ready() callbacks are called in the order they were registered. 
    // If you register your testing callback first, it will be called first
    // keyup() listener is registered earlier in this file
    $("#awk-stdin").val(stdin).keyup();
  })
  .fail(function( e ) {
    $(".user-errors-here").append( "<div class='alert alert-danger alert-dismissible fade in' role=alert>" + 
      "<button type=button class=close data-dismiss=alert aria-label=Close><span aria-hidden=true>&times;</span></button>" + 
      "<strong>Holy guacamole!</strong> " + [e.status, e.statusText] + "</div>"
    );
  });

})();