
interface Conditional {(): boolean};
interface Callback {(): any};

export class Spinlock {
    public interval: number;
    private conditional: Conditional;
    private callback: Callback;
    private loop: NodeJS.Timeout;
    private polling: boolean;

    constructor(conditional:Conditional, callback:Callback, interval:number) {
        this.conditional = conditional;
        this.callback = callback;
        this.interval = interval;
        this.polling = false;

        this.loop = setInterval((): void => {
            try {
                if(!this.polling) {
                    this.polling = true;
                    let status: boolean = this.conditional();

                    if(!status) {
                        /**
                         * Still locked
                         */
                        this.polling = false;
                    } else {
                        /**
                         * Unlocked (conditional is true)
                         */
                        this.polling = false;
                        clearInterval(this.loop);
                        this.callback();
                    }
                }
            } catch (e) {
                /**
                 * Conditional threw an error
                 */
                clearInterval(this.loop);
                throw e;
            }
        }, this.interval);
    }
}