#!/bin/sh

# help set
# -e  Exit immediately if a command exits with a non-zero status.
set -e

trap '[ "$?" -eq 0 ] || echo "!!! ERROR !!!"' EXIT

curl -sL ftp://invisible-island.net/mawk/mawk-1.3.4-20150503.tgz  | tar xz && cd mawk-1.3.4-20150503

for alias in 'emcc' 'emconfigure' 'emmake'; do
  alias $alias="docker run --rm -v `pwd`:/home/src 42ua/emsdk $alias"
done
unset alias

PS1="(emsdk)$PS1"

sed -i --regexp-extended -e 's/^(x\s+=\s+)@EXEEXT@$/\1.js/' \
 -e 's/\.\/makescan\$x\s+>\s+scancode.c$/node &/' Makefile.in

emconfigure ./configure LDFLAGS="-O2 --memory-init-file 0" 

emmake make

echo 'NODEENV:'
nodeenv env --prebuilt
. env/bin/activate

sed -i -E 's/^(PROG=")(\$\{MAWK:-\.\.\/mawk\}")$/\1node \2/' test/fpe_test test/mawktest

# cat mawktest.dat | node ../mawk.js "`cat wc.awk`"

sed -i -E \
-e 's/LC_ALL=C \$PROG -f nextfile.awk full-awk.dat \$dat \| cmp -s - nextfile.out \|\| Fail/# &/' \
-e '/^#/!s/(LC_ALL=C \$PROG .*)-f (.+\.awk) ([^ |]+)/cat \3 | \1 "`cat \2`" /' \
-e '/^#/!s/(LC_ALL=C \$PROG .*)-f (.+\.awk) \|/\1 "`cat \2`" |/' \
-e '/^#/!s/(LC_ALL=C \$PROG .*) \$dat \|/cat $dat | \1 |/' \
-e '/^#/!s/(LC_ALL=C \$PROG .*) \$dat >/cat $dat | \1 >/' test/mawktest

echo 'TESTING: make check'
CHECK_STDOUT="`emmake make check`"
if [ "$CHECK_STDOUT" = '** mawk_test
mawk 1.3.4 20150503
Copyright 2008-2014,2015, Thomas E. Dickey
Copyright 1991-1996,2014, Michael D. Brennan


testing input and field splitting
... node /home/src/mawk.js does NOT supports matches with NUL bytes
input and field splitting OK

testing regular expression matching
regular expression matching OK

testing checking for write errors
checking for write errors OK

testing arrays and flow of control
array test OK

testing nextfile
nextfile test OK

testing function calls and general stress test
general stress test OK
tested node /home/src/mawk.js OK
** fpe_test
testing floating point exception handling
testing division by zero
node /home/src/mawk.js BEGIN{ print 4/0 }
inf

testing overflow
node /home/src/mawk.js BEGIN {
  x = 100
  do { y = x ; x *= 1000 } while ( y != x )
  print "loop terminated"
}
loop terminated

testing domain error
node /home/src/mawk.js BEGIN{ print sqrt(-8) }
nan


==============================
return1 = 0
return2 = 0
return3 = 0
results consistent: ignoring floating exceptions' ] ; then
  echo "OK" 
else
  echo ----------------------
  echo "$CHECK_STDOUT"
  exit 42
fi

node mawk.js -W version
echo 'a test c' | awk '{print $2}'
echo 'a test c' | node mawk.js '{print $2}'

echo 'NPM:'
npm install -g browserify
npm install shell-quote uglifyify

cat <<EOT > mawk_template.js
"use strict";
module.exports = function(input_str, args_arr) {
  var Module = {}, window = {};
  window.prompt = (function() {
    var input = input_str;
    return function() {
      var value = input;
      input = null;
      return value;
    };
  })();
  Module['thisProgram'] = 'mawk';
  Module['arguments'] = args_arr;
  Module['return'] = '';
  Module['print'] = Module['printErr'] = function (text) {
      Module['return'] += text + '\n';
  };

  /* MAWK.RAW.JS */

  return Module['return'];
};
EOT

# verify conflicts
echo 'assert mawk_template.js has no conflicts:'
! grep -o -E ".{0,10}('return'|\"return\"|\.return\s|input_str|args_arr).{0,10}" mawk.js

sed -i '/\/\* MAWK.RAW.JS \*\// {
  r mawk.js
  d
}' mawk_template.js

cat <<EOT > main.js
"use strict";
var fn_parse_argc = require('shell-quote').parse,
    mawk = require('./mawk_template');

module.exports = function(input_str, args_str) {
  return mawk(input_str, fn_parse_argc(args_str));
};
EOT

echo 'BROWSERIFY:'
browserify -g [ uglifyify --ignore '**/mawk_template.js' ] \
  main.js --standalone fn_mawk > ../mawk.js

echo 'assert minify skip asm.js:'
grep -E -q "^  Module\['return'\] = '';$" ../mawk.js
grep -E -q "^  Module\['thisProgram'\] = 'mawk';$" ../mawk.js