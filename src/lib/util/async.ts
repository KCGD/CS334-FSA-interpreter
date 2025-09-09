//simple class for keeping track of multiple aync events, and calling a callback once all complete
export class Async {
    private initialized:boolean = false;
    private total:number = 0;
    private callback:Function = () => {};

    constructor(){};

    public add(some?:any): void {
        if(!this.initialized) {
            this.initialized = true;
        }
        this.total++;
    }

    public set(amount:number): void {
        this.total = amount;
    }

    public resolve(some?:any): void {
        this.total--;
        if(this.total === 0) {
            this.callback();
        } else if (this.total < 0) {
            console.log("async resolved below zero. Make sure resolve is called only once per event");
        }
    }

    public setCallback(func:Function): void {
        this.callback = func;
    }
}