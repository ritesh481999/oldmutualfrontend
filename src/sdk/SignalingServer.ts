import { io, Socket } from "socket.io-client";

export class SignallingServer {
    private socket: Socket;
    private registeredEvents: Record<string, any>;

    constructor() {
        this.registeredEvents = {}
        this.socket = io("http://localhost:5000");
        this.socket.onAny((eventName, ...args) => {
            if (this.registeredEvents[eventName]) {
                const eventHandler = this.registeredEvents[eventName];
                eventHandler(...args);
            }
        });
    }

    public on = (event: string, fn: any) => {
        const allowedEvents = ["member-joined", "member-left", "make-call", "accept-call", "call-signal", "online-members"];
        if (allowedEvents.includes(event)) {
            this.registeredEvents[event] = fn;
        } else {
            console.log(`event ${event} is not allowed to register`);
        }
    }

    public emit = (event: string, data: any) => {
        const allowedEvents = ["join", "make-call", "accept-call", "call-signal"];
        if (allowedEvents.includes(event)) {
            if (event === "join") {
                this.socket.auth = { sessionId: data.sessionId };
                delete data.sessionId;
            }
            this.socket.emit(event, { ...data });
        } else {
            console.log(`event ${event} is not allowed to emit`);
        }
    }
}
