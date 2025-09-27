import PromptSync from "prompt-sync";
import { ProcessArgs } from "../../main";
import { Program } from "../parser/parser";
import { replace_math_chars } from "../chars/char_replace";

const prompt = PromptSync();
const CONSTANT_SYMBOLS = ["null", "\\phi"]; // list of symbols which will always exist in language

type Event = {
    state: string;
    token: string;
    destination: string;
}

export type Answer = {
    ending_state: string;
    path: Array<Event>;
}

export type InterpreterOpts = {
    ignoreLangCheck: boolean;
}

class InterpreterState {
    public current_state: string;
    public path: Array<Event>;
    public accepted: boolean = false;
    public terminated: boolean = false;

    constructor(state:string, path?:Array<Event>) {
        this.current_state = state;
        this.path = path ?? [];
    }

    public setState(state:string) {
        this.current_state = state;
    }

    public push_event(event:Event) {
        this.path.push(event);
    }

    public terminate() {
        this.terminated = true;
    }

    public accept() {
        this.accepted = true;
    }
}

export async function interpret(prog:Program, string?:string, opts?:InterpreterOpts): Promise<Array<Answer>> {
    let interpreter_states = new Array<InterpreterState>(new InterpreterState(prog.start));
    let interpreter_step = 0;

    if(!string && prog.mode === "DFA") {
        throw new Error(`No string supplied (add STDIN support!)`);
    }

    // split string to chars
    let string_array = (string)? string.split('') : [];

    // start log
    if(!ProcessArgs.quiet) {
        process.stdout.write(`> [START]`);
    }

    /**
     * Step function - runs the interpreter for a given state and token
     * @param token 
     * @param i_state 
     * @returns 
     */
    async function _step(token:string, i_state: InterpreterState) {
        // bail if current step is above the maximum allowed steps
        if(interpreter_step > ProcessArgs.max_steps) {
            throw new Error(`Max step limit reached. Bailing.`);
        } else {
            interpreter_step++;
        }

        // make sure token exists in language
        if(!opts?.ignoreLangCheck) {
            if(!prog.lang.includes(token) && !CONSTANT_SYMBOLS.includes(token)) {
                throw new Error(`Recieved token '${token}' which does not exist in language [${prog.lang.join(", ")}]`);
            }
        }

        // run commands
        if(prog.commands) {
            if(prog.commands[i_state.current_state]) {
                for(const c of prog.commands[i_state.current_state]) {
                    command(c.command, c.args);
                }
            }
        }

        // check the current state
        // check for null state - termiante
        if(i_state.current_state === "null") {
            i_state.terminate();
            return;
        }

        // check for accept state
        if(prog.accept.includes(i_state.current_state)) {
            i_state.accept();

            // terminate on accept?
            if(ProcessArgs.term_on_accept) {
                i_state.terminate();
                return;
            }
        }

        // interpret
        let destination = pickByWeight(prog.states[i_state.current_state][token]);

        // handle undefined state
        // error in DFA, emptystate in NFA
        if(!destination) {
            switch(prog.mode) {
                case "DFA": {
                    if(ProcessArgs.auto_insert_nullstate) {
                        destination = "null";
                    } else {
                        throw new Error(`Interpreter error: No transform defined for token ${token} in state ${i_state.current_state}. Pass --auto-insert-nulls to infer null states.`);
                    }
                } break;

                case "NFA": {
                    // transition to emptystate
                    destination = "null";
                }
            }
        }

        // record
        let event = {
            state: i_state.current_state,
            token: token,
            destination: destination
        } as Event;

        // print step
        if(!ProcessArgs.quiet) {
            process.stdout.write(replace_math_chars(`\n> ${event.state} (${event.token} -> ${event.destination})`));
        }

        // transition to next state (split)
        // DFA, direct transition
        // NFA, fork
        if(prog.mode === "DFA") {
            // direct transition
            // direct push to state history
            i_state.push_event(event);

            i_state.current_state = destination;
        } else {
            // branch to new state
            // add branched history state
            let branch_path = [...i_state.path];
            branch_path.push(event);

            // create new branch state
            let newstate = new InterpreterState(destination, branch_path);
            interpreter_states.push(newstate);
        }
    }

    // split iteration based on mode
    // run until all states either accept or terminate
    // DFA -> iterate tokens of string
    // NFA -> iterate paths of state
    let explicit_break = false;
    let alive_states = interpreter_states.filter((s) => {return (!s.accepted && !s.terminated)});

    while(alive_states.length > 0 && !explicit_break) {
        switch(prog.mode) {
            case "DFA": {
                // break the loop if in DFA mode and string is empty
                if(string_array.length < 1) {
                    explicit_break = true;

                    // check if terminating in an accepting state
                    if(prog.accept.includes(interpreter_states[0].current_state)) {
                        interpreter_states[0].accept();
                    }

                    continue;
                }

                // shift string and run step
                let token = string_array.shift() as string;

                // run step for state (DFA is single-state)
                await _step(token, interpreter_states[0]);
            } break;

            case "NFA": {
                // iterate alive states over each token in respective current state
                for(const state of alive_states) {
                    // auto-terminate in null state
                    if(state.current_state === "null" || state.current_state === "\\phi") {
                        state.terminate();
                        continue;
                    }

                    // bug. if accept state has no transitions, it is never interpreted and therefore never accepted by the interpreter
                    let transition_keys = Object.keys(prog.states[state.current_state]);
                    if(transition_keys.length < 1) {
                        // if no transitions defined, insert empty state
                        transition_keys.push("null");
                    }

                    for(const token of transition_keys) {
                        await _step(token, state);
                    }

                    // terminate the current state (all branches created)
                    state.terminate();
                }
            }
        }

        // refresh alive states
        alive_states = interpreter_states.filter((s) => {return (!s.accepted && !s.terminated)});
    }

    // end message
    if(!ProcessArgs.quiet) {
        process.stderr.write("\n> [END]\n");
    }

    return interpreter_states.filter((s) => {return s.accepted}).map((s) => {
        return {
            "ending_state": s.current_state,
            "path": s.path
        }
    })
}

function command(command:string, args:Array<string>): void {
    switch(command) {
        case "$log": {
            if(!ProcessArgs.extquiet) {
                process.stdout.write(`\n${args.join(' ')}`);
            }
        } break;

        case "$pause": {
            prompt({});
        } break;

        default: {
            throw new Error(`Interpreter error: Unknown command "${command}" in "\$${command}(${args.join(", ")})"`);
        }
    }
}

function pickByWeight(weights?: {[key:string]: number}) {
    if(!weights) {
        return null;
    }

    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let chosen: string | undefined = undefined;
  
    let rand = Math.random() * total;
    for (const [key, weight] of entries) {
        if (rand < weight) {
            chosen = key;
            break;
        }
        rand -= weight;
    }

    return chosen;
}
  