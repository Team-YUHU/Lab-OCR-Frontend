'use client';

import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

const CameraCapture = () => {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const [imgSrc, setImgSrc] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [capturing, setCapturing] = useState(false);

  // --- Photo Capture Logic ---
  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
  }, [webcamRef]);

  // --- Video Recording Logic ---
  const handleStartCaptureClick = useCallback(() => {
    setCapturing(true);
    const localChunks = [];

    // Initialize MediaRecorder using the webcam's underlying stream
    const mediaRecorder = new MediaRecorder(webcamRef.current.stream, {
      mimeType: 'video/webm',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        localChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(localChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoSrc(url);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
  }, [webcamRef]);

  const handleStopCaptureClick = useCallback(() => {
    mediaRecorderRef.current.stop();
    setCapturing(false);
  }, []);

  // --- Reset / Retake Logic ---
  const retake = () => {
    setImgSrc(null);
    setVideoSrc(null);
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      {/* View: Captured Photo Preview */}
      {imgSrc && (
        <div>
          <h3>Captured Photo</h3>
          <img src={imgSrc} alt="webcam snapshot" style={{ maxWidth: '100%', borderRadius: '8px' }} />
          <br /><br />
          <button onClick={retake}>Take Another / Retake</button>
        </div>
      )}

      {/* View: Recorded Video Preview */}
      {videoSrc && (
        <div>
          <h3>Recorded Video</h3>
          <video src={videoSrc} controls width={640} height={360} style={{ borderRadius: '8px' }} />
          <br /><br />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <a href={videoSrc} download="recorded-video.webm">
              <button>Download Video</button>
            </a>
            <button onClick={retake}>Take Another / Retake</button>
          </div>
        </div>
      )}

      {/* View: Live Webcam Feed & Controls */}
      {!imgSrc && !videoSrc && (
        <div>
          <Webcam
            audio={false} 
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={640}
            height={360}
            style={{ borderRadius: '8px' }}
          />
          <br /><br />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button onClick={capturePhoto}>Capture Photo</button>

            {capturing ? (
              <button 
                onClick={handleStopCaptureClick} 
                style={{ backgroundColor: '#ff4d4d', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer' }}
              >
                Stop Recording ⏹️
              </button>
            ) : (
              <button onClick={handleStartCaptureClick}>
                Start Recording ⏺️
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
