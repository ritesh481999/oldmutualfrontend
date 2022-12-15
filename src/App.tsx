import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WebRTC } from "./sdk";

const serverUrl = "wss://rkg-webrtc-poc.herokuapp.com/";
const contraints = { video: true, audio: false }

const App = () => {
    const localStream = useRef<HTMLVideoElement>(null);
    const remoteStream = useRef<HTMLVideoElement>(null);
    const webrtc = useMemo(() => new WebRTC(), [])
    const [onlineMembers, setOnlineMembers] = useState<string[]>([]);


    const getMediaDevices = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia(contraints);
        if (localStream.current) {
            localStream.current.srcObject = stream;
            webrtc.addLocalStream(stream);
        }
    }, [])

    const remoteStreamListener = useCallback(async (stream: MediaStream) => {
        if (remoteStream.current) {
            remoteStream.current.srcObject = stream;
        }
    }, [])


    useEffect(() => {
        webrtc.on("remote-stream", remoteStreamListener);
    }, [remoteStream])

    useEffect(() => {
        getMediaDevices();
        const myUsername = prompt("what's your username?") as string;
        const sessionId = localStorage.getItem(`${myUsername} sessionId`) ?? nanoid();
        webrtc.join(myUsername, sessionId);
        localStorage.setItem(`${myUsername} sessionId`, sessionId);
        webrtc.on("update-online-members-list", (users: string[]) => {
            setOnlineMembers(prevOnlineMembers => prevOnlineMembers.concat(users));
        })
        webrtc.on("member-left", (user: string) => {
            setOnlineMembers(prevOnlineMembers => prevOnlineMembers.filter((member) => member !== user));
        })
    }, []);


    return (
        <div>
            <h1>Video Call</h1>
            <ul>
                {onlineMembers.map((user, index) => {
                    return <li key={index}>{user} - <button onClick={() => { webrtc.makeCall(user) }}>call</button></li>
                })}
            </ul>
            <video ref={localStream} autoPlay playsInline></video>
            <video ref={remoteStream} autoPlay playsInline></video>
        </div>
    )
}

export default App;