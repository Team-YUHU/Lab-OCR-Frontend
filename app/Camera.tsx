'use client';

import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

const CameraCapture = () => {
  const API_URL = "http://localhost:3000/api/v1/ocr/";

  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
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
      setVideoBlob(blob);

      // const url = URL.createObjectURL(blob);
      setVideoSrc(URL.createObjectURL(blob)); // Save URL for preview

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

  const handleSUbmit = async () => {
    console.log("HandleSubmit called");

    try {
        const formData = new FormData();
        if (imgSrc) {
            const resp = await fetch(imgSrc);
            const blob = await resp.blob();

            formData.append('file', blob, "captured-photo.jpg")
        } else if(videoBlob) {
            formData.append('file', videoBlob, 'recorded-video.webm');
        } else {
            console.log("No file to upload");
            return;
        }        

        const response = await fetch(API_URL, {
          method: 'POST',
          body: formData, 
        });

        if (!response.ok) {
            console.error("Unexpected error: " + response.status);
            return;
        }

        const result = await response.json();

        if (result.success) {
            alert('Upload successful!');
        } else {
            alert('Upload failed: ' + result.error);
        }
    } catch (error) {
        console.error('Upload error:', error);
    } finally {
        setUploading(false);
    }
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      {/* View: Captured Photo Preview */}
      {imgSrc && (
        <div>
          <h3>Captured Photo</h3>
          <img src={imgSrc} alt="webcam snapshot" style={{ maxWidth: '100%', borderRadius: '8px' }} />
          <br /><br />
          <button onClick={retake}>Retake</button>
          <br/>
          <button onClick={handleSUbmit}>Upload</button>
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
              <button onClick={handleSUbmit}>Upload</button>
            </a>
            <button onClick={retake}>Retake</button>
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
