import * as path from "path";

/**
 * TODO:
 * DFA accepts all states?
 * or non-accepting path reported as answer
 */

//debug lib imports
import { green, greenBright, redBright } from "cli-color";
import { isSea } from 'node:sea';
import { Answer, interpret } from "./lib/interpreter/interpreter";
import { MODES, parse, Program } from "./lib/parser/parser";
import { failwith } from "./lib/util/common";
import { Log } from './lib/util/debug';
import { PrettyPrint } from "./lib/parser/printer";
import { readFileSync } from "fs";
import { ConvertGraph } from "./lib/fsa_design/json_parse";
import { replace_math_chars } from "./lib/chars/char_replace";

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

const USAGE = `dfa <automata>.dfa -S <string> <args>`;

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
    dumpAst: boolean;
    quiet: boolean;
    extquiet: boolean;
    pretty_print: string | undefined;
    load_json: string | undefined;
    start_state: string | undefined;
    term_on_accept: boolean;
    force_mode: string | undefined;
}
//define object for process arguments
export var ProcessArgs:processArgs = {
    "showHelpDoc":false,
    "printLicense":false,
    "debug":false,
    printVer: false,
    file: undefined,
    string: undefined,
    dumpAst: false,
    quiet: false,
    extquiet: false,
    pretty_print: undefined,
    load_json: undefined,
    start_state: undefined,
    term_on_accept: false,
    force_mode: undefined
}

//parse process arguments
for(let i = 0; i < process.argv.length; i++) {
    let arg = process.argv[i];
    let next = process.argv[i+1];
    switch(process.argv[i]) {
        case "--help":
        case "-h": {
            ProcessArgs.showHelpDoc = true;
        } break;

        case "--debug": {
            ProcessArgs.debug = true;
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

        case "--dump-ast": {
            ProcessArgs.dumpAst = true;
        } break;

        case "-q":
        case "--quiet": {
            ProcessArgs.quiet = true;
        } break;

        case "-qq":
        case "--Quiet": {
            ProcessArgs.extquiet = true;
            ProcessArgs.quiet = true;
        } break;

        case "--pretty-print":
        case "-pp": {
            ProcessArgs.pretty_print = process.argv[i+1];
            if(!ProcessArgs.pretty_print) {
                failwith(`${process.argv[i]} expects a file path.`);
            }
        } break;

        case "-J":
        case "--load-json": {
            if(!next) {
                failwith(`${arg} expects a file path.`);
            }
            ProcessArgs.load_json = next;
        } break;

        case "--start": {
            if(!next) {
                failwith(`${arg} requires a start state value.`);
            }
            ProcessArgs.start_state = next;
        } break;

        case "--term-on-accept": 
        case "-Toa": {
            ProcessArgs.term_on_accept = true;
        } break;

        case "--force-mode": {
            if(!next) {
                failwith(`${arg} requires a value.`);
            }
            ProcessArgs.force_mode = next;
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
    if(!ProcessArgs.load_json) {
        // normal program parsing
        try {
            program = await parse(ProcessArgs.file);
        } catch (e) {
            failwith(`Encountered error parsing "${ProcessArgs.file}": ${e}`);
        }
    } else {
        // load from JSON
        try {
            let obj = JSON.parse(readFileSync(ProcessArgs.load_json).toString());
            program = await ConvertGraph(obj);
        } catch (e) {
            failwith(`Failed to load JSON graph: ${e}`);
        }
    }

    // apply force-mode argument to program
    if(ProcessArgs.force_mode) {
        if(!MODES.includes(ProcessArgs.force_mode)) {
            failwith(`Cannot force to invalid mode: ${ProcessArgs.force_mode}. Must be one of: ${MODES.join(", ")}`);
        }

        program.mode = ProcessArgs.force_mode as Program["mode"];
        program.vars["mode"] = program.mode;
    }

    // dump ast
    if(ProcessArgs.dumpAst) {
        Log(`I`, `----- [AST] -----`);
        console.log(JSON.stringify(program, null, 4));
        Log(`I`, `----- [END AST] -----`);
    }

    // pretty print
    if(ProcessArgs.pretty_print) {
        try {
            await PrettyPrint(program, ProcessArgs.pretty_print);
        } catch (e) {
            failwith(`Pretty-print failed: ${e}`);
        };

        Log(`I`, `Printed dfa to: ${ProcessArgs.pretty_print}`);
        process.exit(0);
    }

    let answers = new Array<Answer>;
    try {
        answers = await interpret(program, ProcessArgs.string, {
            "ignoreLangCheck": (!!ProcessArgs.load_json)    // ignore language validation when loading from json
        });
    } catch (e) {
        console.log(``);
        if(ProcessArgs.debug) {
            console.error(e);
        }
        failwith(`Interpreter error occured: ${e}`);
    }

    // program analysis
    if(answers.length < 1) {
        // not accepted
        console.log(redBright(`NOT ACCEPTED.`));
        console.log(`Found no accepting paths.`);
    } else {
        console.log(greenBright(`ACCEPTED.`));
        console.log(`Found ${answers.length} accepting paths.`);

        // print each accepted path
        let termwidth = process.stdout.columns;
        for(const answer of answers) {
            let output = "";
            let str = "";
            output += '|';

            // assemble the path and string
            for(const e of answer.path) {
                output += ` --> ${e.state} (${e.token} -> ${e.destination})`;
                str += e.token;
            }

            // replace special math charschars
            output = replace_math_chars(output);
            str = replace_math_chars(str);

            // print associated string
            if((output.length + str.length) > termwidth) {
                // print on seperate lines
                console.log(output);
                console.log(`:: ${str}`);
            } else {
                // print on same line
                let spacerwidth = termwidth - output.length - str.length;
                console.log(`${output}${' '.repeat(spacerwidth)}${str}`);
            }
        }
    }
}
