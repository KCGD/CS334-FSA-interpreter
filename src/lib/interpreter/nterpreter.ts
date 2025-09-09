import { Program } from "../parser/parser";

type Event = {
    state: string;
    token: string;
    destination: string;
}

export type Answer = {
    ending_state: string;
    path: Array<Event>;
}

export async function interpret(prog:Program, string?:string): Promise<Answer> {
    let path = new Array<Event>;
    let current_state = prog.start;

    if(!string) {
        throw new Error(`No string supplied (add STDIN support!)`);
    }

    for(const token of string) {
        // make sure token exists in language
        if(!prog.lang.includes(token)) {
            throw new Error(`Recieved token '${token}' which does not exist in language [${prog.lang.join(", ")}]`);
        }

        let destination = prog.states[current_state][token];

        let event = {
            state: current_state,
            token: token,
            destination: destination
        } as Event;

        path.push(event);
        current_state = destination;
    }

    return {
        ending_state: current_state,
        path: path
    }
}