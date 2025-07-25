const socket = io();
let peerConnection;
const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

async function initMedia() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = stream;
    setupSocketAndPeer(stream);
  } catch (err) {
    alert("Please allow access to camera and microphone.");
    console.error(err);
  }
}

function setupSocketAndPeer(stream) {
  socket.on('partner-found', async ({ partnerId }) => {
    peerConnection = new RTCPeerConnection(config);
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = e => {
      if (e.candidate) {
        socket.emit('signal', { candidate: e.candidate });
      }
    };

    peerConnection.ontrack = e => {
      remoteVideo.srcObject = e.streams[0];
    };

    if (socket.id < partnerId) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('signal', { offer });
    }

    socket.on('signal', async data => {
      if (data.offer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { answer });
      } else if (data.answer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      } else if (data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socket.on('partner-disconnected', () => {
      alert("Stranger left. Reloading...");
      location.reload();
    });
  });
}

document.getElementById('next').addEventListener('click', () => {
  location.reload();
});

initMedia();
