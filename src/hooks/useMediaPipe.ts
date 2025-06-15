import { useRef, useEffect, useState, useCallback } from 'react';
import { Hands, type Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HandDetectionResult {
  landmarks: Landmark[];
  confidence: number;
  handedness: string;
}

export const useMediaPipe = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [detectionResults, setDetectionResults] = useState<HandDetectionResult[]>([]);
  const [error, setError] = useState<string>('');

  // 検出結果の処理
  const onResults = useCallback((results: Results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスサイズを画面全体に設定
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 動画のアスペクト比を計算
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = canvas.width / canvas.height;

    let scaleX, scaleY, offsetX, offsetY;

    // アスペクト比を保ちながら画面にフィット
    if (videoAspect > canvasAspect) {
      // 動画が横長の場合
      scaleY = canvas.height;
      scaleX = canvas.height * videoAspect;
      offsetX = (canvas.width - scaleX) / 2;
      offsetY = 0;
    } else {
      // 動画が縦長の場合
      scaleX = canvas.width;
      scaleY = canvas.width / videoAspect;
      offsetX = 0;
      offsetY = (canvas.height - scaleY) / 2;
    }

    // 背景を暗くする（宇宙空間のような感じ）
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
    );
    gradient.addColorStop(0, 'rgba(30, 20, 60, 0.95)');
    gradient.addColorStop(1, 'rgba(10, 10, 30, 0.98)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 検出された手の情報を更新
    const detectedHands: HandDetectionResult[] = [];

    if (results.multiHandLandmarks && results.multiHandedness) {
      results.multiHandLandmarks.forEach((landmarks, index) => {
        const handedness = results.multiHandedness?.[index];
        const confidence = handedness?.score || 0;
        
        detectedHands.push({
          landmarks: landmarks.map(landmark => ({
            x: landmark.x,
            y: landmark.y,
            z: landmark.z,
            visibility: landmark.visibility
          })),
          confidence,
          handedness: handedness?.label || 'Unknown'
        });
      });
    }

    setDetectionResults(detectedHands);
    drawLandmarks(ctx, detectedHands, scaleX, scaleY, offsetX, offsetY);
  }, []);

    // MediaPipe Handsの初期化
  const initializeMediaPipe = useCallback(async () => {
    try {
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults((results: Results) => {
        onResults(results);
      });

      handsRef.current = hands;
      setIsInitialized(true);
      setError('');
    } catch (err) {
      console.error('MediaPipe initialization error:', err);
      setError('MediaPipeの初期化に失敗しました');
    }
  }, [onResults]);

  // ランドマークの描画
  const drawLandmarks = (
    ctx: CanvasRenderingContext2D, 
    hands: HandDetectionResult[], 
    scaleX: number,
    scaleY: number,
    offsetX: number,
    offsetY: number
  ) => {
    // 手の接続線
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // 親指
      [0, 5], [5, 6], [6, 7], [7, 8], // 人差し指
      [5, 9], [9, 10], [10, 11], [11, 12], // 中指
      [9, 13], [13, 14], [14, 15], [15, 16], // 薬指
      [13, 17], [17, 18], [18, 19], [19, 20], // 小指
      [0, 17] // 手首から小指の付け根
    ];

    hands.forEach((hand, handIndex) => {
      const time = Date.now() * 0.001;
      const baseHue = (handIndex * 120 + time * 30) % 360;
      
      // 接続線を描画
      ctx.strokeStyle = `hsla(${baseHue}, 80%, 70%, 0.9)`;
      ctx.lineWidth = Math.max(3, scaleX / 200);
      ctx.shadowColor = `hsla(${baseHue}, 80%, 70%, 0.6)`;
      ctx.shadowBlur = Math.max(8, scaleX / 100);
      
      ctx.beginPath();
      connections.forEach(([start, end]) => {
        if (hand.landmarks[start] && hand.landmarks[end]) {
          const x1 = hand.landmarks[start].x * scaleX + offsetX;
          const y1 = hand.landmarks[start].y * scaleY + offsetY;
          const x2 = hand.landmarks[end].x * scaleX + offsetX;
          const y2 = hand.landmarks[end].y * scaleY + offsetY;
          
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
      });
      ctx.stroke();

      // ランドマークの円を描画
      hand.landmarks.forEach((landmark, index) => {
        const x = landmark.x * scaleX + offsetX;
        const y = landmark.y * scaleY + offsetY;
        const visibility = landmark.visibility || 1;
        
        // 画面サイズに応じたランドマークサイズ
        const baseRadius = Math.max(8, Math.min(scaleX, scaleY) / 40);
        const radius = baseRadius * (1 + landmark.z * 1.5) * visibility;
        
        // 時間とインデックスで色を変化
        const hue = (baseHue + index * 15 + time * 20) % 360;
        
        // グラデーション作成
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
        gradient.addColorStop(0, `hsla(${hue}, 90%, 90%, ${visibility})`);
        gradient.addColorStop(0.7, `hsla(${hue}, 85%, 75%, ${visibility * 0.8})`);
        gradient.addColorStop(1, `hsla(${hue}, 80%, 50%, ${visibility * 0.2})`);
        
        // 光る効果
        ctx.shadowColor = `hsla(${hue}, 90%, 70%, 0.8)`;
        ctx.shadowBlur = radius;
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // 番号表示（大きな画面でのみ）
        if (radius > 10) {
          ctx.fillStyle = `rgba(255, 255, 255, ${visibility * 0.9})`;
          ctx.font = `bold ${Math.max(12, radius / 2)}px system-ui, sans-serif`;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 4;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(index.toString(), x, y);
        }
      });
      
      // 影をリセット
      ctx.shadowBlur = 0;
    });
  };

  // カメラ開始
  const startCamera = useCallback(async () => {
    if (!handsRef.current || !videoRef.current) {
      await initializeMediaPipe();
      return;
    }

    try {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720
      });

      await camera.start();
      cameraRef.current = camera;
      setIsStreaming(true);
      setError('');
    } catch (err) {
      console.error('Camera start error:', err);
      setError('カメラの開始に失敗しました');
    }
  }, [initializeMediaPipe]);

  // カメラ停止
  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    setIsStreaming(false);
    setDetectionResults([]);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isInitialized,
    isStreaming,
    detectionResults,
    error,
    startCamera,
    stopCamera,
    initializeMediaPipe
  };
};
