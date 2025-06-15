import React, { useEffect, useState } from 'react';
import { Camera, Hand } from 'lucide-react';
import { useMediaPipe } from '../hooks/useMediaPipe';

const MediaPipeTracker: React.FC = () => {
  const {
    videoRef,
    canvasRef,
    isInitialized,
    isStreaming,
    detectionResults,
    error,
    startCamera,
    initializeMediaPipe
  } = useMediaPipe();

  const [showPermissionDialog, setShowPermissionDialog] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    initializeMediaPipe();
  }, [initializeMediaPipe]);

  const handleAllowCamera = async () => {
    setShowPermissionDialog(false);
    setHasPermission(true);
    await startCamera();
  };

  const handleDenyCamera = () => {
    setShowPermissionDialog(false);
    setHasPermission(false);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 overflow-hidden">
      {/* 権限確認ダイアログ */}
      {showPermissionDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 max-w-md mx-4 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Hand className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                ハンドトラッキングを開始
              </h2>
              <p className="text-gray-300 leading-relaxed">
                美しいランドマーク表示のために<br />
                カメラへのアクセスを許可してください
              </p>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleDenyCamera}
                className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all duration-200"
              >
                後で
              </button>
              <button
                onClick={handleAllowCamera}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                許可する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl p-4">
            <p className="text-red-100 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* メインビュー */}
      <div className="relative w-full h-full">
        {/* 隠された動画要素 */}
        <video
          ref={videoRef}
          className="absolute opacity-0 pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
        />
        
        {/* フルスクリーンキャンバス */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        
        {/* ローディング・待機状態 */}
        {(!hasPermission || !isStreaming) && !showPermissionDialog && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              {!isInitialized ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 animate-spin">
                    <div className="w-full h-full border-4 border-white/20 border-t-white rounded-full"></div>
                  </div>
                  <p className="text-xl font-medium mb-2">初期化中...</p>
                  <p className="text-gray-300">MediaPipeを読み込んでいます</p>
                </>
              ) : !hasPermission ? (
                <>
                  <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl font-medium mb-2">カメラが必要です</p>
                  <p className="text-gray-300">ページを更新してカメラを許可してください</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 animate-pulse">
                    <Camera className="w-full h-full text-white/50" />
                  </div>
                  <p className="text-xl font-medium mb-2">カメラを起動中...</p>
                  <p className="text-gray-300">手をカメラに向けてください</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* 手が検出されていない時のガイド */}
        {isStreaming && detectionResults.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white/70">
              <Hand className="w-20 h-20 mx-auto mb-4 animate-pulse" />
              <p className="text-2xl font-light">手をカメラに向けてください</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPipeTracker;
