#!/usr/bin/env bash
# check-tells.sh [file] reads the file or standard input.
# It prints each countable tell of AI writing with the line number.
# A hit isn't a verdict. The agent judges each hit.
set -uo pipefail
grep -n -o -i -E "—|;|not just|not only|it's not [^.]*, it's|\
serves as|stands as|underscores|highlights|showcases|crucial|pivotal|\
delve|important to note|in summary|overall,|moreover|furthermore|\
leverage|robust|seamless" "${1:--}"
exit 0
