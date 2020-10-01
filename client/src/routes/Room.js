import React, { useRef, useEffect,useState   } from "react";
import io from "socket.io-client";

const Room = (props) => {
    const userVideo = useRef();
    const partnerVideo = useRef();
    const peerRef = useRef();
    const socketRef = useRef();
    const otherUsers = useRef([]);
    const userStream = useRef();
    const peersRef = useRef({});
    const [peerStreams,setPeerStreams] = useState({});

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ audio: false, video: true }).then(stream => {
            userVideo.current.srcObject = stream;
            userStream.current = stream;

            socketRef.current = io.connect("/");
            socketRef.current.emit("join_room", props.match.params.roomID);

            socketRef.current.on('other_users', users => {
                otherUsers.current = users;
                console.log('Other users in class ', users)
                users.forEach(userID => {
                    callUser(userID);
                });
            });

            socketRef.current.on("user_joined", userID => {
                console.log('New User Joined ', userID);
                const userIsInList = otherUsers.current.find(user => user === userID);
                if(!userIsInList) otherUsers.current.push(userID);
            });

            socketRef.current.on("offer", handleRecieveCall);

            socketRef.current.on("answer", handleAnswer);

            socketRef.current.on("ice-candidate", handleNewICECandidateMsg);
        });

    }, []);

    function callUser(userID) {
        const peer  = createPeer(userID);
        userStream.current.getTracks().forEach(track => peer.addTrack(track, userStream.current));
        // console.log(peersRef.current);
    }

    function createPeer(userID) {
        const peer = new RTCPeerConnection({ 
            iceServers: [
                {
                    urls: "stun:stun.stunprotocol.org"
                },
                {
                    urls: 'turn:numb.viagenie.ca',
                    credential: 'muazkh',
                    username: 'webrtc@live.com'
                },
            ]
        });

        peer.onicecandidate = (e) => handleICECandidateEvent(e,userID);
        peer.ontrack = (e) => handleTrackEvent(e,userID);
        peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);
        peersRef.current[userID] = peer;
        return peer;
    }

    function handleNegotiationNeededEvent(userID) {
        peersRef.current[userID].createOffer().then(offer => {
            return peersRef.current[userID].setLocalDescription(offer);
        }).then(() => {
            const payload = {
                target: userID,
                caller: socketRef.current.id,
                sdp: peersRef.current[userID].localDescription
            };
            socketRef.current.emit("offer", payload);
        }).catch(e => console.log(e));
    }

    function handleRecieveCall(incoming) {

        const newpeer = createPeer(incoming.caller);
        const desc = new RTCSessionDescription(incoming.sdp);
        newpeer.setRemoteDescription(desc).then(() => {
            userStream.current.getTracks().forEach(track => newpeer.addTrack(track, userStream.current));
        }).then(() => {
            return newpeer.createAnswer();
        }).then(answer => {
            return newpeer.setLocalDescription(answer);
        }).then(() => {
            const payload = {
                target: incoming.caller,
                caller: socketRef.current.id,
                sdp: newpeer.localDescription
            }
            // console.log('answer ready ', payload);
            socketRef.current.emit("answer", payload);
        })
    }

    function handleAnswer(message) {
        const desc = new RTCSessionDescription(message.sdp);
        peersRef.current[message.caller].setRemoteDescription(desc).catch(e => console.log(e));
    }

    function handleICECandidateEvent(e,userID) {
        if (e.candidate) {
            // console.log('ice candidate updates');
            const payload = {
                target: userID,
                candidate: e.candidate,
                sender: socketRef.current.id
            }
            socketRef.current.emit("ice-candidate", payload);
        }
    }

    function handleNewICECandidateMsg(incoming) {
        const candidate = new RTCIceCandidate(incoming.candidate);
        console.log(peersRef.current);
        peersRef.current[incoming.sender].addIceCandidate(candidate)
            .catch(e => console.log(e));
    }

    function handleTrackEvent(e,userID) {
        setPeerStreams(s => {
            return {...s,[userID]: e.streams[0]}
        })
                   var videoDivContainer = document.createElement('div')

                    videoDivContainer.id = userID
                    var videoLabel = document.createElement('div')
                    videoLabel.classList.add('video-label')
                    videoLabel.innerText = `@${ userID}`
                    var videlem = document.createElement('video')
                    videlem.srcObject = e.streams[0];
                    videlem.autoplay = true
                    videlem.id = userID
                    videlem.playsInline = true
                    videoDivContainer.appendChild(videlem)
                    videoDivContainer.appendChild(videoLabel)
                    document
                        .getElementById('remote-streams-container')
                        .appendChild(videoDivContainer)
        // console.log('received media for ',userID,e);
        // partnerVideo.current.srcObject = e.streams[0];
    };

    return (
        <div>
            <video autoPlay ref={userVideo} />
            <div id="remote-streams-container">

            </div>

        </div>
    );
};

export default Room;