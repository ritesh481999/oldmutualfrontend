import { SignallingServer } from "./SignalingServer";

const iceServers = [
  {
    urls: "stun:stun.call.43.241.63.86",
  },
  {
    urls: "turn:turn.call.43.241.63.86",
    username: "guest",
    credential: "somepassword",
  }
];

export class WebRTC {
  private server: SignallingServer;
  private pc: RTCPeerConnection;
  public username: string;
  private registeredEvents: Record<string, any>;
  private callPartner: string;

  constructor() {
    this.registeredEvents = {}
    this.pc = new RTCPeerConnection({ iceServers });
    this.server = new SignallingServer();
    this.registerEvents();
  }

  public on = (event: string, fn: any) => {
    const allowedEvents = ["update-online-members-list", "remote-stream", "member-left"];
    if (allowedEvents.includes(event)) {
      this.registeredEvents[event] = fn;
    } else {
      console.log(`event ${event} is not allowed to register`);
    }
  };

  private registerEvents = () => {
    this.server.on("member-joined", ({ username }: { username: string }) => {
      if (this.registeredEvents["update-online-members-list"]) {
        const eventHandler =
          this.registeredEvents["update-online-members-list"];
        eventHandler([username]);
      }
    });

    this.server.on("member-left", ({ username }: { username: string }) => {
      console.log(`${username} left the server`);
      if (this.registeredEvents["member-left"]) {
        const eventHandler =
          this.registeredEvents["member-left"];
        eventHandler(username);
      }
    });

    this.server.on("online-members", ({ users }: { users: [string] }) => {
      if (this.registeredEvents["update-online-members-list"]) {
        const eventHandler =
          this.registeredEvents["update-online-members-list"];
        eventHandler(users);
      }
    });

    this.server.on("make-call", ({ from, offer }: any) => {
      this.acceptCall(from, offer);
    });

    this.server.on("accept-call", ({ answer }: any) => {
      this.addAnswer(answer);
    });

    this.server.on("call-signal", ({ candidate }: any) => {
      this.addCandidate(candidate);
    });

    this.pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        this.server.emit("call-signal", {
          from: this.username,
          to: this.callPartner,
          candidate: event.candidate,
        });
      }
    };

    this.pc.ontrack = (event) => {
      if (this.registeredEvents["remote-stream"]) {
        const eventHandler = this.registeredEvents["remote-stream"];
        eventHandler(event.streams[0]);
      }
    }
  };

  public join = (username: string, sessionId: any) => {
    this.username = username;
    this.server.emit("join", { username , sessionId });
  };

  public addLocalStream = (stream: MediaStream) => {
    const tracks = stream.getTracks();
    for (const track of tracks) {
      this.pc.addTrack(track, stream);
    }
  };

  public makeCall = async (to: string) => {
    this.callPartner = to;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.server.emit("make-call", {
      from: this.username,
      to: this.callPartner,
      offer,
    });
  };

  public acceptCall = async (from: string, offer: any) => {
    this.callPartner = from;
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.server.emit("accept-call", {
      from: this.username,
      to: this.callPartner,
      answer,
    });
  };

  private addAnswer = async (answer: any) => {
    await this.pc.setRemoteDescription(answer);
  };

  private addCandidate = async (candidate: any) => {
    await this.pc.addIceCandidate(candidate);
  };
}
