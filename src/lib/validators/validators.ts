export function valid_string(string:string, _varname?:string, _propname?:string, _funcname?:string): void {
    if(!(typeof string === "string")) {
        throw new Error(`Expected type "string", recieved "${typeof string}". ${info_string(_varname, _propname, _funcname)}`);
    }

    if(!string.length) {
        throw new Error(`Recieved empty string. ${info_string(_varname, _propname, _funcname)}`);
    }
}

export function valid_port(port:number, _varname?:string, _propname?:string, _funcname?:string): void {
    if(typeof port !== "number") {
        throw new Error(`Expected type "number", recieved "${typeof port}". ${info_string(_varname, _propname, _funcname)}`);
    }

    if(Number.isNaN(port)) {
        throw new Error(`Recieved NaN value for port. ${info_string(_varname, _propname, _funcname)}`);
    }

    if(port < 1) {
        throw new Error(`Illegal port value: ${port}. ${info_string(_varname, _propname, _funcname)}`);
    }
}

export function valid_url(url:string, _varname?:string, _propname?:string, _funcname?:string): void {
    valid_string(url, "url", undefined, "valid_url");

    // validate url
    try {
        new URL(url);
    } catch (e) {
        throw new Error(`Invalid url: ${e}. ${info_string(_varname, _propname, _funcname)}`);
    }
}

function info_string(_varname?:string, _propname?:string, _funcname?:string): string {
    let function_info = (_funcname)
        ? `In function <${_funcname}>` 
        : '';
    let var_info = (_varname)
        ? ((_propname)
            ? `Accessing property <${_propname}> of <${_varname}>` 
            : `Accessing variable <${_varname}>`) 
        : ``;
    let info = [function_info, var_info].join(' | ');
    return (info.length)? info : "";
}