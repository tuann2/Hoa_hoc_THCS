import { applyPwaUpdate, promptInstall, usePwaState } from '../lib/pwa';

export function PwaStatus() {
  const {
    canInstall,
    isIos,
    isOffline,
    isReady,
    isSessionActive,
    needsUpdate
  } = usePwaState();

  return (
    <div className="mb-4 space-y-2 text-sm">
      {isOffline ? (
        <div
          className="rounded-2xl bg-ember/15 px-4 py-3 font-semibold text-ember"
          role="status"
        >
          Đang offline · tiến độ cục bộ vẫn được lưu trên thiết bị.
        </div>
      ) : null}
      {!isReady && !isOffline ? (
        <div
          className="rounded-2xl bg-white/80 px-4 py-3 text-ink/70"
          role="status"
        >
          Đang chuẩn bị học offline…
        </div>
      ) : null}
      {isReady && !isOffline ? (
        <div
          className="rounded-2xl bg-lime/15 px-4 py-3 font-semibold text-lime"
          role="status"
        >
          Đã sẵn sàng học offline.
        </div>
      ) : null}
      {canInstall ? (
        <button
          className="rounded-full bg-sea px-4 py-2 font-semibold text-white"
          onClick={() => void promptInstall()}
          type="button"
        >
          Cài app trên thiết bị
        </button>
      ) : null}
      {isIos && !canInstall ? (
        <p className="rounded-2xl bg-white/80 px-4 py-3 text-ink/70">
          Trên iPhone/iPad: mở nút Chia sẻ rồi chọn “Thêm vào Màn hình chính”.
        </p>
      ) : null}
      {needsUpdate ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-2xl bg-sand px-4 py-3 text-ember"
          role="status"
        >
          {isSessionActive ? (
            <span className="font-semibold">
              Có phiên bản mới. Nút cập nhật sẽ hiện sau khi em kết thúc phiên
              học hoặc bài thi.
            </span>
          ) : (
            <>
              <span className="font-semibold">Có phiên bản mới.</span>
              <button
                className="rounded-full bg-ember px-4 py-2 font-semibold text-white"
                onClick={() => void applyPwaUpdate()}
                type="button"
              >
                Cập nhật khi sẵn sàng
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
