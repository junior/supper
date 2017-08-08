/* !
 * supper <https://#/>
 * Copyright(c) 2017 Adao Junior
 * Inspired on a old version of petruisfan/node-supervisor
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
const fs = require('fs');
const spawn = require('child_process').spawn;
const path = require('path');

const ignoredPaths = {};

let fileExtensionPattern;
let startChildProcess;
let noRestartOn = null;
let quiet = false;
let errConsole = false;
let noTS = false;
let verbose = false;
let restartVerbose = false;
let ignoreSymLinks = false;
let forceWatchFlag = false;
let instantKillFlag = false;
let timestampFlag = false;
let interactive = true;
let crashQueued = false;
let harmonyDefaultParameters = false;
let harmonyDestructuring = false;

const colors = {
    'yellow': '\x1b[33m%s\x1b[0m',
    'cyan': '\x1b[36m%s\x1b[0m',
    'warn': '\x1b[35m%s\x1b[0m',
    'error': '\x1b[31m%s\x1b[0m',
    'log': '\x1b[2m%s\x1b[0m',
    'bright': '\x1b[1m%s\x1b[0m',
    'underscore': '\x1b[4m%s\x1b[0m',
    'reverse': '\x1b[7m%s\x1b[0m',
    'hidden': '\x1b[8m%s\x1b[0m',
    'underscoreStr': '\x1b[4m',
    'reset': '\x1b[0m'
};

exports.run = run;

/**
 * Main run.
 * @param {string} args args
 * @return {Function}
 * @api public
 */
function run(args) {
    let arg, watch, ignore, pidFilePath, program, extensions, executor,
        pollInterval, debugFlag, debugBrkFlag, debugBrkFlagArg, inspectFlag,
        inspectBrkFlag, inspectBrkFlagArg, harmony;
    while (arg = args.shift()) {
        if (arg === '--help' || arg === '-h' || arg === '-?') {
            return help();
        } else if (arg === '--quiet' || arg === '-q') {
            quiet = true;
        } else if (arg === '--harmony' || arg === '--es_staging') {
            harmony = true;
        } else if (arg === '--harmony_default_parameters') {
            harmonyDefaultParameters = true;
        } else if (arg === '--harmony_destructuring') {
            harmonyDestructuring = true;
        } else if (arg === '--verbose' || arg === '-V') {
            verbose = true;
        } else if (arg === '--restart-verbose' || arg === '-RV') {
            restartVerbose = true;
        } else if (arg === '--watch' || arg === '-w') {
            watch = args.shift();
        } else if (arg == '--non-interactive' || arg === '-t') {
            interactive = false;
        } else if (arg === '--ignore' || arg === '-i') {
            ignore = args.shift();
        } else if (arg === '--save-pid' || arg === '-pid') {
            pidFilePath = args.shift();
        } else if (arg === '--ignore-symlinks') {
            ignoreSymLinks = true;
        } else if (arg === '--poll-interval' || arg === '-p') {
            pollInterval = parseInt(args.shift());
        } else if (arg === '--extensions' || arg === '-e') {
            extensions = args.shift();
        } else if (arg === '--exec' || arg === '-x') {
            executor = args.shift();
        } else if (arg === '--no-restart-on' || arg === '-n') {
            noRestartOn = args.shift();
        } else if (arg.indexOf('--debug') > -1
                && arg.indexOf('--debug-brk') === -1) {
            debugFlag = arg;
        } else if (arg.indexOf('--debug-brk') >= 0) {
            debugBrkFlag = true;
            debugBrkFlagArg = arg;
        } else if (arg.indexOf('--inspect') > -1
                && arg.indexOf('--inspect-brk') === -1) {
            inspectFlag = arg;
        } else if (arg.indexOf('--inspect-brk') >= 0) {
            inspectBrkFlag = true;
            inspectBrkFlagArg = arg;
        } else if (arg === '--force-watch') {
            forceWatchFlag = true;
        } else if (arg === '--instant-kill' || arg === '-k') {
            instantKillFlag = true;
        } else if (arg === '--timestamp' || arg === '-s') {
            timestampFlag = true;
        } else if (arg === '--') {
            program = args;
            break;
        } else if (arg[0] != '-' && !args.length) {
            // Assume last arg is the program
            program = [arg];
        }
    }
    if (!program) {
        return help();
    }
    if (!watch) {
        watch = '.';
    }
    if (!pollInterval) {
        pollInterval = 1000;
    }

    let programExt = program.join(' ').match(/.*\.(\S*)/);
    programExt = programExt && programExt[1];

    if (!extensions) {
        // If no extensions passed try to guess from the program
        extensions = 'node,js';
        if (programExt && extensions.indexOf(programExt) == -1) {
            // Support coffee and litcoffee extensions
            if (programExt === 'coffee' || programExt === 'litcoffee') {
                extensions += ',coffee,litcoffee';
            } else {
                extensions += ',' + programExt;
            }
        }
    }
    fileExtensionPattern = new RegExp('^.*.(' + extensions.replace(/,/g, '|')
        + ')$');

    if (!executor) {
        executor = (programExt === 'coffee' || programExt === 'litcoffee')
            ? 'coffee' : 'node';
    }
    if (debugFlag) {
        program.unshift(debugFlag);
    }
    if (debugBrkFlag) {
        program.unshift(debugBrkFlagArg);
    }
    if (inspectFlag) {
        program.unshift(inspectFlag);
    }
    if (inspectBrkFlag) {
        program.unshift(inspectBrkFlagArg);
    }
    if (harmony) {
        program.unshift('--harmony');
    }
    if (harmonyDefaultParameters) {
        program.unshift('--harmony_default_parameters');
    }
    if (harmonyDestructuring) {
        program.unshift('--harmony_destructuring');
    }
    if (executor === 'coffee' && (debugFlag || debugBrkFlag || inspectFlag
            || inspectBrkFlag)) {
        // coffee does not understand debug or debug-brk, make coffee pass
        // options to node
        program.unshift('--nodejs');
    }
    if (pidFilePath) {
        const pid = process.pid;
        //
        // verify if we have write access
        //
        canWrite(pidFilePath, function (err) {
            if (err) {
                logger(colors.log, 'Continuing...');
            } else {
                fs.writeFileSync(pidFilePath, pid + '\n');
            }
        });
    }

    const deletePidFile = function () {
        fs.exists(pidFilePath, function (exists) {
            if (exists) {
                logger(colors.log, 'Removing pid file');
                fs.unlinkSync(pidFilePath);
            } else {
                logger(colors.log, 'No pid file to remove...');
            }
            process.exit();
        });
    };

    try {
        // Pass kill signals through to child/worker
        ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGQUIT'].forEach(function (signal) {
            process.on(signal, function () {
                const child = exports.child;
                if (child) {
                    logger(colors.warn, 'Received ' + signal
                        + ', killing worker process...');
                    child.kill(signal);
                }
                if (pidFilePath) {
                    deletePidFile();
                } else {
                    process.exit();
                }
            });
        });
    } catch (e) {
        // Windows doesn't support signals yet, so they simply don't get this
        // handling.
        // https://github.com/joyent/node/issues/1553
    }

    process.on('exit', function () {
        const child = exports.child;
        if (child) {
            logger(colors.log, 'Supper process exiting, terminating worker...');
            child.kill('SIGTERM');
        }
    });

    noTS = true;
    logger(colors.log, '');
    logger(colors.yellow, 'Running supper with');
    logger(colors.log, '  program \'' + program.join(' ') + '\'');
    logger(colors.log, '  --watch \'' + watch + '\'');
    if (!interactive) {
        logger(colors.log, '  --non-interactive');
    }
    if (ignore) {
        logger(colors.log, '  --ignore \'' + ignore + '\'');
    }
    if (pidFilePath) {
        logger(colors.log, '  --save-pid \'' + pidFilePath + '\'');
    }
    logger(colors.cyan, '  --extensions \'' + extensions + '\'');
    logger(colors.log, '  --exec \'' + executor + '\'');
    logger(colors.log, '');
    noTS = false;

    // store the call to startProgramm in startChildProcess
    // in order to call it later
    startChildProcess = function () {
        startProgram(program, executor);
    };

    // if we have a program, then run it, and restart when it crashes.
    // if we have a watch folder, then watch the folder for changes and restart
    // the prog
    startChildProcess();

    // If interaction has not been disabled, start the CLI
    if (interactive) {
        //
        // Read input from stdin
        //
        const stdin = process.stdin;

        stdin.setEncoding('utf8');
        stdin.on('readable', function () {
            const chunk = process.stdin.read();
            //
            // Restart process when user inputs rs
            //
            if (chunk !== null && chunk === 'rs\n' || chunk === 'rs\r\n') {
                //      process.stdout.write('data: ' + chunk);
                crash();
            }
        });
    }

    if (ignore) {
        const ignoreItems = ignore.split(',');
        ignoreItems.forEach(function (ignoreItem) {
            ignoreItem = path.resolve(ignoreItem);
            ignoredPaths[ignoreItem] = true;
            logger(colors.log, 'Ignoring directory \'' + ignoreItem + '\'.');
        });
    }

    const watchItems = watch.split(',');
    watchItems.forEach(function (watchItem) {
        watchItem = path.resolve(watchItem);

        if (!ignoredPaths[watchItem]) {
            logger(colors.log, 'Watching directory \'' + watchItem
                + '\' for changes.');
            if (interactive) {
                logger(colors.bright, 'Press rs for restarting the process.');
            }
            findAllWatchFiles(watchItem, function (f) {
                watchGivenFile(f, pollInterval);
            });
        }
    });
}

/**
 * startProgram.
 * @param {string} prog prog
 * @param {string} exec exec
 * @api public
 */
function startProgram(prog, exec) {
    logger(colors.cyan, 'Starting worker process with \'' + exec + ' '
        + prog.join(' ') + '\'');
    crashQueued = false;
    const child = exports.child = spawn(exec, prog, {stdio: 'inherit'});
    // Support for Windows ".cmd" files
    // On Windows 8.1, spawn can't launch apps without the .cmd extention
    // If already retried, let the app crash ... :'(
    if (process.platform === 'win32' && exec.indexOf('.cmd') == -1) {
        child.on('error', function (err) {
            if (err.code === 'ENOENT')
                return startProgram(prog, exec + '.cmd');
        });
    }
    if (child.stdout) {
        // node < 0.8 doesn't understand the 'inherit' option, so pass through
        // manually
        child.stdout.addListener('data', function (chunk) {
            chunk && console.log(chunk);
        });
        child.stderr.addListener('data', function (chunk) {
            chunk && console.log(colors.error, chunk);
        });
    }
    child.addListener('exit', function (code) {
        if (!crashQueued) {
            errConsole = true;
            logger(colors.error, 'Program ' + exec + ' ' + prog.join(' ')
                + ' exited with code ' + code + '\n');
            errConsole = false;
            exports.child = null;
            if (noRestartOn == 'exit' || noRestartOn == 'error' && code !== 0
                    || noRestartOn == 'success' && code === 0) return;
        }
        startProgram(prog, exec);
    });
}

/**
 * print Help.
 * @api public
 */
function help() {
    try {
        const body = fs.readFileSync(__dirname + '/../docs/help', 'utf8');
        console.log(body);
    } catch (e) {
        console.log('"' + e + '" help can\'t be found');
    }
}

/**
 * logger.
 * @param {string} color color
 * @param {string} info info
 * @return {string} console.log console log
 * @api public
 */
function logger(color, info) {
    if (quiet && !errConsole) return null;
    if (timestampFlag && !noTS) {
        console.log(color, '[' + new Date().toLocaleString() + '] ' + info);
    } else {
        console.log(color, info);
    }
}

/**
 * crash.
 * @api public
 */
function crash() {
    if (crashQueued)
        return;

    crashQueued = true;
    const child = exports.child;
    setTimeout(function () {
        if (child) {
            if (instantKillFlag) {
                logger(colors.warn, 'Finishing worker with SIGKILL');
                process.kill(child.pid, 'SIGKILL');
            } else {
                logger(colors.yellow, 'Finishing worker');
                process.kill(child.pid, 'SIGTERM');
            }
        } else {
            logger(colors.yellow, 'Restarting worker');
            startChildProcess();
        }
    }, 50);
}

/**
 * crashWin.
 * @param {string} event event
 * @param {string} filename filename
 * @api public
 */
function crashWin(event, filename) {
    let shouldCrash = true;
    if (event === 'change') {
        if (filename) {
            filename = path.resolve(filename);
            Object.keys(ignoredPaths).forEach(function (ignorePath) {
                if (filename.indexOf(ignorePath + '\\') === 0
                        || filename === ignorePath) {
                    shouldCrash = false;
                }
            });
        }
        if (shouldCrash) {
            if (verbose || restartVerbose) {
                logger(colors.log, 'Changes detected' + (filename ? ': '
                    + filename : ''));
            }
            crash();
        }
    }
}

/**
 * Determine if a file can be written.
 * @param {string} path path
 * @param {string} callback callback
 * @api public
 */
function canWrite(path, callback) {
    fs.open(path, 'w', function (err, fd) {
        if (err) {
            errConsole = true;
            if (err.code === 'EISDIR') {
                logger(colors.error, 'Can\'t open ' + path
                    + '. It\'s a directory.');
            }
            if (err.code === 'EACCESS') {
                logger(colors.error, 'Can\'t open ' + path + '. No access.');
            } else {
                logger(colors.error, 'Can\'t open ' + path + '.');
            }
            errConsole = false;
            return callback(err);
        }
        fs.close(fd, function (err) {
            if (err) return callback(err);
            callback(null, true);
        });
    });
}


const nodeVersion = process.version.split('.');

const isWindowsWithoutWatchFile = process.platform === 'win32'
    && parseInt(nodeVersion[1]) <= 6;

/**
 * watchGivenFile.
 * @param {string} watch watch
 * @param {string} pollInterval pollInterval
 * @api public
 */
function watchGivenFile(watch, pollInterval) {
    if (isWindowsWithoutWatchFile || forceWatchFlag) {
        fs.watch(watch, {persistent: true, interval: pollInterval}, crashWin);
    } else {
        fs.watchFile(watch, {persistent: true,
            interval: pollInterval}, function (oldStat, newStat) {
            // we only care about modification time, not access time.
            if (newStat.mtime.getTime() !== oldStat.mtime.getTime()) {
                const fileChanged = colors.underscoreStr + watch + colors.reset;
                if (verbose) {
                    logger(colors.bright, 'File changed: ' + fileChanged);
                } else {
                    logger(colors.log, 'File changed: ' + fileChanged);
                }
            }
            crash();
        });
    }
    if (verbose) {
        logger(colors.log, 'Watching file \'' + watch + '\'');
    }
}

/**
 * findAllWatchFiles.
 * @param {string} dir dir
 * @param {string} callback callback
 * @api public
 */
const findAllWatchFiles = function (dir, callback) {
    dir = path.resolve(dir);
    if (ignoredPaths[dir])
        return;
    fs[ignoreSymLinks ? 'lstat' : 'stat'](dir, function (err, stats) {
        if (err) {
            errConsole = true;
            logger(colors.error, 'Error retrieving stats for file: ' + dir);
            errConsole = false;
        } else {
            if (ignoreSymLinks && stats.isSymbolicLink()) {
                logger(colors.log, 'Ignoring symbolic link \'' + dir + '\'.');
                return;
            }
            if (stats.isDirectory()) {
                if (isWindowsWithoutWatchFile || forceWatchFlag) callback(dir);
                fs.readdir(dir, function (err, fileNames) {
                    if (err) {
                        errConsole = true;
                        logger(colors.error, 'Error reading path: ' + dir);
                        errConsole = false;
                    } else {
                        fileNames.forEach(function (fileName) {
                            findAllWatchFiles(path.join(dir, fileName),
                                callback);
                        });
                    }
                });
            } else {
                if ((!isWindowsWithoutWatchFile || !forceWatchFlag)
                        && dir.match(fileExtensionPattern)) {
                    callback(dir);
                }
            }
        }
    });
};
