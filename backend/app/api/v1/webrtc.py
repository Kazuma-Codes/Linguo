import json, logging, asyncio, tempfile, os, uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
import av, webrtcvad
from app.core.redis import redis_client
from arq import create_pool
from arq.connections import RedisSettings
from app.core.config import settings
from app.core.storage import minio_client, ensure_bucket

router = APIRouter()
logger = logging.getLogger(__name__)
pcs = set()

class LiveAudioProcessor(MediaStreamTrack):
    kind = "audio"
    def __init__(self, track, room_id):
        super().__init__()
        self.track = track; self.room_id = room_id
        self.vad = webrtcvad.Vad(2); self.buffer = bytearray(); self.speech_active = False

    async def recv(self):
        frame = await self.track.recv()
        resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
        for r_frame in resampler.resample(frame):
            pcm = r_frame.to_ndarray().tobytes()
            for i in range(0, len(pcm), 480):
                chunk = pcm[i:i+480]
                if len(chunk) < 480: break
                try: is_speech = self.vad.is_speech(chunk, 16000)
                except: is_speech = False
                if is_speech: self.speech_active = True; self.buffer.extend(chunk)
                elif self.speech_active:
                    await self.process(self.buffer); self.buffer.clear(); self.speech_active = False
        return frame

    async def process(self, audio_bytes):
        ensure_bucket("live-audio")
        obj_name = f"{uuid.uuid4()}.wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            f.write(b'RIFF' + (len(audio_bytes)+36).to_bytes(4, 'little') + b'WAVEfmt ' + (16).to_bytes(4, 'little') + (1).to_bytes(2, 'little')*2 + (16000).to_bytes(4, 'little') + (32000).to_bytes(4, 'little') + (2).to_bytes(2, 'little') + (16).to_bytes(2, 'little') + b'data' + len(audio_bytes).to_bytes(4, 'little') + audio_bytes)
            minio_client.fput_object("live-audio", obj_name, f.name)
        os.unlink(f.name)
        pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
        await pool.enqueue_job('process_live_voice', f"live-audio/{obj_name}", self.room_id)

@router.websocket("/ws/live/{room_id}")
async def webrtc_sig(ws: WebSocket, room_id: str):
    await ws.accept()
    pc = RTCPeerConnection(); pcs.add(pc)
    @pc.on("track")
    def on_track(track):
        if track.kind == "audio": pc.addTrack(LiveAudioProcessor(track, room_id))
    try:
        while True:
            msg = await ws.receive_json()
            if msg["type"] == "offer":
                await pc.setRemoteDescription(RTCSessionDescription(sdp=msg["sdp"], type="offer"))
                ans = await pc.createAnswer(); await pc.setLocalDescription(ans)
                await ws.send_json({"type": "answer", "sdp": pc.localDescription.sdp})
    except WebSocketDisconnect: await pc.close(); pcs.discard(pc)