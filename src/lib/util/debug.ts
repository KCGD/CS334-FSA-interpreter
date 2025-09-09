import { cyanBright, green, red, yellow, } from "cli-color";
import { WriteStream, createWriteStream } from "fs";


export type LogType = "I" | "W" | "E"; //Info, Warning, Error


//collection of writestreams for open logs
export let LogStreamCollection:{[key:string]: WriteStream} = {};


//logs to console
/**
 * Log helps with logging
 * @param type Type of log to write (I = info, W = warning, E = error)
 * @param debug Set true to flag message as a debug message (wont be logged if debugging mode is off)
 * @param message The message content
 * @param options - file: a file path, silent: silence the stdio output of the log
 */
export type Log = {
    type:LogType;
    debug:boolean;
    message:any
    options:logOpts;
}
export type logOpts = {
    file?: string,
    silent?: boolean,
    forward?: Function,
    worker?:string,
}

export function Log(type:LogType, message:any, _debug?:boolean, _options?:logOpts): void {
    let debug = (!!_debug);
    let options = (_options)? _options : {};

    // text styling
    let _typeText:string = {"I":green("I"), "W":yellow("W"), "E":red("E")}[type];
    let debugText:string = (debug)? `(${yellow("DEBUG")})` : "";
    let workerText:string = (options.worker)? `[${cyanBright(`WORKER ${options.worker}`)}]` : "";

    let messageText = `[${GetTime()}] [${_typeText}] ` + workerText + debugText + `: ${message}`;

    //log message to console if not silenced and not forwarding to parent
    if(options && !options.silent && !options.forward) {
        if(type === "E") {
            console.error(messageText);
        } else {
            console.log(messageText);
        }
    }

    //log to file if file property and not forwarding to parent
    if(options && options.file && !options.forward) {
        //optimized with streaming
        if(!LogStreamCollection[options.file]) {
            LogStreamCollection[options.file] = createWriteStream(options.file);
        }
        LogStreamCollection[options.file].write(`${messageText}\n`);
    }

    //forward if specified (AS JSON)
    if(options && options.forward) {
        options.forward(LogToJson(type, debug, message, options));
    }
}


//get current time as string
export function GetTime():string {
    let dt = new Date();

    let date = ("0" + dt.getDate()).slice(-2);
    let month = ("0" + (dt.getMonth() + 1)).slice(-2);
    let year = dt.getFullYear();
    let hours = dt.getHours();
    let minutes = dt.getMinutes();
    let seconds = dt.getSeconds();
    
    return (year + "-" + month + "-" + date + "_" + hours + ":" + minutes + ":" + seconds)
}


//log args to json object
export function LogToJson(type:LogType, debug:boolean, message:any, options:logOpts={}): string {
    return JSON.stringify({
        type:type,
        debug:debug,
        message:message,
        options:options
    })
}

//log args json back to object (property-validated)
export function JsonToLog(log:string): Log {
    try {
        let obj = JSON.parse(log);
        throwif(!obj["type"] && typeof obj.type === "string");
        throwif(!obj["debug"] && typeof obj.debug !== "boolean");
        throwif(!obj["message"]);
        throwif(!obj["options"]);

        return obj as Log;
    } catch (e) {
        throw "Log Object could not be parsed";
    }

    function throwif(cond:boolean): void {
        if(cond) {throw ""}
    }
}