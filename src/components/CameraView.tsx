import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface CameraViewHandle {
  takeSnapshot: () => string | null;
  startRecording: () => void;
  stopRecording: () => Promise<string | null>;
}

const CameraView = forwardRef<CameraViewHandle, { isRecording: boolean }>((props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera/microphone:", err);
      }
    }
    setupCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    // 1. FIX: Image Compression (Payload Size)
    takeSnapshot: () => {
      if (!videoRef.current) return null;
      const canvas = document.createElement('canvas');
      // Set fixed resolution to 640x480 to keep image size small
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        // Lower quality to 0.7 (70%) for faster upload
        return canvas.toDataURL('image/jpeg', 0.7); 
      }
      return null;
    },

    // 2. FIX: MediaRecorder Compatibility (Cross-browser support)
    startRecording: () => {
      if (!videoRef.current?.srcObject) return;
      const stream = videoRef.current.srcObject as MediaStream;
      
      // Create a list of types to try (WebM for Chrome/FF, MP4 for Safari)
      const mimeTypes = ['video/webm;codecs=vp8,opus', 'video/mp4', 'audio/webm', 'audio/mp4'];
      const selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

      try {
        mediaRecorderRef.current = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : undefined);
        chunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mediaRecorderRef.current.start();
      } catch (err) {
        console.error("Error starting MediaRecorder:", err);
      }
    },

    stopRecording: () => {
      return new Promise((resolve) => {
        if (!mediaRecorderRef.current) {
          resolve(null);
          return;
        }
        mediaRecorderRef.current.onstop = async () => {
          // Use the actual MIME type of the recorded blob
          const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(blob);
        };
        mediaRecorderRef.current.stop();
      });
    }
  }));

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-zinc-800">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      {props.isRecording && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/80 px-3 py-1 rounded-full animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Recording</span>
        </div>
      )}
    </div>
  );
});

export default CameraView;