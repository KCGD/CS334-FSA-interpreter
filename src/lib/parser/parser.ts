import { createReadStream, existsSync, readFileSync } from "fs";
import { createInterface } from "readline";

// index is token, value is state subset -> key is state name, number is probability
type State = {[key:string]: {[key:string]: number}};

export type Program = {
    lang: Array<string>;
    accept: Array<string>;
    start: string;
    states: {[key:string]: State};
    vars: {[ley:string]: any};
}

const REG = {
    between_brackets: /(?<=\[)(.*?)(?=\])/
}

export type ParserState = "General" | "State";

/**
 * rules:
 * "=" means assignment
 *  "[" means start array, "]" means end
 * ":" means definition of state (iff followed by nothing after the ':')
 *  state definition terminates when next state defined OR EOF reached
 */

export async function parse(file:string): Promise<Program> {
    let proto:Program = {
        lang: [],
        accept: [],
        start: "",
        states: {},
        vars: {},
    };

    let state:ParserState = "General";
    let state_name:string = "";
    let line_num = 0;
    
    // make sure file exists
    if(!existsSync(file)) {
        throw new Error(`File "${file}" not found`);
    }

    // parser function
    async function _parse(line:string | null) {
        // do not parse comments
        if(line?.trim().startsWith('#')) {
            return;
        }

        switch(state) {
            case "General": {
                // break - eof
                if(line === null) {
                    break;
                }

                line = line.trim();

                // break - assignment vs definition
                let semicolon_split = line.split(':');
                let equals_split = line.split('=');

                // state definition
                if(semicolon_split.length === 2 && semicolon_split[1].length === 0) {
                    // is a state definition
                    state_name = semicolon_split[0].trim();
                    state = "State";
                    break;
                }

                // assignment
                if(equals_split.length > 1 && equals_split[1].length > 0) {
                    // assigning var
                    let var_name = equals_split[0].trim();
                    let var_value = equals_split[1].trim();
                    
                    // is array or literal?
                    if(var_value.startsWith('[')) {
                        // array
                        let reg_result = REG.between_brackets.exec(var_value);
                        let select = reg_result ? reg_result[0] : null;
                        if(!select) {
                            // parser error, bad array value
                            throw new Error(parse_error(line, line_num, `Invalid array syntax.`));
                        }

                        // assign array value
                        let array_val = select.split(',').map((item) => {return item.trim()});
                        if(array_val.length < 1) {
                            throw new Error(parse_error(line, line_num, `Array value cannot be empty.`));
                        }

                        // assign value
                        proto.vars[var_name] = array_val;
                    } else {
                        // literal
                        proto.vars[var_name] = var_value;
                    }
                }
            } break;

            // State
            case "State": {
                // break - eof
                if(line === null) {
                    break;
                }

                line = line.trim();

                // break - assignment vs definition
                let semicolon_split = line.split(':');
                let equals_split = line.split('=');

                // state definition - switch to new state
                if(semicolon_split.length === 2 && semicolon_split[1].length === 0) {
                    // is a state definition
                    state_name = semicolon_split[0].trim();
                    break;
                }

                // transform function definition - token -> state
                // proto states [state name]["token"] = state
                // 
                let tab_split = line.split('\t');
                if(tab_split.length === 2 && tab_split[1].length > 0) {
                    let token = tab_split[0].trim();
                    let destination_state = tab_split[1].trim();

                    // allocate new state if it isnt already defined
                    if(!proto.states[state_name]) {
                        proto.states[state_name] = {};
                    }

                    // check if token already defined in state
                    if(proto.states[state_name][token]) {
                        throw new Error(parse_error(line, line_num, `Token '${token}' collides with previously defined token.`));
                    };

                    // check if state is single state or state subset (array checker)
                    if(destination_state.startsWith('[')) {
                        // array
                        let reg_result = REG.between_brackets.exec(destination_state);
                        let select = reg_result ? reg_result[0] : null;
                        if(!select) {
                            // parser error, bad array value
                            throw new Error(parse_error(line, line_num, `Invalid array syntax.`));
                        }

                        // assign array value
                        let array_val = select.split(',').map((item) => {return item.trim()});
                        if(array_val.length < 1) {
                            throw new Error(parse_error(line, line_num, `Array value cannot be empty.`));
                        }

                        // check if probability given (sep by '-')
                        // if none, probability is 1
                        for(const i in array_val) {
                            let value = array_val[i];
                            let dashsplit = value.trim().split('-');

                            // check if probability supplied
                            if(dashsplit.length === 2) {
                                let probability = parseFloat(dashsplit[0].trim());
                                let destination = dashsplit[1].trim();
                                console.log(dashsplit);

                                // make sure probability is valid number
                                if(Number.isNaN(probability)) {
                                    throw new Error(parse_error(line, line_num, `Invalid probability (expected float): ${dashsplit[0].trim()}`));
                                }

                                // make sure state is valid string
                                if(destination.length < 1) {
                                    throw new Error(parse_error(line, line_num, `Destination state must not be empty.`));
                                }

                                // good definition
                                if(typeof proto.states[state_name][token] === "undefined") {
                                    proto.states[state_name][token] = {};
                                }
                                proto.states[state_name][token][destination] = probability;

                            // single probability inside an array
                            } else if (!array_val[i].includes('-')) {
                                if(typeof proto.states[state_name][token] === "undefined") {
                                    proto.states[state_name][token] = {};
                                }
                                proto.states[state_name][token][array_val[i]] = 1;

                            // syntax error
                            } else {
                                // syntax error
                                throw new Error(parse_error(line, line_num, `Syntax error in state definition array (position ${i}).`));
                            }
                        }                        
                    } else {
                        // single state definition
                        if(typeof proto.states[state_name][token] === "undefined") {
                            proto.states[state_name][token] = {};
                        }
                        proto.states[state_name][token][destination_state] = 1;
                    }
                } else if (tab_split.length === 2 && tab_split[1].length < 1) {
                    // transform function with no state definition
                    throw new Error(parse_error(line, line_num, `Transform function missing state definition.`));
                }
            } break;
        };

        line_num++;
    }

    // read file and parse by line
    const FILE = readFileSync(file).toString().split('\n');
    for(const line of FILE) {
        await _parse(line);
    }

    // switch explicit and implicit definitions for langs
    // implicitly derive language and states used in automata
    let lang_set = new Set<string>();
    let state_set = new Set<string>();

    for(const state_name of Object.keys(proto.states)) {
        let state_tokens = Object.keys(proto.states[state_name]);

        for(const token of state_tokens) {
            lang_set.add(token);

            for(const state of Object.keys(proto.states[state_name][token])) {
                state_set.add(state);
            }
        }
    }

    // if lang defined explicitly, use it, else use implied language
    if(proto.vars["lang"]) {
        if(!Array.isArray(proto.vars["lang"])) {
            throw new Error(`Illegal type for lang definition, expected array.`);
        }
        proto.lang = proto.vars.lang;
    } else {
        // use lang set
        proto.lang = [...lang_set];
    }

    // match used language against explicit set (catches illegal tokens when language explicitly defined)
    for(const token of [...lang_set]) {
        if(!proto.lang.includes(token)) {
            throw new Error(`Illegal token '${token}' used but not defined in language set.`);
        }
    }

    // check for transform functions which point to undefined states
    let known_states = Object.keys(proto.states);
    for(const state of [...state_set]) {
        if(!known_states.includes(state) && state !== "null") {
            throw new Error(`Illegal reference to undefined state ${state}.`);
        }
    }
    
    // define starting state
    if(!proto.vars["start"]) {
        throw new Error(`Missing starting state definition.`);
    } else {
        proto.start = proto.vars["start"];
    }

    // make sure starting state exists
    // make sure starting state isnt null
    if(proto.start === "null") {
        throw new Error(`Starting state cannot be a null state.`);
    }
    if(!known_states.includes(proto.start)) {
        throw new Error(`Undefined reference to ${proto.start} as starting state.`);
    }

    // define and validate accept states
    if(!proto.vars["accept"]) {
        throw new Error(`Missing accept states definition.`);
    } else {
        if(!Array.isArray(proto.vars["accept"])) {
            throw new Error(`Illegal type for accept states definition, expected array.`);
        }

        for(const state of proto.vars["accept"] as Array<string>) {
            if(state === "null") {
                throw new Error(`Accept states cannot include a null state.`);
            }
            if(!known_states.includes(state)) {
                throw new Error(`Undefined reference to state ${state} in accepted states.`);
            }
        }

        // use accept state
        proto.accept = proto.vars.accept;
    }

    return proto;
}

function parse_error(line:string, line_n:number, reason:string): string {
    return `Parser error occured on line ${line_n}: ${reason}\n\n${line_n}|\t${line.trim()}\n\n`;
}