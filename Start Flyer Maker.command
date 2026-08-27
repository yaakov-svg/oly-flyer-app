#!/bin/bash
# ===================================================================
#  Zmanim Flyer Maker - double-click this file to start (Mac).
#  Keep the Terminal window open while you work. Close it when done.
#
#  If double-clicking does nothing, open Terminal once and run:
#      chmod +x "Start Flyer Maker.command"
# ===================================================================
cd "$(dirname "$0")" || exit 1

echo
echo "  Starting the Zmanim Flyer Maker..."
echo

if ! command -v node >/dev/null 2>&1; then
  echo "  ---------------------------------------------------------"
  echo "  Node.js is not installed on this computer."
  echo
  echo "  Please install it first, from:  https://nodejs.org"
  echo "  Choose the big green \"LTS\" button, accept the defaults,"
  echo "  then double-click this file again."
  echo "  ---------------------------------------------------------"
  echo
  read -r -p "Press Return to close."
  exit 1
fi

fail() {
  echo
  echo "  ---------------------------------------------------------"
  echo "  Something went wrong during setup."
  echo "  Take a screenshot of this window and send it to Yaakov."
  echo "  ---------------------------------------------------------"
  echo
  read -r -p "Press Return to close."
  exit 1
}

# First run only: fetch the building blocks. Takes a few minutes.
if [ ! -d node_modules ]; then
  echo "  First time setup - this takes a few minutes. Please wait..."
  echo
  npm ci || fail
fi

# First run only, or after an update: prepare the app.
if [ ! -f dist/server/wrangler.json ]; then
  echo "  Preparing the app - about a minute..."
  echo
  npm run build || fail
fi

echo
echo "  ---------------------------------------------------------"
echo "   Ready. Your browser should open by itself."
echo "   If it doesn't, open Chrome and go to:"
echo
echo "       http://localhost:3000"
echo
echo "   LEAVE THIS TERMINAL WINDOW OPEN while you work."
echo "   Closing it stops the flyer maker."
echo "  ---------------------------------------------------------"
echo

# Give the server a head start, then open the browser.
( sleep 6; open http://localhost:3000 ) &

npm start

echo
echo "  The flyer maker has stopped. You can close this window."
read -r -p "Press Return to close."
