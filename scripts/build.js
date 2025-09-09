const os = require('os');
const { execSync, exec } = require('child_process');
const { existsSync, unlinkSync, readFileSync, writeFileSync, chmodSync } = require('fs');
const { join, parse } = require('path');
const buildsequencesTemplate = require('./buildsequences.template');

/**
 * Defineable fields at initialization
 * these fields are the basis for all other fields and can be defined independantly
 */
//version
const NODE_VERSION = "22.18.0";
//arch (possitilities: x64, arm64)
const ARCH = os.arch();
//platform (possitilities: linux, win, darwin)
const PLATFORM = platformAlias(process.argv[2] || os.platform());


/**
 * Deffered fields
 * These are dependant on being defined later in the script
 */
//executable name
let BIN_PATH = null;
let EXPECTED_NODE_PATH = null;
let NODE = null;
let NODE_ARCHIVE_URL = null;
let NODE_EXECUTABLE_PATH = null;
let OUTPUT_EXECUTABLE_NAME = null;
let PACKAGE_NAME = null;
let PLATFORM_ARCHIVE_EXTENSION = null;

//load package.json
let pkg;
try {
    pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json")));
} catch (e) {
    console.error(`Failed to read package.json from: ${join(process.cwd(), "package.json")}`);
}

/**
 * Define build dependencies
 */
const DEPS = pkg.packageOpts.builddepends.split(",").map((i) => {return i.trim()});

/**
 * Validate arch
 */
if(! (ARCH === "x64" || ARCH === "arm64")) {
    console.error(`Unsupported arch: ${ARCH}`);
    process.exit(1);
}

/**
 * Validate platform
 */
if(! (PLATFORM === "linux" || PLATFORM === "win" || PLATFORM === "darwin")) {
    console.error(`Unsupported platform: ${PLATFORM}`);
    process.exit(1);
}

/**
 * Define package and executable name
 */
try {
    PACKAGE_NAME = pkg.name;
    OUTPUT_EXECUTABLE_NAME = `${PACKAGE_NAME}_${PLATFORM}-${ARCH}`;
    if(!OUTPUT_EXECUTABLE_NAME || OUTPUT_EXECUTABLE_NAME === "") {
        throw `Cant get package name from package.json (${join(process.cwd(), "package.json")})`;
    }
} catch (e) {
    console.log(`Cant get package name from package.json (${join(process.cwd(), "package.json")})`);
    process.exit(1);
}

/**
 * Define archive extension, node version, archive url, node path, bin path and executable path
 */
//define extension because windows uses .zip instead of .tar.xz like on darwin and linux (why...)
PLATFORM_ARCHIVE_EXTENSION = (PLATFORM === "win")? "zip" : "tar.xz";
NODE = `v${NODE_VERSION}-${PLATFORM}-${ARCH}`;
NODE_ARCHIVE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/node-${NODE}.${PLATFORM_ARCHIVE_EXTENSION}`;
EXPECTED_NODE_PATH = (PLATFORM === "win")? parse(NODE_ARCHIVE_URL).name : parse(parse(NODE_ARCHIVE_URL).name).name;
BIN_PATH = join(process.cwd(), ".bin");
NODE_EXECUTABLE_PATH = (PLATFORM === "win")? join(BIN_PATH, EXPECTED_NODE_PATH, "node.exe") : join(BIN_PATH, EXPECTED_NODE_PATH, "bin/node");


/**
 * Check for cached node install, if not found install it
 */
if(!existsSync(join(BIN_PATH, EXPECTED_NODE_PATH))) {
    //download archive
    console.log(`Downloading nodejs (Platform: ${PLATFORM}, Version: ${NODE_VERSION})`);
    if(PLATFORM === "win") {
        execSync(`curl -sL "${NODE_ARCHIVE_URL}" -o "${join(BIN_PATH, "temp.zip")}"`);
        execSync(`unzip "${join(BIN_PATH, "temp.zip")}" -d "${BIN_PATH}"`);
        unlinkSync(join(BIN_PATH, "temp.zip"));
    } else {
        execSync(`curl -sL "${NODE_ARCHIVE_URL}" | tar -xJf - -C "${BIN_PATH}"`);
    }
} else {
    console.log(`Using cached nodejs (Platform: ${PLATFORM}, Version: ${NODE_VERSION})`);
}


/**
 * Confirm existance of node executable where it is expected to be
 */
if(!existsSync(NODE_EXECUTABLE_PATH)) {
    console.error(`Nodejs executable was not found in the expected path: ${NODE_EXECUTABLE_PATH}`);
    console.error(`This can be due to failed extraction or a malformed archive.`);
    process.exit(1);
}


/**
 * Define build sequences for each platform
 * follow definition: {"command": [command], "name": [step name], failureAllowed: boolean, view: boolean}
 */
const SEQUENCES = buildsequencesTemplate({
    NODE_EXECUTABLE_PATH,
    OUTPUT_EXECUTABLE_NAME,
    PACKAGE_NAME
})


/**
 * Perform dependency checks
 */
if(DEPS.length < 1) {
    console.warn(`WARNING: No dependencies specified for ${PLATFORM}. Skipping dependency checks.`);
}
for(let i = 0; i < DEPS.length; i++) {
    process.stdout.write(`Checking for ${DEPS[i]} ... `);
    if(FindInPath(DEPS[i])) {
        process.stdout.write(`FOUND\n`);
    } else {
        process.stdout.write(`NOT FOUND\n`);
        console.error(`Error: could not find dependency ${DEPS[i]}\nIs it installed and accessable in the PATH variable?`);
        process.exit(1);
    }
}


/**
 * Initialize the build sequence
 */
const SEQUENCE = SEQUENCES[PLATFORM + (process.argv.includes("--dev")? "-dev" : "")];
if(process.argv.includes("--generate-build-script")) {
    let file = `./build_${PLATFORM + (process.argv.includes("--dev")? "-dev" : "")}_${ARCH}.sh`;
    let script = generate_build_script(SEQUENCE);
    writeFileSync(file, script);
    console.log(`Wrote build script to: ${file}`);
    process.exit(0);
} else {
    build(SEQUENCE);
}


/**
 * Function to run a build sequence
 * @param {*} sequence - the sequence to run
 */
function build(sequence) {
    let i = 0;
    const totalSteps = sequence.length + 1;
    let startTime = Date.now();
    let stdoutFrame = [];

    //print build progress
    let progressLoop = setInterval(function() {
        printProgress();
    }, 100);
    
    _step();
    function _step() {
        if (i >= sequence.length) {
            clearInterval(progressLoop);
            printProgress(true);
            console.log("\nBuild completed. All commands executed successfully.");
        } else {
            let step = exec(sequence[i].command, {'stdio':'inherit'});
            printProgress();

            //increment i when step completes and clear stdout frame
            step.on('exit', function(code) {
                process.stdout.write('\n');
                if(code === 0) {
                    i++;
                    stdoutFrame = [];
                    _step();
                } else {
                    if(!sequence[i].failureAllowed) {
                        error();
                    } else {
                        i++;
                        stdoutFrame = [];
                        _step();
                    }
                }
            })

            //log stdout/stderr data to frame
            step.stdout.on('data', (data) => {
                stdoutFrame.push(data);
            })
            step.stderr.on('data', (data) => {
                stdoutFrame.push(data);
            })

            //log error on build sequence failure
            step.on('error', function(e) {
                if(!sequence[i].failureAllowed) {
                    error();
                } else {
                    i++;
                    stdoutFrame = [];
                    _step();
                }
            })
        }
    }

    function error() {
        process.stdout.write("\n\n");
        for(let i = 0; i < stdoutFrame.length; i++) {
            process.stdout.write(stdoutFrame[i]);
        }
        process.stdout.write("\n\n");

        console.log(`Error occured in "${sequence[i].name}" (${i+1}/${totalSteps})`);
        process.exit(1);
    }

    function printProgress(final) {
        let currentTime = Date.now();
        let elapsed = currentTime - startTime;
        let seconds = Math.floor(elapsed/1000);
        let tenths = Math.floor(elapsed%1000)/100;
        let time = `${seconds}.${Math.round(tenths)}`;

        let name = final? `${sequence[sequence.length - 1].name}` : `${sequence[i].name}`
        let progress = final? `${totalSteps}/${totalSteps}` : `${i+1}/${totalSteps}`;
        let output = `[${progress}] ${name} (${time}s)`;

        //print output
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(output);
    }
}

/**
 * convert build sequence to executable shell script
 * @param {*} seq 
 * @returns 
 */
function generate_build_script(seq) {
    let file = [];
    file.push("#!/bin/sh");

    for(const step of seq) {
        file.push(`${step.command} ${(step.failureAllowed)? ";" : "&&"}`);
    }

    file.push("exit");

    return file.join("\n");
}

//prints text at bottom of screen
function printAtBottom(text) {
    const rows = process.stdout.rows;
    // Move the cursor to the bottom of the terminal
    process.stdout.cursorTo(0, rows - 1);
    // Clear the line to ensure clean output
    process.stdout.clearLine(0);
    // Print the text
    process.stdout.write(text);
}


/**
 * Alias function for platforms
 * @param {*} platform taken from either os lib or user input
 * @returns the alias of said platform for standardization
 */
function platformAlias(platform) {
    switch(platform) {
        case "win32": {
            return "win";
        } break;
        case "auto": {
            return os.platform();
        } break;
        default:
            return platform;
    }
}


/**
 * Platform-independent dependency checker
 * @param {*} dep name fo dependency to find
 * @returns the path of the dependency if found, undefined if not found
 */
function FindInPath(dep) {
    const sys = os.platform();
    //if any of these commands fail, it means not found
    switch (sys) {
        //UNIX
        case "linux":
        case "darwin": {
            try {
                return String(execSync(`which ${dep}`)).replace(/\n/g, "").replace(/\r/g, "");
            } catch (e) {
                return undefined;
            }
            
        }

        //NT
        case "win32": {
            try {
                return String(execSync(`where ${dep}.exe`)).replace(/\n/g, "").replace(/\r/g, "");
            } catch (e) {
                return undefined;
            }
            
        }

        //unsupported platform
        default: {
            return undefined;
        }
    }
}