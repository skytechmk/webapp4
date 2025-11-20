import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Camera, RefreshCw, Zap, RotateCcw, Video, Square } from 'lucide-react';
import { TranslateFn } from '../types';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
  t: TranslateFn;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose, t }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [flash, setFlash] = useState(false);
  const [usingFrontCamera, setUsingFrontCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);

  const startCamera = useCallback(async (useFrontCamera = false) => {
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: { 
          facingMode: useFrontCamera ? 'user' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setUsingFrontCamera(useFrontCamera);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // iOS Safari optimization
        videoRef.current.playsInline = true;
        videoRef.current.setAttribute('playsinline', 'true');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError(t('cameraError'));
    }
  }, [t, stream]);

  const switchCamera = () => {
    startCamera(!usingFrontCamera);
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takePhoto = () => {
    if (isRecording) return; // Don't take photo while recording
    
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL('image/jpeg', 0.85);
        
        // Stop stream before capturing to free resources
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        onCapture(imageSrc);
      }
    }
  };

  const startRecording = async () => {
    if (!stream || isRecording) return;
    
    try {
      // Add audio to stream for recording
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const combinedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);

      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        onCapture(videoUrl);
        
        // Clean up audio tracks
        audioStream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start recording timer
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingTimer(timer);
      
    } catch (err) {
      console.error('Recording error:', err);
      // Fallback to video without audio
      startVideoRecordingWithoutAudio();
    }
  };

  const startVideoRecordingWithoutAudio = () => {
    if (!stream || isRecording) return;
    
    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      onCapture(videoUrl);
    };
    
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    
    // Start recording timer
    const timer = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    setRecordingTimer(timer);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
      setRecordingTime(0);
    }
  };

  // Long press detection
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleCapturePressStart = () => {
    const timer = setTimeout(() => {
      startRecording();
    }, 500); // 500ms long press to start recording
    setLongPressTimer(timer);
  };

  const handleCapturePressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (isRecording) {
      stopRecording();
    } else {
      takePhoto();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
         <div className="text-white font-medium">
           {isRecording ? (
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
               <span>Recording {formatTime(recordingTime)}</span>
             </div>
           ) : (
             t('takePhoto')
           )}
         </div>
         <button onClick={onClose} className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white">
           <X size={24} />
         </button>
      </div>

      {/* Flash Overlay */}
      <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 z-10 ${flash ? 'opacity-80' : 'opacity-0'}`} />

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-16 left-0 right-0 flex justify-center z-20">
          <div className="bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">Recording {formatTime(recordingTime)}</span>
          </div>
        </div>
      )}

      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-gray-900">
        {error ? (
          <div className="text-white text-center p-6">
            <p className="mb-4">{error}</p>
            <button onClick={startCamera} className="px-4 py-2 bg-indigo-600 rounded-lg">{t('retry')}</button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-32 bg-black/80 backdrop-blur-md flex items-center justify-around px-8 pb-safe z-30">
        {/* Camera Rotation Button */}
        <button 
          onClick={switchCamera}
          className="p-4 rounded-full text-white/50 hover:text-white transition-colors"
          title={t('switchCamera')}
        >
          <RotateCcw size={24} />
        </button>
        
        {/* Capture Button */}
        <button 
          onMouseDown={handleCapturePressStart}
          onMouseUp={handleCapturePressEnd}
          onTouchStart={handleCapturePressStart}
          onTouchEnd={handleCapturePressEnd}
          className={`w-20 h-20 rounded-full border-4 flex items-center justify-center mb-4 relative group active:scale-95 transition-transform ${
            isRecording 
              ? 'border-red-500 bg-red-500/20' 
              : 'border-white'
          }`}
        >
          <div className={`w-16 h-16 rounded-full group-active:scale-90 transition-transform ${
            isRecording 
              ? 'bg-red-500' 
              : 'bg-white'
          }`} />
        </button>

        {/* Video Recording Indicator */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white text-xs text-center">
          {isRecording ? 'Release to stop recording' : 'Tap for photo • Hold for video'}
        </div>

        {/* Refresh Camera Button */}
        <button onClick={() => startCamera(usingFrontCamera)} className="p-4 rounded-full text-white/50 hover:text-white transition-colors">
          <RefreshCw size={24} />
        </button>
      </div>
    </div>
  );
};

// Helper function to format time
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
