import PromptSync from "prompt-sync";
import { ProcessArgs } from "../../main";
import { Program } from "../parser/parser";

const prompt = PromptSync();

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
    private ancestry: Array<string>;
    public current_state: string;
    public path: Array<Event>;

    constructor(state:string, ancestry?:Array<string>, path?:Array<Event>) {
        this.current_state = state;
        this.ancestry = ancestry ?? [];
        this.path = path ?? [];
    }

    public setState(state:string) {
        this.current_state = state;
    }

    public push_event(event:Event) {
        this.path.push(event);
    }
}

export async function interpret(prog:Program, string?:string, opts?:InterpreterOpts): Promise<Answer> {
    let interpreter_states = new Array<InterpreterState>(new InterpreterState(prog.start));

    if(!string) {
        throw new Error(`No string supplied (add STDIN support!)`);
    }

    // start log
    if(!ProcessArgs.quiet) {
        process.stdout.write(`> [START]`);
    }

    for(const token of string) {
        for(const i_state of interpreter_states) {
            // make sure token exists in language
            if(!opts?.ignoreLangCheck) {
                if(!prog.lang.includes(token)) {
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

            // interpret
            let destination = pickByWeight(prog.states[i_state.current_state][token]);
            if(!destination) {
                throw new Error(`Interpreter error: fault in choosing a transform function: ${prog.states[i_state.current_state][token]}`);
            }

            // record
            let event = {
                state: i_state.current_state,
                token: token,
                destination: destination
            } as Event;

            // print step
            if(!ProcessArgs.quiet) {
                process.stdout.write(`\n> ${event.state} (${event.token} -> ${event.destination})`);
            }

            i_state.push_event(event);
            i_state.current_state = destination;

            // check for null state
            if(i_state.current_state === "null") {
                break;
            }
        }
    }

    // end message
    if(!ProcessArgs.quiet) {
        process.stderr.write("\n> [END]\n");
    }

    return {
        ending_state: interpreter_states[0].current_state,
        path: interpreter_states[0].path
    }
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

function pickByWeight(weights: {[key:string]: number}) {
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
  