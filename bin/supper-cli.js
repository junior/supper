#!/usr/bin/env node
const path = require('path'),
    fs = require('fs'),
    args = process.argv.slice(1);

let arg;
do arg = args.shift();
while (fs.realpathSync(arg) !== __filename
  && !(path.basename(arg)).match(/^supper$|^supper.js$/)
);

require('../lib/supper').run(args);
