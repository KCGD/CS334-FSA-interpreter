import * as path from "path";

//debug lib imports
import { isSea } from 'node:sea';
import { Log } from './lib/util/debug';
import { failwith } from "./lib/util/common";
import { parse, Program } from "./lib/parser/parser";
import { Answer, interpret } from "./lib/interpreter/nterpreter";

//rom import
export let rom:any;
const unpacked_rom_path = path.join(process.cwd(), "./.tsOut/rom.js");
if(isSea()) {
    rom = require('./rom.js').default;
} else {
    // loaded dynamically to not confuse bundler.
    // packed state will load rom.js directly, which esbuild will inline.
    rom = require(unpacked_rom_path).default;
}

const USAGE = `fsa <automata>.fsa <string> <args>`;

//source map support
require('source-map-support').install();

//define process args type
export type processArgs = {
    showHelpDoc:boolean;
    printLicense:boolean;
    debug:boolean;
    printVer: boolean;
    file: string | undefined;
    string: string | undefined;
}
//define object for process arguments
export var ProcessArgs:processArgs = {
    "showHelpDoc":false,
    "printLicense":false,
    "debug":true,
    printVer: false,
    file: undefined,
    string: undefined
}

//parse process arguments
for(let i = 0; i < process.argv.length; i++) {
    switch(process.argv[i]) {
        case "--help":
        case "-h": {
            ProcessArgs.showHelpDoc = true;
        } break;

        case "--license": {
            ProcessArgs.printLicense = true;
        } break;

        case "--version": {
            ProcessArgs.printVer = true;
        } break;

        case "-i": {
            ProcessArgs.file = process.argv[i+1];
            if(!ProcessArgs.file) {
                failwith(`-i argument requires a value.`);
            }
        } break;

        case "-S":
        case "--string": {
            ProcessArgs.string = process.argv[i+1];
            if(!ProcessArgs.string) {
                failwith(`${process.argv[i]} requires an input.`);
            }
        } break;

        // build info
        case "--build-info": {
            let buildinfo;

            try {
                buildinfo = require("./buildinfo.js")();
            } catch (e) {
                Log(`E`, `Failed to load build info. Was it included in the build?`);
                console.error("(This command will always fail in development environment).");
                console.error(e);
                process.exit(1);
            }

            for(const k of Object.keys(buildinfo)) {
                console.log(`${k}: ${buildinfo[k]}`);
            }

            process.exit(0);

        } break;
    }
}


//main function
Main();
async function Main(): Promise<void> {
    if(ProcessArgs.showHelpDoc) {
        rom.readFile("src/assets/helpdoc", (err:any, res:any) => {
            console.log(res.toString());
            process.exit(0);
        })
    }

    /**
     * Print license if --license flag passed
     */
    if(ProcessArgs.printLicense) {
        rom.readFile("LICENSE", (err:any, res:any) => {
            console.log(res.toString());
            process.exit(0);
        })
    }

    /**
     * Print version
     */
    if(ProcessArgs.printVer) {
        rom.readFile("src/assets/helpdoc", (err:any, file:Buffer) => {
            console.log(file.toString().split("\n")[0]);
            process.exit(0);
        })
    }

    /**
     * Make sure automata file exists
     */
    if(!ProcessArgs.file) {
        ProcessArgs.file = process.argv[2];
    }
    if(!ProcessArgs.file) {
        failwith(USAGE);
    };

    /**
     * for input string, read from file specified, if none, read from stdin
     */
    // try parsing file
    let program:Program | undefined = undefined;
    try {
        program = await parse(ProcessArgs.file);
    } catch (e) {
        failwith(`Encountered error parsing "${ProcessArgs.file}": ${e}`);
    }

    // run interpreter
    let answer = {} as Answer;
    try {
        answer = await interpret(program, ProcessArgs.string);
    } catch (e) {
        failwith(`Interpreter error occured: ${e}`);
    }

    // print history
    process.stdout.write(`> [START]`);
    for(const event of answer.path) {
        process.stdout.write(`\n> ${event.state} (${event.token} -> ${event.destination})`);
    }
    process.stderr.write("\n> [END]\n");

    // program analysis
    if(program.accept.includes(answer.ending_state)) {
        Log(`I`, `String was accepted (halted in state: ${answer.ending_state} of accepted states [${program.accept.join(", ")}])`);
    } else {
        Log(`I`, `String was NOT accepted (halted in state: ${answer.ending_state} NOT in accepted states [${program.accept.join(", ")}])`);
    }
}
