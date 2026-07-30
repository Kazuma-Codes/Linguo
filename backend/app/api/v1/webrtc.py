"""WebRTC live voice interpretation endpoint.

Endpoint:
- WS /ws/live/{room_id}: Live audio stream with real-time translation.

This is an optional router — only loaded if aiortc, webrtcvad, and av are installed.

Flow:
  1. Client opens a WebSocket and sends an SDP offer.
  2. Server creates an RTCPeerConnection, adds a LiveAudioProcessor track.
  3. Audio is resampled to 16kHz mono, passed through VAD (Voice Activity Detection).
  4. When speech ends, the buffered PCM is converted to WAV and uploaded to MinIO.
  5. A 'process_live_voice' job is enqueued for transcription + translation.
"""

import io
import logging
import uuid
import wave

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
import av
import webrtcvad
from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings
from app.core.storage import minio_client, ensure_bucket

router = APIRouter()
logger = logging.getLogger(__name__)

# Track all active peer connections for cleanup
pcs: set[RTCPeerConnection] = set()

# Audio processing constants
SAMPLE_RATE = 16000                                    # Standard for speech recognition
FRAME_MS = 20                                         # webrtcvad accepts 10, 20, or 30 ms frames
BYTES_PER_SAMPLE = 2                                  # 16-bit PCM
FRAME_BYTES = int(SAMPLE_RATE * (FRAME_MS / 1000) * BYTES_PER_SAMPLE)  # 640 bytes per frame

# Shared arq pool for enqueuing live voice jobs
_arq_pool = None


async def get_arq_pool():
    """Return a shared arq connection pool (created once, reused for all job dispatches)."""
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    return _arq_pool


def pcm_to_wav_bytes(pcm: bytes) -> bytes:
    """Wrap raw 16kHz mono PCM bytes in a proper WAV header using the stdlib."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(BYTES_PER_SAMPLE)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(pcm)
    return buf.getvalue()


class LiveAudioProcessor(MediaStreamTrack):
    """Custom MediaStreamTrack that processes incoming audio in real-time.

    - Resamples incoming audio to 16kHz mono (required by VAD and Whisper).
    - Uses WebRTC VAD to detect speech segments.
    - When speech ends, uploads the buffered PCM as a WAV file to MinIO.
    """

    kind = "audio"

    def __init__(self, track, room_id: str):
        super().__init__()
        self.track = track
        self.room_id = room_id
        self.vad = webrtcvad.Vad(2)       # Aggressiveness: 0 (most lenient) to 3 (most aggressive)
        self.buffer = bytearray()
        self.speech_active = False
        # Create the resampler once, not on every recv() call
        self.resampler = av.AudioResampler(format="s16", layout="mono", rate=SAMPLE_RATE)

    async def recv(self):
        """Called by aiortc for each incoming audio frame."""
        frame = await self.track.recv()

        # Resample to 16kHz mono and process each output frame
        for resampled in self.resampler.resample(frame):
            pcm = resampled.to_ndarray().tobytes()
            await self._process_pcm(pcm)

        return frame

    async def _process_pcm(self, pcm: bytes):
        """Process PCM data in frame-sized chunks through the VAD."""
        for i in range(0, len(pcm), FRAME_BYTES):
            chunk = pcm[i:i + FRAME_BYTES]
            if len(chunk) < FRAME_BYTES:
                break  # Partial frame — VAD requires exact frame size

            is_speech = self._is_speech(chunk)

            if is_speech:
                self.speech_active = True
                self.buffer.extend(chunk)
            elif self.speech_active:
                # Speech ended — flush the buffered segment
                await self._flush_segment()

    def _is_speech(self, chunk: bytes) -> bool:
        """Check if an audio chunk contains speech. Returns False on VAD errors."""
        try:
            return self.vad.is_speech(chunk, SAMPLE_RATE)
        except Exception:
            logger.exception("VAD failed on audio chunk for room %s", self.room_id)
            return False

    async def _flush_segment(self):
        """Upload the buffered speech segment to MinIO and enqueue for processing."""
        audio_bytes = bytes(self.buffer)
        self.buffer.clear()
        self.speech_active = False

        ensure_bucket("live-audio")
        object_name = f"{uuid.uuid4()}.wav"
        wav_bytes = pcm_to_wav_bytes(audio_bytes)

        minio_client.put_object(
            "live-audio",
            object_name,
            io.BytesIO(wav_bytes),
            length=len(wav_bytes),
        )

        pool = await get_arq_pool()
        await pool.enqueue_job("process_live_voice", f"live-audio/{object_name}", self.room_id)


@router.websocket("/ws/live/{room_id}")
async def webrtc_signaling(ws: WebSocket, room_id: str):
    """WebRTC signaling endpoint — handles SDP offer/answer exchange.

    The client sends an SDP offer via WebSocket, and the server responds
    with an SDP answer. Audio tracks are processed by LiveAudioProcessor.
    """
    await ws.accept()

    pc = RTCPeerConnection()
    pcs.add(pc)

    @pc.on("track")
    def on_track(track):
        """When the remote peer adds a track, attach our audio processor."""
        if track.kind == "audio":
            pc.addTrack(LiveAudioProcessor(track, room_id))

    @pc.on("connectionstatechange")
    async def on_connection_state_change():
        """Clean up when the peer connection closes or fails."""
        if pc.connectionState in ("failed", "closed", "disconnected"):
            await pc.close()
            pcs.discard(pc)

    try:
        while True:
            msg = await ws.receive_json()
            if msg["type"] == "offer":
                await pc.setRemoteDescription(
                    RTCSessionDescription(sdp=msg["sdp"], type="offer")
                )
                answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                await ws.send_json({"type": "answer", "sdp": pc.localDescription.sdp})
    except WebSocketDisconnect:
        await pc.close()
        pcs.discard(pc)
